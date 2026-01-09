/**
 * Division 레벨 vs Subclass 레벨 매칭 정확도 비교 테스트
 * 
 * 두 가지 매칭 방식을 비교:
 * 1. ICF → ISO Division 레벨 → 제품 추천
 * 2. ICF → ISO Subclass 레벨 → 제품 추천
 * 
 * 실행: tsx scripts/tests/compare-division-vs-subclass-matching.ts
 */

import { createClient } from "@supabase/supabase-js";
import { getIsoMatches, getIsoMatchesAsync } from "@/core/matching/iso-mapping";
import { recommendProductsByIsoCode } from "@/core/matching/iso-product-recommender";
import * as dotenv from "dotenv";
import * as path from "path";

// 환경 변수 로드
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Supabase 환경 변수가 설정되지 않았습니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 테스트 케이스: ICF 코드 조합과 예상 ISO 코드
 */
interface TestCase {
  name: string;
  icfCodes: string[];
  expectedIsoSubclass: string; // 예상 Subclass 레벨 ISO 코드
  expectedIsoDivision?: string; // 예상 Division 레벨 ISO 코드 (선택적)
  description: string;
}

const testCases: TestCase[] = [
  {
    name: "식사 보조기기",
    icfCodes: ["d550", "b765"], // 식사 + 손 떨림
    expectedIsoSubclass: "15 09",
    expectedIsoDivision: "15 09 13", // 커트러리
    description: "식사 활동과 손 떨림이 있는 경우",
  },
  {
    name: "전동 휠체어",
    icfCodes: ["d465", "d450"], // 휠체어 이동 + 걷기
    expectedIsoSubclass: "12 23",
    description: "전동 휠체어가 필요한 경우",
  },
  {
    name: "수동 휠체어",
    icfCodes: ["d465"], // 휠체어 이동
    expectedIsoSubclass: "12 22",
    description: "수동 휠체어가 필요한 경우",
  },
  {
    name: "보행 보조기기",
    icfCodes: ["d450"], // 걷기
    expectedIsoSubclass: "12 06",
    description: "보행 보조가 필요한 경우",
  },
  {
    name: "목욕 보조기기",
    icfCodes: ["d510", "d520"], // 세면 + 목욕
    expectedIsoSubclass: "15 03",
    description: "목욕 및 샤워 보조가 필요한 경우",
  },
  {
    name: "시각 보조기기",
    icfCodes: ["b210", "d110"], // 시각 기능 + 기본 학습
    expectedIsoSubclass: "22 03",
    description: "시각 보조가 필요한 경우",
  },
  {
    name: "의사소통 보조기기",
    icfCodes: ["d360", "e125"], // 의사소통 + 제품 및 기술
    expectedIsoSubclass: "22 30",
    description: "의사소통 보조가 필요한 경우",
  },
  {
    name: "체위 변경 보조기기",
    icfCodes: ["b730", "d410", "d420"], // 근력 + 앉기 + 서기
    expectedIsoSubclass: "12 31",
    description: "체위 변경 보조가 필요한 경우",
  },
  {
    name: "가정생활 보조기기",
    icfCodes: ["d630", "d640"], // 식사 준비 + 가사 일
    expectedIsoSubclass: "12 21",
    description: "가정생활 보조가 필요한 경우",
  },
  {
    name: "청각 보조기기",
    icfCodes: ["b230", "d115"], // 청각 기능 + 듣기
    expectedIsoSubclass: "21 06",
    description: "청각 보조가 필요한 경우",
  },
];

interface MatchingResult {
  isoCode: string;
  score: number;
  label: string;
  productCount: number;
  topProductScores: number[];
}

interface TestResult {
  testCase: TestCase;
  divisionLevel: {
    matches: MatchingResult[];
    totalProducts: number;
    avgScore: number;
    maxScore: number;
    matchAccuracy: number; // 예상 ISO 코드와 일치하는지 여부
  };
  subclassLevel: {
    matches: MatchingResult[];
    totalProducts: number;
    avgScore: number;
    maxScore: number;
    matchAccuracy: number;
  };
  comparison: {
    productCountDiff: number; // Division이 더 많은 제품을 찾았는지
    scoreDiff: number; // Division이 더 높은 점수를 받았는지
    accuracyDiff: number; // Division이 더 정확한지
  };
}

/**
 * Division 레벨 매칭 테스트
 */
async function testDivisionLevelMatching(
  icfCodes: string[]
): Promise<MatchingResult[]> {
  // Division 레벨로 확장된 매칭
  const isoMatches = await getIsoMatchesAsync(icfCodes, {
    expandToDivisions: true,
    supabase,
  });

  const results: MatchingResult[] = [];

  for (const match of isoMatches.slice(0, 10)) {
    // 각 Division 레벨 ISO 코드로 제품 검색
    const recommendation = await recommendProductsByIsoCode(
      match.isoCode,
      {
        icfCodes: [],
        isoMatches: [match],
      },
      {
        limit: 20,
        includeRelated: false,
      }
    );

    const products = recommendation.products || [];
    const topScores = products
      .map((p) => p.score)
      .sort((a, b) => b - a)
      .slice(0, 5);

    results.push({
      isoCode: match.isoCode,
      score: match.score,
      label: match.label,
      productCount: products.length,
      topProductScores: topScores,
    });
  }

  return results;
}

/**
 * Subclass 레벨 매칭 테스트
 */
async function testSubclassLevelMatching(
  icfCodes: string[]
): Promise<MatchingResult[]> {
  // Subclass 레벨 매칭 (확장 없음)
  const isoMatches = getIsoMatches(icfCodes);

  const results: MatchingResult[] = [];

  for (const match of isoMatches.slice(0, 10)) {
    // Subclass 레벨 ISO 코드로 제품 검색 (자동으로 Division 확장됨)
    const recommendation = await recommendProductsByIsoCode(
      match.isoCode,
      {
        icfCodes: [],
        isoMatches: [match],
      },
      {
        limit: 20,
        includeRelated: false,
      }
    );

    const products = recommendation.products || [];
    const topScores = products
      .map((p) => p.score)
      .sort((a, b) => b - a)
      .slice(0, 5);

    results.push({
      isoCode: match.isoCode,
      score: match.score,
      label: match.label,
      productCount: products.length,
      topProductScores: topScores,
    });
  }

  return results;
}

/**
 * 매칭 정확도 계산
 */
function calculateMatchAccuracy(
  matches: MatchingResult[],
  expectedSubclass: string,
  expectedDivision?: string
): number {
  if (matches.length === 0) return 0;

  // Division 레벨 정확도
  if (expectedDivision) {
    const exactMatch = matches.some(
      (m) => m.isoCode === expectedDivision
    );
    if (exactMatch) return 1.0;
  }

  // Subclass 레벨 정확도
  const subclassMatch = matches.some((m) => {
    const parts = m.isoCode.split(" ").filter(Boolean);
    const subclass = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : m.isoCode;
    return subclass === expectedSubclass;
  });

  if (subclassMatch) return 0.8; // Subclass 일치 시 0.8점

  // 관련 Subclass 정확도 (같은 Class 내)
  const expectedClass = expectedSubclass.split(" ")[0];
  const relatedMatch = matches.some((m) => {
    const parts = m.isoCode.split(" ").filter(Boolean);
    const classCode = parts[0];
    return classCode === expectedClass;
  });

  if (relatedMatch) return 0.5; // 같은 Class 내 일치 시 0.5점

  return 0.0; // 일치 없음
}

/**
 * 단일 테스트 케이스 실행
 */
async function runTestCase(testCase: TestCase): Promise<TestResult> {
  console.log(`\n📋 테스트: ${testCase.name}`);
  console.log(`   ICF 코드: ${testCase.icfCodes.join(", ")}`);
  console.log(`   설명: ${testCase.description}`);

  // Division 레벨 매칭
  console.log(`   🔍 Division 레벨 매칭 중...`);
  const divisionMatches = await testDivisionLevelMatching(testCase.icfCodes);

  // Subclass 레벨 매칭
  console.log(`   🔍 Subclass 레벨 매칭 중...`);
  const subclassMatches = await testSubclassLevelMatching(testCase.icfCodes);

  // 결과 계산
  const divisionTotalProducts = divisionMatches.reduce(
    (sum, m) => sum + m.productCount,
    0
  );
  const divisionAvgScore =
    divisionMatches.length > 0
      ? divisionMatches.reduce((sum, m) => sum + m.score, 0) /
        divisionMatches.length
      : 0;
  const divisionMaxScore =
    divisionMatches.length > 0
      ? Math.max(...divisionMatches.map((m) => m.score))
      : 0;
  const divisionAccuracy = calculateMatchAccuracy(
    divisionMatches,
    testCase.expectedIsoSubclass,
    testCase.expectedIsoDivision
  );

  const subclassTotalProducts = subclassMatches.reduce(
    (sum, m) => sum + m.productCount,
    0
  );
  const subclassAvgScore =
    subclassMatches.length > 0
      ? subclassMatches.reduce((sum, m) => sum + m.score, 0) /
        subclassMatches.length
      : 0;
  const subclassMaxScore =
    subclassMatches.length > 0
      ? Math.max(...subclassMatches.map((m) => m.score))
      : 0;
  const subclassAccuracy = calculateMatchAccuracy(
    subclassMatches,
    testCase.expectedIsoSubclass,
    testCase.expectedIsoDivision
  );

  return {
    testCase,
    divisionLevel: {
      matches: divisionMatches,
      totalProducts: divisionTotalProducts,
      avgScore: divisionAvgScore,
      maxScore: divisionMaxScore,
      matchAccuracy: divisionAccuracy,
    },
    subclassLevel: {
      matches: subclassMatches,
      totalProducts: subclassTotalProducts,
      avgScore: subclassAvgScore,
      maxScore: subclassMaxScore,
      matchAccuracy: subclassAccuracy,
    },
    comparison: {
      productCountDiff: divisionTotalProducts - subclassTotalProducts,
      scoreDiff: divisionAvgScore - subclassAvgScore,
      accuracyDiff: divisionAccuracy - subclassAccuracy,
    },
  };
}

/**
 * 결과 출력
 */
function printResults(results: TestResult[]): void {
  console.log("\n" + "=".repeat(80));
  console.log("📊 테스트 결과 요약");
  console.log("=".repeat(80));

  // 전체 통계
  const totalDivisionProducts = results.reduce(
    (sum, r) => sum + r.divisionLevel.totalProducts,
    0
  );
  const totalSubclassProducts = results.reduce(
    (sum, r) => sum + r.subclassLevel.totalProducts,
    0
  );
  const avgDivisionAccuracy =
    results.reduce((sum, r) => sum + r.divisionLevel.matchAccuracy, 0) /
    results.length;
  const avgSubclassAccuracy =
    results.reduce((sum, r) => sum + r.subclassLevel.matchAccuracy, 0) /
    results.length;
  const avgDivisionScore =
    results.reduce((sum, r) => sum + r.divisionLevel.avgScore, 0) /
    results.length;
  const avgSubclassScore =
    results.reduce((sum, r) => sum + r.subclassLevel.avgScore, 0) /
    results.length;

  console.log("\n📈 전체 통계:");
  console.log(`   Division 레벨:`);
  console.log(`     - 총 제품 수: ${totalDivisionProducts}`);
  console.log(`     - 평균 정확도: ${(avgDivisionAccuracy * 100).toFixed(1)}%`);
  console.log(`     - 평균 점수: ${avgDivisionScore.toFixed(3)}`);
  console.log(`   Subclass 레벨:`);
  console.log(`     - 총 제품 수: ${totalSubclassProducts}`);
  console.log(`     - 평균 정확도: ${(avgSubclassAccuracy * 100).toFixed(1)}%`);
  console.log(`     - 평균 점수: ${avgSubclassScore.toFixed(3)}`);
  console.log(`   비교:`);
  console.log(
    `     - 제품 수 차이: ${totalDivisionProducts - totalSubclassProducts} (${(
      ((totalDivisionProducts - totalSubclassProducts) / totalSubclassProducts) *
      100
    ).toFixed(1)}%)`
  );
  console.log(
    `     - 정확도 차이: ${((avgDivisionAccuracy - avgSubclassAccuracy) * 100).toFixed(1)}%p`
  );
  console.log(
    `     - 점수 차이: ${(avgDivisionScore - avgSubclassScore).toFixed(3)}`
  );

  // 개별 테스트 결과
  console.log("\n📋 개별 테스트 결과:");
  for (const result of results) {
    console.log(`\n   ${result.testCase.name}:`);
    console.log(`     Division 레벨:`);
    console.log(
      `       - 매칭 수: ${result.divisionLevel.matches.length}, 제품 수: ${result.divisionLevel.totalProducts}`
    );
    console.log(
      `       - 정확도: ${(result.divisionLevel.matchAccuracy * 100).toFixed(1)}%, 평균 점수: ${result.divisionLevel.avgScore.toFixed(3)}`
    );
    if (result.divisionLevel.matches.length > 0) {
      console.log(
        `       - Top ISO: ${result.divisionLevel.matches[0].isoCode} (${result.divisionLevel.matches[0].label})`
      );
    }
    console.log(`     Subclass 레벨:`);
    console.log(
      `       - 매칭 수: ${result.subclassLevel.matches.length}, 제품 수: ${result.subclassLevel.totalProducts}`
    );
    console.log(
      `       - 정확도: ${(result.subclassLevel.matchAccuracy * 100).toFixed(1)}%, 평균 점수: ${result.subclassLevel.avgScore.toFixed(3)}`
    );
    if (result.subclassLevel.matches.length > 0) {
      console.log(
        `       - Top ISO: ${result.subclassLevel.matches[0].isoCode} (${result.subclassLevel.matches[0].label})`
      );
    }
    console.log(`     비교:`);
    console.log(
      `       - 제품 수 차이: ${result.comparison.productCountDiff > 0 ? "+" : ""}${result.comparison.productCountDiff}`
    );
    console.log(
      `       - 정확도 차이: ${result.comparison.accuracyDiff > 0 ? "+" : ""}${(result.comparison.accuracyDiff * 100).toFixed(1)}%p`
    );
    console.log(
      `       - 점수 차이: ${result.comparison.scoreDiff > 0 ? "+" : ""}${result.comparison.scoreDiff.toFixed(3)}`
    );
  }

  // 결론
  console.log("\n" + "=".repeat(80));
  console.log("🎯 결론:");
  if (avgDivisionAccuracy > avgSubclassAccuracy) {
    console.log(
      `   ✅ Division 레벨 매칭이 ${((avgDivisionAccuracy - avgSubclassAccuracy) * 100).toFixed(1)}%p 더 정확합니다.`
    );
  } else if (avgSubclassAccuracy > avgDivisionAccuracy) {
    console.log(
      `   ⚠️  Subclass 레벨 매칭이 ${((avgSubclassAccuracy - avgDivisionAccuracy) * 100).toFixed(1)}%p 더 정확합니다.`
    );
  } else {
    console.log(`   ➡️  두 방식의 정확도가 동일합니다.`);
  }

  if (totalDivisionProducts > totalSubclassProducts) {
    console.log(
      `   ✅ Division 레벨 매칭이 ${totalDivisionProducts - totalSubclassProducts}개 더 많은 제품을 찾았습니다.`
    );
  } else if (totalSubclassProducts > totalDivisionProducts) {
    console.log(
      `   ⚠️  Subclass 레벨 매칭이 ${totalSubclassProducts - totalDivisionProducts}개 더 많은 제품을 찾았습니다.`
    );
  } else {
    console.log(`   ➡️  두 방식이 동일한 수의 제품을 찾았습니다.`);
  }

  if (avgDivisionScore > avgSubclassScore) {
    console.log(
      `   ✅ Division 레벨 매칭이 평균 점수가 ${(avgDivisionScore - avgSubclassScore).toFixed(3)} 더 높습니다.`
    );
  } else if (avgSubclassScore > avgDivisionScore) {
    console.log(
      `   ⚠️  Subclass 레벨 매칭이 평균 점수가 ${(avgSubclassScore - avgDivisionScore).toFixed(3)} 더 높습니다.`
    );
  } else {
    console.log(`   ➡️  두 방식의 평균 점수가 동일합니다.`);
  }
  console.log("=".repeat(80));
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log("🚀 Division vs Subclass 레벨 매칭 정확도 비교 테스트 시작");
  console.log(`📝 테스트 케이스: ${testCases.length}개`);

  const results: TestResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    try {
      const result = await runTestCase(testCase);
      results.push(result);
      console.log(`   ✅ 완료 (${i + 1}/${testCases.length})`);
    } catch (error) {
      console.error(`   ❌ 오류 발생:`, error);
      console.error(`   테스트 케이스: ${testCase.name}`);
    }

    // Rate limiting 방지
    if (i < testCases.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // 결과 출력
  printResults(results);

  // JSON 파일로 저장
  const fs = await import("fs");
  const outputPath = path.join(
    process.cwd(),
    "scripts/tests/results",
    `division-vs-subclass-comparison-${Date.now()}.json`
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 결과가 저장되었습니다: ${outputPath}`);
}

// 실행
main().catch((error) => {
  console.error("❌ 테스트 실행 중 오류:", error);
  process.exit(1);
});
