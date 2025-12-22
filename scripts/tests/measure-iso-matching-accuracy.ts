#!/usr/bin/env tsx
/**
 * ISO 매칭 정확도 측정 스크립트
 * 
 * 사용법:
 *   tsx scripts/tests/measure-iso-matching-accuracy.ts
 * 
 * 이 스크립트는:
 * 1. 테스트 케이스 파일을 읽어서 ICF 코드 기반 ISO 매칭 정확도 측정
 * 2. 하이브리드 매칭 시스템의 정확도 평가
 * 3. 결과를 JSON 파일로 저장
 * 4. 상세 리포트 생성
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getIsoMatches } from "@/core/matching/iso-mapping";
import { appendKeywordIsoMatches } from "@/core/matching/keyword-inference";
import { inferIsoFromGraph } from "@/core/matching/knowledge-graph";
import { hybridMatch } from "@/core/matching/hybrid-matcher";
import type { IsoMatch } from "@/core/matching/iso-mapping";

interface TestCase {
  id: string;
  category: string;
  userInput: string;
  expectedIcf: {
    b: string[];
    d: string[];
    e: string[];
  };
  expectedIso: string[];
  description: string;
}

interface TestResult {
  testCaseId: string;
  category: string;
  userInput: string;
  expectedIso: string[];
  actualIso: string[];
  isoAccuracy: {
    precision: number;
    recall: number;
    f1: number;
    top1Accuracy: boolean;
    top3Accuracy: boolean;
    top5Accuracy: boolean;
  };
  passed: boolean;
  errors?: string[];
  matchingDetails: {
    ruleBased: IsoMatch[];
    keywordBased: IsoMatch[];
    graphBased: IsoMatch[];
    hybrid: IsoMatch[];
  };
}

interface MeasurementResult {
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  overallAccuracy: {
    precision: number;
    recall: number;
    f1: number;
    top1Accuracy: number;
    top3Accuracy: number;
    top5Accuracy: number;
  };
  categoryBreakdown: Record<string, {
    count: number;
    accuracy: {
      precision: number;
      recall: number;
      f1: number;
      top1Accuracy: number;
      top3Accuracy: number;
      top5Accuracy: number;
    };
  }>;
  matchingMethodComparison: {
    ruleBased: { precision: number; recall: number; f1: number };
    keywordBased: { precision: number; recall: number; f1: number };
    graphBased: { precision: number; recall: number; f1: number };
    hybrid: { precision: number; recall: number; f1: number };
  };
  testResults: TestResult[];
}

/**
 * 정밀도(Precision) 계산
 */
function calculatePrecision(actual: string[], expected: string[]): number {
  if (actual.length === 0) return 0;
  const correct = actual.filter((code) => expected.includes(code)).length;
  return correct / actual.length;
}

/**
 * 재현율(Recall) 계산
 */
function calculateRecall(actual: string[], expected: string[]): number {
  if (expected.length === 0) return 1;
  const correct = actual.filter((code) => expected.includes(code)).length;
  return correct / expected.length;
}

/**
 * F1 점수 계산
 */
function calculateF1(precision: number, recall: number): number {
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

/**
 * ISO 매칭 정확도 계산
 */
function calculateIsoAccuracy(
  actualIso: string[],
  expectedIso: string[]
): TestResult["isoAccuracy"] {
  const precision = calculatePrecision(actualIso, expectedIso);
  const recall = calculateRecall(actualIso, expectedIso);
  const f1 = calculateF1(precision, recall);

  // Top-K 정확도 계산
  const top1Accuracy = actualIso.length > 0 && expectedIso.includes(actualIso[0]);
  const top3Accuracy =
    actualIso.length > 0 &&
    actualIso.slice(0, 3).some((code) => expectedIso.includes(code));
  const top5Accuracy =
    actualIso.length > 0 &&
    actualIso.slice(0, 5).some((code) => expectedIso.includes(code));

  return {
    precision,
    recall,
    f1,
    top1Accuracy,
    top3Accuracy,
    top5Accuracy,
  };
}

/**
 * 단일 테스트 케이스 실행
 */
async function runTestCase(testCase: TestCase): Promise<TestResult> {
  console.log(`\n[${testCase.id}] ${testCase.category}: ${testCase.userInput}`);

  try {
    // ICF 코드 수집
    const allIcfCodes = [
      ...testCase.expectedIcf.b,
      ...testCase.expectedIcf.d,
      ...testCase.expectedIcf.e,
    ];

    // 1. 규칙 기반 매칭
    const ruleBasedMatches = getIsoMatches(allIcfCodes);
    const ruleBasedIso = ruleBasedMatches.map((m) => m.isoCode);

    // 2. 키워드 기반 매칭
    const keywordBasedMatches = appendKeywordIsoMatches({
      text: testCase.userInput,
      icfCodes: allIcfCodes,
      matches: ruleBasedMatches,
    });
    const keywordBasedIso = keywordBasedMatches.map((m) => m.isoCode);

    // 3. 지식 그래프 기반 매칭
    const graphBasedMatches = inferIsoFromGraph(allIcfCodes);
    const graphBasedIso = graphBasedMatches.map((m) => m.isoCode);

    // 4. 하이브리드 매칭
    const hybridMatches = await hybridMatch({
      icfCodes: allIcfCodes,
      userMessage: testCase.userInput,
      analysisSummary: testCase.userInput,
    });
    const hybridIso = hybridMatches.map((m) => m.isoCode);

    // 5. 정확도 계산 (하이브리드 매칭 결과 사용)
    const isoAccuracy = calculateIsoAccuracy(hybridIso, testCase.expectedIso);

    // 6. 통과 여부 판정 (F1 점수 0.7 이상 또는 Top-3 정확도)
    const passed = isoAccuracy.f1 >= 0.7 || isoAccuracy.top3Accuracy;

    // 7. 오류 수집
    const errors: string[] = [];
    if (isoAccuracy.f1 < 0.7 && !isoAccuracy.top3Accuracy) {
      errors.push(`F1 점수 부족: ${isoAccuracy.f1.toFixed(3)} (목표: 0.7)`);
    }

    const missingIso = testCase.expectedIso.filter((code) => !hybridIso.includes(code));
    if (missingIso.length > 0) {
      errors.push(`누락된 ISO 코드: ${missingIso.join(", ")}`);
    }

    const extraIso = hybridIso.filter((code) => !testCase.expectedIso.includes(code));
    if (extraIso.length > 0 && extraIso.length > testCase.expectedIso.length) {
      errors.push(`과도한 ISO 코드: ${extraIso.slice(0, 3).join(", ")}...`);
    }

    return {
      testCaseId: testCase.id,
      category: testCase.category,
      userInput: testCase.userInput,
      expectedIso: testCase.expectedIso,
      actualIso: hybridIso,
      isoAccuracy,
      passed,
      errors: errors.length > 0 ? errors : undefined,
      matchingDetails: {
        ruleBased: ruleBasedMatches,
        keywordBased: keywordBasedMatches,
        graphBased: graphBasedMatches,
        hybrid: hybridMatches,
      },
    };
  } catch (error) {
    console.error(`  ❌ 오류 발생:`, error);
    return {
      testCaseId: testCase.id,
      category: testCase.category,
      userInput: testCase.userInput,
      expectedIso: testCase.expectedIso,
      actualIso: [],
      isoAccuracy: {
        precision: 0,
        recall: 0,
        f1: 0,
        top1Accuracy: false,
        top3Accuracy: false,
        top5Accuracy: false,
      },
      passed: false,
      errors: [`실행 오류: ${error instanceof Error ? error.message : String(error)}`],
      matchingDetails: {
        ruleBased: [],
        keywordBased: [],
        graphBased: [],
        hybrid: [],
      },
    };
  }
}

/**
 * 매칭 방법별 정확도 계산
 */
function calculateMethodAccuracy(
  testResults: TestResult[],
  method: "ruleBased" | "keywordBased" | "graphBased" | "hybrid"
): { precision: number; recall: number; f1: number } {
  let totalPrecision = 0;
  let totalRecall = 0;

  testResults.forEach((result) => {
    const methodIso = result.matchingDetails[method].map((m) => m.isoCode);
    const precision = calculatePrecision(methodIso, result.expectedIso);
    const recall = calculateRecall(methodIso, result.expectedIso);

    totalPrecision += precision;
    totalRecall += recall;
  });

  const avgPrecision = totalPrecision / testResults.length;
  const avgRecall = totalRecall / testResults.length;
  const f1 = calculateF1(avgPrecision, avgRecall);

  return { precision: avgPrecision, recall: avgRecall, f1 };
}

/**
 * 전체 측정 실행
 */
async function runMeasurement(): Promise<MeasurementResult> {
  console.log("🚀 ISO 매칭 정확도 측정 시작");
  console.log("=".repeat(60));

  // 1. 테스트 케이스 로드
  const testCasesPath = join(process.cwd(), "scripts/tests/ai-quality-test-cases.json");
  const testCasesData = JSON.parse(readFileSync(testCasesPath, "utf-8"));
  const testCases: TestCase[] = testCasesData.testCases;

  console.log(`📋 총 ${testCases.length}개의 테스트 케이스 로드 완료`);

  // 2. 각 테스트 케이스 실행
  const testResults: TestResult[] = [];
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n[${i + 1}/${testCases.length}] 진행 중...`);
    const result = await runTestCase(testCase);
    testResults.push(result);

    // 결과 출력
    if (result.passed) {
      console.log(`  ✅ 통과 (F1: ${result.isoAccuracy.f1.toFixed(3)}, Top-3: ${result.isoAccuracy.top3Accuracy ? "✓" : "✗"})`);
    } else {
      console.log(`  ❌ 실패 (F1: ${result.isoAccuracy.f1.toFixed(3)})`);
      if (result.errors) {
        result.errors.forEach((err) => console.log(`    - ${err}`));
      }
    }
  }

  // 3. 전체 통계 계산
  const passedTests = testResults.filter((r) => r.passed).length;
  const failedTests = testResults.filter((r) => !r.passed).length;

  // 전체 정확도 계산
  const overallPrecision =
    testResults.reduce((sum, r) => sum + r.isoAccuracy.precision, 0) / testResults.length;
  const overallRecall =
    testResults.reduce((sum, r) => sum + r.isoAccuracy.recall, 0) / testResults.length;
  const overallF1 = calculateF1(overallPrecision, overallRecall);
  const top1Accuracy =
    testResults.filter((r) => r.isoAccuracy.top1Accuracy).length / testResults.length;
  const top3Accuracy =
    testResults.filter((r) => r.isoAccuracy.top3Accuracy).length / testResults.length;
  const top5Accuracy =
    testResults.filter((r) => r.isoAccuracy.top5Accuracy).length / testResults.length;

  // 카테고리별 통계
  const categoryBreakdown: Record<string, {
    count: number;
    accuracy: {
      precision: number;
      recall: number;
      f1: number;
      top1Accuracy: number;
      top3Accuracy: number;
      top5Accuracy: number;
    };
  }> = {};
  const categoryGroups: Record<string, TestResult[]> = {};

  testResults.forEach((result) => {
    if (!categoryGroups[result.category]) {
      categoryGroups[result.category] = [];
    }
    categoryGroups[result.category].push(result);
  });

  Object.entries(categoryGroups).forEach(([category, results]) => {
    const avgPrecision = results.reduce((sum, r) => sum + r.isoAccuracy.precision, 0) / results.length;
    const avgRecall = results.reduce((sum, r) => sum + r.isoAccuracy.recall, 0) / results.length;
    const avgF1 = calculateF1(avgPrecision, avgRecall);
    const top1 = results.filter((r) => r.isoAccuracy.top1Accuracy).length / results.length;
    const top3 = results.filter((r) => r.isoAccuracy.top3Accuracy).length / results.length;
    const top5 = results.filter((r) => r.isoAccuracy.top5Accuracy).length / results.length;

    categoryBreakdown[category] = {
      count: results.length,
      accuracy: {
        precision: avgPrecision,
        recall: avgRecall,
        f1: avgF1,
        top1Accuracy: top1,
        top3Accuracy: top3,
        top5Accuracy: top5,
      },
    };
  });

  // 매칭 방법별 비교
  const matchingMethodComparison = {
    ruleBased: calculateMethodAccuracy(testResults, "ruleBased"),
    keywordBased: calculateMethodAccuracy(testResults, "keywordBased"),
    graphBased: calculateMethodAccuracy(testResults, "graphBased"),
    hybrid: calculateMethodAccuracy(testResults, "hybrid"),
  };

  const measurementResult: MeasurementResult = {
    timestamp: new Date().toISOString(),
    totalTests: testResults.length,
    passedTests,
    failedTests,
    overallAccuracy: {
      precision: overallPrecision,
      recall: overallRecall,
      f1: overallF1,
      top1Accuracy,
      top3Accuracy,
      top5Accuracy,
    },
    categoryBreakdown,
    matchingMethodComparison,
    testResults,
  };

  return measurementResult;
}

/**
 * 결과 리포트 출력
 */
function printReport(result: MeasurementResult) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 ISO 매칭 정확도 측정 결과");
  console.log("=".repeat(60));

  console.log(`\n📈 전체 통계:`);
  console.log(`  총 테스트: ${result.totalTests}`);
  console.log(`  ✅ 통과: ${result.passedTests} (${((result.passedTests / result.totalTests) * 100).toFixed(1)}%)`);
  console.log(`  ❌ 실패: ${result.failedTests} (${((result.failedTests / result.totalTests) * 100).toFixed(1)}%)`);
  console.log(`\n  전체 정확도:`);
  console.log(`    Precision: ${(result.overallAccuracy.precision * 100).toFixed(1)}%`);
  console.log(`    Recall: ${(result.overallAccuracy.recall * 100).toFixed(1)}%`);
  console.log(`    F1 Score: ${(result.overallAccuracy.f1 * 100).toFixed(1)}%`);
  console.log(`    Top-1 정확도: ${(result.overallAccuracy.top1Accuracy * 100).toFixed(1)}%`);
  console.log(`    Top-3 정확도: ${(result.overallAccuracy.top3Accuracy * 100).toFixed(1)}%`);
  console.log(`    Top-5 정확도: ${(result.overallAccuracy.top5Accuracy * 100).toFixed(1)}%`);

  console.log(`\n📋 카테고리별 통계:`);
  Object.entries(result.categoryBreakdown).forEach(([category, stats]) => {
    console.log(`  ${category}:`);
    console.log(`    테스트 수: ${stats.count}`);
    console.log(`    Precision: ${(stats.accuracy.precision * 100).toFixed(1)}%`);
    console.log(`    Recall: ${(stats.accuracy.recall * 100).toFixed(1)}%`);
    console.log(`    F1 Score: ${(stats.accuracy.f1 * 100).toFixed(1)}%`);
    console.log(`    Top-3 정확도: ${(stats.accuracy.top3Accuracy * 100).toFixed(1)}%`);
  });

  console.log(`\n🔍 매칭 방법별 비교:`);
  Object.entries(result.matchingMethodComparison).forEach(([method, accuracy]) => {
    console.log(`  ${method}:`);
    console.log(`    Precision: ${(accuracy.precision * 100).toFixed(1)}%`);
    console.log(`    Recall: ${(accuracy.recall * 100).toFixed(1)}%`);
    console.log(`    F1 Score: ${(accuracy.f1 * 100).toFixed(1)}%`);
  });

  if (result.failedTests > 0) {
    console.log(`\n❌ 실패한 테스트:`);
    result.testResults
      .filter((r) => !r.passed)
      .slice(0, 10) // 최대 10개만 표시
      .forEach((r) => {
        console.log(`  [${r.testCaseId}] ${r.category}: ${r.userInput}`);
        console.log(`    예상: ${r.expectedIso.join(", ")}`);
        console.log(`    실제: ${r.actualIso.slice(0, 5).join(", ")}`);
        console.log(`    F1: ${r.isoAccuracy.f1.toFixed(3)}`);
        if (r.errors) {
          r.errors.forEach((err) => console.log(`    - ${err}`));
        }
      });
  }

  console.log("\n" + "=".repeat(60));
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    const result = await runMeasurement();
    printReport(result);

    // 결과를 JSON 파일로 저장
    const outputPath = join(
      process.cwd(),
      `scripts/tests/results/iso-matching-accuracy-${Date.now()}.json`
    );
    writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`\n💾 결과 저장: ${outputPath}`);

    // 최신 결과를 latest.json으로도 저장
    const latestPath = join(process.cwd(), "scripts/tests/results/iso-matching-accuracy-latest.json");
    writeFileSync(latestPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`💾 최신 결과 저장: ${latestPath}`);

    // 종료 코드 (실패율이 30% 이상이면 1)
    const failureRate = result.failedTests / result.totalTests;
    process.exit(failureRate > 0.3 ? 1 : 0);
  } catch (error) {
    console.error("\n❌ 측정 실행 중 오류 발생:");
    console.error(error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

