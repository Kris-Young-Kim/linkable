/**
 * ISO 코드 매칭이 잘못된 것으로 의심되는 상품 데이터를 찾는 스크립트
 * 
 * 실행 방법:
 *   pnpm tsx scripts/check-iso-mismatches.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// 환경 변수 로드
const envLocalPath = resolve(process.cwd(), ".env.local");
const envPath = resolve(process.cwd(), ".env");

config({ path: envLocalPath });
config({ path: envPath });

// 환경 변수 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Supabase 환경 변수가 설정되지 않았습니다.");
  console.error("   NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "✓" : "✗");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * ISO 코드별 예상 키워드 맵
 */
const ISO_KEYWORD_MAP: Record<string, string[]> = {
  "12 03": ["지팡이", "목발", "한팔", "보행", "cane", "crutch"],
  "12 06": ["보행기", "워커", "지팡이", "목발", "보행보조", "보행도구", "walker"],
  "12 08": ["안내", "지팡이", "시각", "맹인", "white cane", "blind"],
  "12 22": ["휠체어", "수동", "휠체", "wheelchair", "의자형", "바퀴", "manual"],
  "12 23": ["휠체어", "전동", "전기", "모터", "전동휠체어", "전동의자", "power", "electric"],
  "12 31": ["체위", "리프트", "앉기", "서기", "전동의자", "리프트체어", "기립", "lift"],
  "15 03": ["목욕", "샤워", "욕실", "변기", "욕조", "bath", "shower", "toilet"],
  "15 04": ["착의", "옷입기", "의복", "dressing", "clothing"],
  "15 05": ["청소", "청소기", "cleaning"],
  "15 06": ["요리", "조리", "주방", "cooking", "kitchen"],
  "15 09": ["식기", "식사", "숟가락", "포크", "컵", "음주", "무게조절", "적응형", "식사도구", "식사보조", "식사기구", "eating", "utensil"],
  "18 18": ["손잡이", "그랩바", "지지", "grab bar", "handrail"],
  "18 30": ["경사로", "승강기", "수직", "접근성", "ramp", "elevator", "lift"],
  "21 06": ["보청기", "청각", "난청", "hearing aid", "hearing"],
  "21 27": ["평형", "전정", "어지럼", "balance", "vestibular"],
  "22 03": ["시각", "확대경", "돋보기", "magnifier", "visual"],
  "22 30": ["의사소통", "AAC", "말하기", "communication", "speech"],
  "04 03": ["인지", "기억", "주의", "사고", "문제해결", "지적", "훈련", "보조", "cognitive", "memory", "attention", "thinking", "training"],
  "04 48": ["운동", "근력", "균형", "심폐", "훈련", "exercise", "strength", "balance", "cardio"],
  "30 03": ["놀이", "레저", "여가", "play", "leisure", "recreation"],
};

/**
 * 상품 텍스트에서 키워드 검색
 */
function findKeywordsInText(text: string, keywords: string[]): string[] {
  const lowerText = text.toLowerCase();
  return keywords.filter(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * ISO 코드가 상품명/설명과 일치하는지 확인
 */
function checkIsoMatch(
  product: {
    name: string;
    description: string | null;
    category: string | null;
    iso_code: string | null;
  }
): {
  isMatch: boolean;
  expectedKeywords: string[];
  foundKeywords: string[];
  confidence: "high" | "medium" | "low" | "none";
  reason: string;
} {
  const isoCode = product.iso_code?.trim() || null;
  const productText = `${product.name} ${product.description || ""} ${product.category || ""}`.toLowerCase();

  // ISO 코드가 없는 경우
  if (!isoCode || isoCode === "N999999") {
    // 명확한 키워드가 있는데 ISO 코드가 없는 경우
    const allKeywords = Object.values(ISO_KEYWORD_MAP).flat();
    const foundKeywords = findKeywordsInText(productText, allKeywords);
    
    if (foundKeywords.length > 0) {
      // 어떤 ISO 코드가 적합한지 찾기
      let matchedIso: string | null = null;
      for (const [iso, keywords] of Object.entries(ISO_KEYWORD_MAP)) {
        const matched = findKeywordsInText(productText, keywords);
        if (matched.length > 0) {
          matchedIso = iso;
          break;
        }
      }

      return {
        isMatch: false,
        expectedKeywords: matchedIso ? ISO_KEYWORD_MAP[matchedIso] : [],
        foundKeywords,
        confidence: foundKeywords.length >= 2 ? "high" : "medium",
        reason: matchedIso 
          ? `ISO 코드가 없지만 "${matchedIso}" 관련 키워드 발견 (${foundKeywords.join(", ")})`
          : `ISO 코드가 없지만 보조기기 관련 키워드 발견 (${foundKeywords.join(", ")})`,
      };
    }

    return {
      isMatch: true,
      expectedKeywords: [],
      foundKeywords: [],
      confidence: "none",
      reason: "ISO 코드가 없고 관련 키워드도 없음",
    };
  }

  // ISO 코드가 있는 경우
  const expectedKeywords = ISO_KEYWORD_MAP[isoCode] || [];
  const foundKeywords = findKeywordsInText(productText, expectedKeywords);

  if (expectedKeywords.length === 0) {
    // 알 수 없는 ISO 코드
    return {
      isMatch: false,
      expectedKeywords: [],
      foundKeywords: [],
      confidence: "low",
      reason: `알 수 없는 ISO 코드: ${isoCode}`,
    };
  }

  if (foundKeywords.length === 0) {
    // ISO 코드는 있지만 관련 키워드가 없음
    return {
      isMatch: false,
      expectedKeywords,
      foundKeywords: [],
      confidence: "high",
      reason: `ISO 코드 "${isoCode}"가 설정되어 있지만 관련 키워드가 없음 (예상 키워드: ${expectedKeywords.slice(0, 5).join(", ")})`,
    };
  }

  // 키워드 매칭 비율 계산
  const matchRatio = foundKeywords.length / expectedKeywords.length;
  
  if (matchRatio >= 0.3) {
    return {
      isMatch: true,
      expectedKeywords,
      foundKeywords,
      confidence: matchRatio >= 0.5 ? "high" : "medium",
      reason: `ISO 코드 "${isoCode}"와 일치하는 키워드 발견 (${foundKeywords.join(", ")})`,
    };
  } else {
    return {
      isMatch: false,
      expectedKeywords,
      foundKeywords,
      confidence: "medium",
      reason: `ISO 코드 "${isoCode}"가 설정되어 있지만 관련 키워드가 부족함 (발견: ${foundKeywords.join(", ")}, 예상: ${expectedKeywords.slice(0, 5).join(", ")})`,
    };
  }
}

/**
 * 메인 함수
 */
async function checkIsoMismatches() {
  console.log("🔍 ISO 코드 매칭 검사 시작...\n");

  try {
    // 모든 상품 조회
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, iso_code, description, category, manufacturer, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`상품 조회 실패: ${error.message}`);
    }

    if (!products || products.length === 0) {
      console.log("✅ 조회된 상품이 없습니다.");
      return;
    }

    console.log(`📦 총 ${products.length}개 상품 검사 중...\n`);

    const mismatches: Array<{
      product: typeof products[0];
      check: ReturnType<typeof checkIsoMatch>;
    }> = [];

    // 각 상품 검사
    for (const product of products) {
      const check = checkIsoMatch(product);
      if (!check.isMatch && check.confidence !== "none") {
        mismatches.push({ product, check });
      }
    }

    // 결과 출력
    console.log(`\n📊 검사 결과:`);
    console.log(`   총 상품 수: ${products.length}개`);
    console.log(`   의심스러운 매칭: ${mismatches.length}개\n`);

    if (mismatches.length === 0) {
      console.log("✅ 모든 상품의 ISO 코드가 적절하게 매칭되어 있습니다!");
      return;
    }

    // 신뢰도별로 정렬
    const confidenceOrder = { high: 0, medium: 1, low: 2, none: 3 };
    mismatches.sort((a, b) => 
      confidenceOrder[a.check.confidence] - confidenceOrder[b.check.confidence]
    );

    // 상세 결과 출력
    console.log("⚠️  의심스러운 ISO 코드 매칭:\n");
    
    for (let i = 0; i < Math.min(mismatches.length, 50); i++) {
      const { product, check } = mismatches[i];
      const confidenceEmoji = {
        high: "🔴",
        medium: "🟡",
        low: "🟠",
        none: "⚪",
      }[check.confidence];

      console.log(`${confidenceEmoji} [${check.confidence.toUpperCase()}] ${product.name}`);
      console.log(`   현재 ISO 코드: ${product.iso_code || "없음"}`);
      console.log(`   이유: ${check.reason}`);
      if (check.foundKeywords.length > 0) {
        console.log(`   발견된 키워드: ${check.foundKeywords.join(", ")}`);
      }
      if (check.expectedKeywords.length > 0 && check.foundKeywords.length === 0) {
        console.log(`   예상 키워드: ${check.expectedKeywords.slice(0, 5).join(", ")}...`);
      }
      console.log(`   ID: ${product.id}`);
      console.log("");
    }

    if (mismatches.length > 50) {
      console.log(`\n... 외 ${mismatches.length - 50}개 더 있음\n`);
    }

    // 통계 출력
    const byConfidence = {
      high: mismatches.filter(m => m.check.confidence === "high").length,
      medium: mismatches.filter(m => m.check.confidence === "medium").length,
      low: mismatches.filter(m => m.check.confidence === "low").length,
    };

    console.log("\n📈 신뢰도별 분포:");
    console.log(`   🔴 높은 신뢰도 (즉시 검토 필요): ${byConfidence.high}개`);
    console.log(`   🟡 중간 신뢰도 (검토 권장): ${byConfidence.medium}개`);
    console.log(`   🟠 낮은 신뢰도 (참고용): ${byConfidence.low}개`);

    // ISO 코드별 통계
    const byIsoCode: Record<string, number> = {};
    mismatches.forEach(({ product }) => {
      const iso = product.iso_code || "없음";
      byIsoCode[iso] = (byIsoCode[iso] || 0) + 1;
    });

    console.log("\n📋 ISO 코드별 의심 데이터 수:");
    Object.entries(byIsoCode)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([iso, count]) => {
        console.log(`   ${iso}: ${count}개`);
      });

  } catch (error: any) {
    console.error("❌ 오류 발생:", error.message);
    process.exit(1);
  }
}

// 실행
checkIsoMismatches().catch(console.error);
