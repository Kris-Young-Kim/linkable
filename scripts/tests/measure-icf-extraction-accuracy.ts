#!/usr/bin/env tsx
/**
 * ICF 코드 추출 정확도 측정 스크립트
 * 
 * 사용법:
 *   tsx scripts/tests/measure-icf-extraction-accuracy.ts
 * 
 * 이 스크립트는:
 * 1. 테스트 케이스 파일을 읽어서 실제 Gemini API를 호출
 * 2. ICF 코드 추출 정확도를 측정
 * 3. 결과를 JSON 파일로 저장
 * 4. 상세 리포트 생성
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { callGemini } from "@/lib/gemini";
import { parseAnalysis } from "@/core/assessment/parser";
import { buildPrompt } from "@/core/assessment/prompt-engineering";
import { enforceIcfConsistency } from "@/core/assessment/icf-validator";

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
  expectedIcf: TestCase["expectedIcf"];
  actualIcf: {
    b: string[];
    d: string[];
    e: string[];
  };
  icfAccuracy: {
    b: { precision: number; recall: number; f1: number };
    d: { precision: number; recall: number; f1: number };
    e: { precision: number; recall: number; f1: number };
    overall: { precision: number; recall: number; f1: number };
  };
  passed: boolean;
  errors?: string[];
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
  };
  categoryBreakdown: Record<string, {
    count: number;
    accuracy: { precision: number; recall: number; f1: number };
  }>;
  testResults: TestResult[];
}

/**
 * 정밀도(Precision) 계산: 추출된 코드 중 실제로 맞는 코드의 비율
 */
function calculatePrecision(actual: string[], expected: string[]): number {
  if (actual.length === 0) return 0;
  const correct = actual.filter((code) => expected.includes(code.toLowerCase())).length;
  return correct / actual.length;
}

/**
 * 재현율(Recall) 계산: 예상 코드 중 실제로 추출된 코드의 비율
 */
function calculateRecall(actual: string[], expected: string[]): number {
  if (expected.length === 0) return 1;
  const correct = actual.filter((code) => expected.includes(code.toLowerCase())).length;
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
 * ICF 코드 정확도 계산
 */
function calculateIcfAccuracy(
  actual: { b: string[]; d: string[]; e: string[] },
  expected: { b: string[]; d: string[]; e: string[] }
): TestResult["icfAccuracy"] {
  const categories = ["b", "d", "e"] as const;
  const categoryMetrics: Record<string, { precision: number; recall: number; f1: number }> = {};

  for (const category of categories) {
    const actualCodes = actual[category].map((c) => c.toLowerCase());
    const expectedCodes = expected[category].map((c) => c.toLowerCase());
    const precision = calculatePrecision(actualCodes, expectedCodes);
    const recall = calculateRecall(actualCodes, expectedCodes);
    const f1 = calculateF1(precision, recall);
    categoryMetrics[category] = { precision, recall, f1 };
  }

  // 전체 정확도 계산
  const allActual = [...actual.b, ...actual.d, ...actual.e].map((c) => c.toLowerCase());
  const allExpected = [...expected.b, ...expected.d, ...expected.e].map((c) => c.toLowerCase());
  const overallPrecision = calculatePrecision(allActual, allExpected);
  const overallRecall = calculateRecall(allActual, allExpected);
  const overallF1 = calculateF1(overallPrecision, overallRecall);

  return {
    ...categoryMetrics,
    overall: {
      precision: overallPrecision,
      recall: overallRecall,
      f1: overallF1,
    },
  };
}

/**
 * 단일 테스트 케이스 실행
 */
async function runTestCase(testCase: TestCase): Promise<TestResult> {
  console.log(`\n[${testCase.id}] ${testCase.category}: ${testCase.userInput}`);

  try {
    // 1. Gemini API 호출
    const prompt = buildPrompt({
      history: [],
      latestUserMessage: testCase.userInput,
      persona: undefined,
      mediaDescription: undefined,
      evaluationContext: undefined,
    });

    const response = await callGemini(prompt);
    const rawText = response.rawText || "";

    // 2. 응답 파싱
    let parsedAnalysis;
    try {
      parsedAnalysis = parseAnalysis(response.json);
    } catch (parseError) {
      // JSON 파싱 실패 시 텍스트에서 추출 시도
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          parsedAnalysis = parseAnalysis(parsed);
        } catch (e) {
          throw new Error(`JSON 파싱 실패: ${e}`);
        }
      } else {
        throw new Error("JSON 응답을 찾을 수 없음");
      }
    }

    // 3. ICF Validator 적용
    const validated = enforceIcfConsistency(testCase.userInput, parsedAnalysis);
    const finalAnalysis = validated.analysis || parsedAnalysis;

    // 4. 정확도 계산
    const actualIcf = {
      b: finalAnalysis.icf_analysis.b.map((c) => c.toLowerCase()),
      d: finalAnalysis.icf_analysis.d.map((c) => c.toLowerCase()),
      e: finalAnalysis.icf_analysis.e.map((c) => c.toLowerCase()),
    };

    const expectedIcf = {
      b: testCase.expectedIcf.b.map((c) => c.toLowerCase()),
      d: testCase.expectedIcf.d.map((c) => c.toLowerCase()),
      e: testCase.expectedIcf.e.map((c) => c.toLowerCase()),
    };

    const icfAccuracy = calculateIcfAccuracy(actualIcf, expectedIcf);

    // 5. 통과 여부 판정 (F1 점수 0.7 이상)
    const passed = icfAccuracy.overall.f1 >= 0.7;

    // 6. 오류 수집
    const errors: string[] = [];
    if (icfAccuracy.overall.f1 < 0.7) {
      errors.push(`F1 점수 부족: ${icfAccuracy.overall.f1.toFixed(3)} (목표: 0.7)`);
    }

    const missingCodes: string[] = [];
    for (const category of ["b", "d", "e"] as const) {
      const missing = expectedIcf[category].filter(
        (code) => !actualIcf[category].includes(code)
      );
      if (missing.length > 0) {
        missingCodes.push(...missing.map((c) => `${category}.${c}`));
      }
    }
    if (missingCodes.length > 0) {
      errors.push(`누락된 코드: ${missingCodes.join(", ")}`);
    }

    const extraCodes: string[] = [];
    for (const category of ["b", "d", "e"] as const) {
      const extra = actualIcf[category].filter(
        (code) => !expectedIcf[category].includes(code)
      );
      if (extra.length > 0) {
        extraCodes.push(...extra.map((c) => `${category}.${c}`));
      }
    }
    if (extraCodes.length > 0) {
      errors.push(`추가된 코드: ${extraCodes.join(", ")}`);
    }

    return {
      testCaseId: testCase.id,
      category: testCase.category,
      userInput: testCase.userInput,
      expectedIcf: testCase.expectedIcf,
      actualIcf: {
        b: finalAnalysis.icf_analysis.b,
        d: finalAnalysis.icf_analysis.d,
        e: finalAnalysis.icf_analysis.e,
      },
      icfAccuracy,
      passed,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error(`  ❌ 오류 발생:`, error);
    return {
      testCaseId: testCase.id,
      category: testCase.category,
      userInput: testCase.userInput,
      expectedIcf: testCase.expectedIcf,
      actualIcf: { b: [], d: [], e: [] },
      icfAccuracy: {
        b: { precision: 0, recall: 0, f1: 0 },
        d: { precision: 0, recall: 0, f1: 0 },
        e: { precision: 0, recall: 0, f1: 0 },
        overall: { precision: 0, recall: 0, f1: 0 },
      },
      passed: false,
      errors: [`실행 오류: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * 전체 측정 실행
 */
async function runMeasurement(): Promise<MeasurementResult> {
  console.log("🚀 ICF 코드 추출 정확도 측정 시작");
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
      console.log(`  ✅ 통과 (F1: ${result.icfAccuracy.overall.f1.toFixed(3)})`);
    } else {
      console.log(`  ❌ 실패 (F1: ${result.icfAccuracy.overall.f1.toFixed(3)})`);
      if (result.errors) {
        result.errors.forEach((err) => console.log(`    - ${err}`));
      }
    }

    // API 호출 간 딜레이 (Rate limiting 방지)
    if (i < testCases.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // 3. 전체 통계 계산
  const passedTests = testResults.filter((r) => r.passed).length;
  const failedTests = testResults.filter((r) => !r.passed).length;

  // 전체 정확도 계산 (모든 테스트의 평균)
  const overallPrecision =
    testResults.reduce((sum, r) => sum + r.icfAccuracy.overall.precision, 0) /
    testResults.length;
  const overallRecall =
    testResults.reduce((sum, r) => sum + r.icfAccuracy.overall.recall, 0) / testResults.length;
  const overallF1 = calculateF1(overallPrecision, overallRecall);

  // 카테고리별 통계
  const categoryBreakdown: Record<string, { count: number; accuracy: { precision: number; recall: number; f1: number } }> = {};
  const categoryGroups: Record<string, TestResult[]> = {};

  testResults.forEach((result) => {
    if (!categoryGroups[result.category]) {
      categoryGroups[result.category] = [];
    }
    categoryGroups[result.category].push(result);
  });

  Object.entries(categoryGroups).forEach(([category, results]) => {
    const avgPrecision = results.reduce((sum, r) => sum + r.icfAccuracy.overall.precision, 0) / results.length;
    const avgRecall = results.reduce((sum, r) => sum + r.icfAccuracy.overall.recall, 0) / results.length;
    const avgF1 = calculateF1(avgPrecision, avgRecall);

    categoryBreakdown[category] = {
      count: results.length,
      accuracy: {
        precision: avgPrecision,
        recall: avgRecall,
        f1: avgF1,
      },
    };
  });

  const measurementResult: MeasurementResult = {
    timestamp: new Date().toISOString(),
    totalTests: testResults.length,
    passedTests,
    failedTests,
    overallAccuracy: {
      precision: overallPrecision,
      recall: overallRecall,
      f1: overallF1,
    },
    categoryBreakdown,
    testResults,
  };

  return measurementResult;
}

/**
 * 결과 리포트 출력
 */
function printReport(result: MeasurementResult) {
  console.log("\n" + "=".repeat(60));
  console.log("📊 ICF 코드 추출 정확도 측정 결과");
  console.log("=".repeat(60));

  console.log(`\n📈 전체 통계:`);
  console.log(`  총 테스트: ${result.totalTests}`);
  console.log(`  ✅ 통과: ${result.passedTests} (${((result.passedTests / result.totalTests) * 100).toFixed(1)}%)`);
  console.log(`  ❌ 실패: ${result.failedTests} (${((result.failedTests / result.totalTests) * 100).toFixed(1)}%)`);
  console.log(`\n  전체 정확도:`);
  console.log(`    Precision: ${(result.overallAccuracy.precision * 100).toFixed(1)}%`);
  console.log(`    Recall: ${(result.overallAccuracy.recall * 100).toFixed(1)}%`);
  console.log(`    F1 Score: ${(result.overallAccuracy.f1 * 100).toFixed(1)}%`);

  console.log(`\n📋 카테고리별 통계:`);
  Object.entries(result.categoryBreakdown).forEach(([category, stats]) => {
    console.log(`  ${category}:`);
    console.log(`    테스트 수: ${stats.count}`);
    console.log(`    Precision: ${(stats.accuracy.precision * 100).toFixed(1)}%`);
    console.log(`    Recall: ${(stats.accuracy.recall * 100).toFixed(1)}%`);
    console.log(`    F1 Score: ${(stats.accuracy.f1 * 100).toFixed(1)}%`);
  });

  if (result.failedTests > 0) {
    console.log(`\n❌ 실패한 테스트:`);
    result.testResults
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  [${r.testCaseId}] ${r.category}: ${r.userInput}`);
        console.log(`    F1: ${r.icfAccuracy.overall.f1.toFixed(3)}`);
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
      `scripts/tests/results/icf-extraction-accuracy-${Date.now()}.json`
    );
    writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`\n💾 결과 저장: ${outputPath}`);

    // 최신 결과를 latest.json으로도 저장
    const latestPath = join(process.cwd(), "scripts/tests/results/icf-extraction-accuracy-latest.json");
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

