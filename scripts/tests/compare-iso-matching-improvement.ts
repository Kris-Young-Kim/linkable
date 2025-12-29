#!/usr/bin/env tsx
/**
 * ISO 9999 풀텍스트 업데이트 전후 매칭도 비교 테스트
 * 
 * 사용법:
 *   pnpm tsx scripts/tests/compare-iso-matching-improvement.ts
 * 
 * 이 스크립트는:
 * 1. 현재 ISO 코드 데이터베이스 상태 확인 (코드 수, 설명 포함 여부)
 * 2. ISO 매칭 정확도 측정
 * 3. 이전 결과와 비교 (있다면)
 * 4. 향상된 점수 표시
 */

// 환경 변수 먼저 로드 (import 전에)
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

// 환경 변수 로드 후 import
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import type { MeasurementResult } from "./measure-iso-matching-accuracy";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Supabase 환경 변수가 설정되지 않았습니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

interface IsoCodeStats {
  totalCodes: number;
  codesWithDescription: number;
  codesWithName: number;
  level1Count: number;
  level2Count: number;
  level3Count: number;
  avgDescriptionLength: number;
}

interface ComparisonResult {
  timestamp: string;
  beforeStats?: IsoCodeStats;
  afterStats: IsoCodeStats;
  beforeMeasurement?: MeasurementResult;
  afterMeasurement: MeasurementResult;
  improvement: {
    codeCountIncrease: number;
    descriptionCoverageIncrease: number;
    precisionImprovement: number;
    recallImprovement: number;
    f1Improvement: number;
    top1AccuracyImprovement: number;
    top3AccuracyImprovement: number;
    top5AccuracyImprovement: number;
  };
}

/**
 * ISO 코드 데이터베이스 상태 확인
 */
async function getIsoCodeStats(): Promise<IsoCodeStats> {
  console.log("📊 ISO 코드 데이터베이스 상태 확인 중...\n");

  const { data: allCodes, error } = await supabase
    .from("iso_codes")
    .select("code, name, description, level");

  if (error) {
    throw error;
  }

  if (!allCodes || allCodes.length === 0) {
    return {
      totalCodes: 0,
      codesWithDescription: 0,
      codesWithName: 0,
      level1Count: 0,
      level2Count: 0,
      level3Count: 0,
      avgDescriptionLength: 0,
    };
  }

  const codesWithDescription = allCodes.filter(
    (c) => c.description && c.description.trim().length > 0
  ).length;
  const codesWithName = allCodes.filter(
    (c) => c.name && c.name.trim().length > 0
  ).length;

  const descriptions = allCodes
    .map((c) => c.description || "")
    .filter((d) => d.length > 0);
  const avgDescriptionLength =
    descriptions.length > 0
      ? descriptions.reduce((sum, d) => sum + d.length, 0) / descriptions.length
      : 0;

  const level1Count = allCodes.filter((c) => c.level === 1).length;
  const level2Count = allCodes.filter((c) => c.level === 2).length;
  const level3Count = allCodes.filter((c) => c.level === 3).length;

  return {
    totalCodes: allCodes.length,
    codesWithDescription,
    codesWithName,
    level1Count,
    level2Count,
    level3Count,
    avgDescriptionLength: Math.round(avgDescriptionLength),
  };
}

/**
 * 이전 측정 결과 로드
 */
function loadPreviousMeasurement(): MeasurementResult | null {
  const latestPath = join(
    process.cwd(),
    "scripts/tests/results/iso-matching-accuracy-latest.json"
  );

  if (!existsSync(latestPath)) {
    return null;
  }

  try {
    const content = readFileSync(latestPath, "utf-8");
    return JSON.parse(content) as MeasurementResult;
  } catch (error) {
    console.warn("⚠️  이전 결과 파일을 읽을 수 없습니다:", error);
    return null;
  }
}

/**
 * 이전 ISO 코드 통계 로드 (백업 파일에서)
 */
function loadPreviousStats(): IsoCodeStats | null {
  const backupPath = join(
    process.cwd(),
    "scripts/tests/results/iso-code-stats-before.json"
  );

  if (!existsSync(backupPath)) {
    return null;
  }

  try {
    const content = readFileSync(backupPath, "utf-8");
    return JSON.parse(content) as IsoCodeStats;
  } catch (error) {
    return null;
  }
}

/**
 * 현재 통계를 백업으로 저장
 */
function saveCurrentStatsAsBackup(stats: IsoCodeStats) {
  const backupPath = join(
    process.cwd(),
    "scripts/tests/results/iso-code-stats-before.json"
  );
  writeFileSync(backupPath, JSON.stringify(stats, null, 2), "utf-8");
}

/**
 * 비교 결과 출력
 */
function printComparison(comparison: ComparisonResult) {
  console.log("\n" + "=".repeat(80));
  console.log("📊 ISO 9999 풀텍스트 업데이트 전후 비교 결과");
  console.log("=".repeat(80));

  // 데이터베이스 상태 비교
  console.log("\n📈 데이터베이스 상태 비교:");
  if (comparison.beforeStats) {
    console.log(`  총 ISO 코드 수:`);
    console.log(`    이전: ${comparison.beforeStats.totalCodes}개`);
    console.log(`    현재: ${comparison.afterStats.totalCodes}개`);
    console.log(
      `    증가: +${comparison.improvement.codeCountIncrease}개 (${(
        (comparison.improvement.codeCountIncrease /
          comparison.beforeStats.totalCodes) *
        100
      ).toFixed(1)}%)`
    );

    console.log(`\n  설명 포함 코드:`);
    console.log(`    이전: ${comparison.beforeStats.codesWithDescription}개`);
    console.log(`    현재: ${comparison.afterStats.codesWithDescription}개`);
    console.log(
      `    증가: +${comparison.improvement.descriptionCoverageIncrease}개`
    );

    console.log(`\n  코드 레벨별 분포:`);
    console.log(`    대분류 (Level 1): ${comparison.afterStats.level1Count}개`);
    console.log(`    중분류 (Level 2): ${comparison.afterStats.level2Count}개`);
    console.log(`    소분류 (Level 3): ${comparison.afterStats.level3Count}개`);

    console.log(
      `\n  평균 설명 길이: ${comparison.afterStats.avgDescriptionLength}자`
    );
  } else {
    console.log(`  현재 상태:`);
    console.log(`    총 ISO 코드 수: ${comparison.afterStats.totalCodes}개`);
    console.log(
      `    설명 포함: ${comparison.afterStats.codesWithDescription}개 (${(
        (comparison.afterStats.codesWithDescription /
          comparison.afterStats.totalCodes) *
        100
      ).toFixed(1)}%)`
    );
    console.log(`    대분류: ${comparison.afterStats.level1Count}개`);
    console.log(`    중분류: ${comparison.afterStats.level2Count}개`);
    console.log(`    소분류: ${comparison.afterStats.level3Count}개`);
  }

  // 매칭 정확도 비교
  console.log("\n🎯 매칭 정확도 비교:");
  if (comparison.beforeMeasurement) {
    const before = comparison.beforeMeasurement.overallAccuracy;
    const after = comparison.afterMeasurement.overallAccuracy;

    console.log(`  Precision (정밀도):`);
    console.log(`    이전: ${(before.precision * 100).toFixed(1)}%`);
    console.log(`    현재: ${(after.precision * 100).toFixed(1)}%`);
    console.log(
      `    향상: ${comparison.improvement.precisionImprovement >= 0 ? "+" : ""}${(comparison.improvement.precisionImprovement * 100).toFixed(1)}%p`
    );

    console.log(`\n  Recall (재현율):`);
    console.log(`    이전: ${(before.recall * 100).toFixed(1)}%`);
    console.log(`    현재: ${(after.recall * 100).toFixed(1)}%`);
    console.log(
      `    향상: ${comparison.improvement.recallImprovement >= 0 ? "+" : ""}${(comparison.improvement.recallImprovement * 100).toFixed(1)}%p`
    );

    console.log(`\n  F1 Score:`);
    console.log(`    이전: ${(before.f1 * 100).toFixed(1)}%`);
    console.log(`    현재: ${(after.f1 * 100).toFixed(1)}%`);
    console.log(
      `    향상: ${comparison.improvement.f1Improvement >= 0 ? "+" : ""}${(comparison.improvement.f1Improvement * 100).toFixed(1)}%p`
    );

    console.log(`\n  Top-1 정확도:`);
    console.log(`    이전: ${(before.top1Accuracy * 100).toFixed(1)}%`);
    console.log(`    현재: ${(after.top1Accuracy * 100).toFixed(1)}%`);
    console.log(
      `    향상: ${comparison.improvement.top1AccuracyImprovement >= 0 ? "+" : ""}${(comparison.improvement.top1AccuracyImprovement * 100).toFixed(1)}%p`
    );

    console.log(`\n  Top-3 정확도:`);
    console.log(`    이전: ${(before.top3Accuracy * 100).toFixed(1)}%`);
    console.log(`    현재: ${(after.top3Accuracy * 100).toFixed(1)}%`);
    console.log(
      `    향상: ${comparison.improvement.top3AccuracyImprovement >= 0 ? "+" : ""}${(comparison.improvement.top3AccuracyImprovement * 100).toFixed(1)}%p`
    );

    console.log(`\n  Top-5 정확도:`);
    console.log(`    이전: ${(before.top5Accuracy * 100).toFixed(1)}%`);
    console.log(`    현재: ${(after.top5Accuracy * 100).toFixed(1)}%`);
    console.log(
      `    향상: ${comparison.improvement.top5AccuracyImprovement >= 0 ? "+" : ""}${(comparison.improvement.top5AccuracyImprovement * 100).toFixed(1)}%p`
    );

    // 통과율 비교
    const beforePassRate =
      comparison.beforeMeasurement.passedTests /
      comparison.beforeMeasurement.totalTests;
    const afterPassRate =
      comparison.afterMeasurement.passedTests /
      comparison.afterMeasurement.totalTests;

    console.log(`\n  테스트 통과율:`);
    console.log(`    이전: ${(beforePassRate * 100).toFixed(1)}%`);
    console.log(`    현재: ${(afterPassRate * 100).toFixed(1)}%`);
    console.log(
      `    향상: ${((afterPassRate - beforePassRate) * 100).toFixed(1)}%p`
    );
  } else {
    console.log(`  현재 측정 결과:`);
    const acc = comparison.afterMeasurement.overallAccuracy;
    console.log(`    Precision: ${(acc.precision * 100).toFixed(1)}%`);
    console.log(`    Recall: ${(acc.recall * 100).toFixed(1)}%`);
    console.log(`    F1 Score: ${(acc.f1 * 100).toFixed(1)}%`);
    console.log(`    Top-1: ${(acc.top1Accuracy * 100).toFixed(1)}%`);
    console.log(`    Top-3: ${(acc.top3Accuracy * 100).toFixed(1)}%`);
    console.log(`    Top-5: ${(acc.top5Accuracy * 100).toFixed(1)}%`);
    console.log(
      `    통과율: ${(
        (comparison.afterMeasurement.passedTests /
          comparison.afterMeasurement.totalTests) *
        100
      ).toFixed(1)}%`
    );
  }

  // 개선 요약
  if (comparison.beforeMeasurement) {
    console.log("\n✨ 개선 요약:");
    const improvements = [
      {
        name: "F1 Score",
        value: comparison.improvement.f1Improvement,
        unit: "%p",
      },
      {
        name: "Top-3 정확도",
        value: comparison.improvement.top3AccuracyImprovement,
        unit: "%p",
      },
      {
        name: "ISO 코드 수",
        value: comparison.improvement.codeCountIncrease,
        unit: "개",
      },
    ];

    improvements.forEach((imp) => {
      if (imp.value > 0) {
        console.log(
          `  ✅ ${imp.name}: +${imp.value.toFixed(imp.unit === "%p" ? 1 : 0)}${imp.unit}`
        );
      } else if (imp.value < 0) {
        console.log(
          `  ⚠️  ${imp.name}: ${imp.value.toFixed(imp.unit === "%p" ? 1 : 0)}${imp.unit}`
        );
      } else {
        console.log(`  ➖ ${imp.name}: 변화 없음`);
      }
    });
  }

  console.log("\n" + "=".repeat(80));
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    console.log("🚀 ISO 9999 풀텍스트 업데이트 전후 비교 테스트 시작");
    console.log("=".repeat(80));

    // 1. 현재 ISO 코드 통계 확인
    const currentStats = await getIsoCodeStats();
    console.log("📊 현재 ISO 코드 통계:");
    console.log(`  총 코드 수: ${currentStats.totalCodes}개`);
    console.log(
      `  설명 포함: ${currentStats.codesWithDescription}개 (${(
        (currentStats.codesWithDescription / currentStats.totalCodes) *
        100
      ).toFixed(1)}%)`
    );
    console.log(`  대분류: ${currentStats.level1Count}개`);
    console.log(`  중분류: ${currentStats.level2Count}개`);
    console.log(`  소분류: ${currentStats.level3Count}개`);
    console.log(`  평균 설명 길이: ${currentStats.avgDescriptionLength}자\n`);

    // 2. 이전 통계 로드 (없으면 현재를 백업으로 저장)
    const previousStats = loadPreviousStats();
    if (!previousStats) {
      console.log("💾 현재 통계를 백업으로 저장합니다...");
      saveCurrentStatsAsBackup(currentStats);
      console.log("  (다음 실행 시 비교 기준으로 사용됩니다)\n");
    }

    // 3. ISO 매칭 정확도 측정 실행
    console.log("🔍 ISO 매칭 정확도 측정 시작...\n");
    console.log("  (measure-iso-matching-accuracy.ts 실행 중...)\n");
    
    // measure-iso-matching-accuracy.ts를 직접 실행
    try {
      execSync("pnpm tsx scripts/tests/measure-iso-matching-accuracy.ts", {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (error) {
      console.error("⚠️  측정 스크립트 실행 중 오류 (계속 진행)");
    }
    
    // 결과 파일에서 읽기
    const latestResultPath = join(
      process.cwd(),
      "scripts/tests/results/iso-matching-accuracy-latest.json"
    );
    
    if (!existsSync(latestResultPath)) {
      throw new Error("측정 결과 파일을 찾을 수 없습니다. 측정이 완료되었는지 확인하세요.");
    }
    
    const currentMeasurement: MeasurementResult = JSON.parse(
      readFileSync(latestResultPath, "utf-8")
    );

    // 4. 이전 측정 결과 로드
    const previousMeasurement = loadPreviousMeasurement();

    // 5. 비교 결과 계산
    const comparison: ComparisonResult = {
      timestamp: new Date().toISOString(),
      beforeStats: previousStats || undefined,
      afterStats: currentStats,
      beforeMeasurement: previousMeasurement || undefined,
      afterMeasurement: currentMeasurement,
      improvement: {
        codeCountIncrease: previousStats
          ? currentStats.totalCodes - previousStats.totalCodes
          : 0,
        descriptionCoverageIncrease: previousStats
          ? currentStats.codesWithDescription -
            previousStats.codesWithDescription
          : 0,
        precisionImprovement: previousMeasurement
          ? currentMeasurement.overallAccuracy.precision -
            previousMeasurement.overallAccuracy.precision
          : 0,
        recallImprovement: previousMeasurement
          ? currentMeasurement.overallAccuracy.recall -
            previousMeasurement.overallAccuracy.recall
          : 0,
        f1Improvement: previousMeasurement
          ? currentMeasurement.overallAccuracy.f1 -
            previousMeasurement.overallAccuracy.f1
          : 0,
        top1AccuracyImprovement: previousMeasurement
          ? currentMeasurement.overallAccuracy.top1Accuracy -
            previousMeasurement.overallAccuracy.top1Accuracy
          : 0,
        top3AccuracyImprovement: previousMeasurement
          ? currentMeasurement.overallAccuracy.top3Accuracy -
            previousMeasurement.overallAccuracy.top3Accuracy
          : 0,
        top5AccuracyImprovement: previousMeasurement
          ? currentMeasurement.overallAccuracy.top5Accuracy -
            previousMeasurement.overallAccuracy.top5Accuracy
          : 0,
      },
    };

    // 6. 비교 결과 출력
    printComparison(comparison);

    // 7. 결과 저장
    const outputPath = join(
      process.cwd(),
      `scripts/tests/results/iso-matching-comparison-${Date.now()}.json`
    );
    writeFileSync(outputPath, JSON.stringify(comparison, null, 2), "utf-8");
    console.log(`\n💾 비교 결과 저장: ${outputPath}`);

    // 최신 비교 결과도 저장
    const latestPath = join(
      process.cwd(),
      "scripts/tests/results/iso-matching-comparison-latest.json"
    );
    writeFileSync(latestPath, JSON.stringify(comparison, null, 2), "utf-8");
    console.log(`💾 최신 비교 결과 저장: ${latestPath}`);

    // 8. 종료 코드
    if (previousMeasurement) {
      const f1Improved = comparison.improvement.f1Improvement > 0;
      process.exit(f1Improved ? 0 : 1);
    } else {
      console.log(
        "\n💡 다음 실행 시 이전 결과와 비교하여 개선도를 확인할 수 있습니다."
      );
      process.exit(0);
    }
  } catch (error) {
    console.error("\n❌ 비교 테스트 실행 중 오류 발생:");
    console.error(error);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}
