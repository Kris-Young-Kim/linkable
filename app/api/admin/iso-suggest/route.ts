import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/auth/verify-admin";
import { isoMappingTable } from "@/core/matching/iso-mapping";
import { iso9999Catalog, searchIsoCodes } from "@/lib/iso-9999-catalog";
import { inferIsoCodeFromProduct } from "@/core/matching/ai-iso-inference";

const mapReasonToStatus = (
  reason: "not_authenticated" | "insufficient_permissions" | "error"
) => {
  if (reason === "not_authenticated") return 401;
  if (reason === "insufficient_permissions") return 403;
  return 500;
};

/**
 * 상품명 기반 ISO 코드 자동 추천 API
 *
 * 1. 키워드 기반 매칭 (빠른 응답)
 * 2. AI 기반 추론 (정확도 향상)
 * 3. ISO 카탈로그 검색 (포괄적 검색)
 */
export async function POST(request: Request) {
  const access = await verifyAdminAccess();

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: mapReasonToStatus(access.reason) }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    productName?: string;
  };

  if (!body.productName || typeof body.productName !== "string") {
    return NextResponse.json(
      { error: "상품명이 필요합니다." },
      { status: 400 }
    );
  }

  const productName = body.productName.toLowerCase().trim();

  // 1. 키워드 기반 매칭 (ISO 카탈로그 전체 사용)
  const keywordMatches: Array<{
    iso: string;
    label: string;
    description: string;
    score: number;
    matchedKeywords: string[];
  }> = [];

  // ISO 코드별 키워드 맵 (더 포괄적인 매칭을 위해)
  const isoKeywordMap: Record<string, string[]> = {
    "15 09": [
      "식기",
      "식사",
      "숟가락",
      "포크",
      "컵",
      "음주",
      "무게조절",
      "적응형",
      "식사도구",
      "식사보조",
      "식사기구",
    ],
    "12 22": ["휠체어", "휠체", "수동", "wheelchair", "의자형", "바퀴"],
    "12 23": [
      "휠체어",
      "전동",
      "전기",
      "모터",
      "전동휠체어",
      "전동의자",
      "전동체어",
    ],
    "12 06": [
      "보행기",
      "워커",
      "지팡이",
      "목발",
      "보행보조",
      "보행도구",
      "보행장비",
    ],
    "12 03": ["지팡이", "목발", "한팔", "보행"],
    "12 08": ["안내", "지팡이", "시각", "맹인"],
    "12 31": [
      "체위",
      "리프트",
      "앉기",
      "서기",
      "전동의자",
      "리프트체어",
      "기립",
    ],
    "18 30": ["경사로", "승강기", "램프", "접근성", "문턱", "계단", "수직"],
    "18 18": ["손잡이", "그랩바", "핸드레일", "안전바", "지지대", "레일"],
    "09 33": [
      "목욕",
      "샤워",
      "세면",
      "욕조",
      "욕실",
      "의자",
      "욕실의자",
      "샤워의자",
    ],
    "09 18": ["옷", "착의", "의복", "입기", "착용"],
    "15 03": ["요리", "음식", "조리", "준비", "주방"],
    "15 12": ["청소", "청소기", "청소도구", "청소장비"],
    "21 06": ["청각", "보청기", "난청", "청력", "hearing", "ear"],
    "21 27": ["평형", "전정", "어지럼", "균형", "balance"],
    "22 03": ["시각", "확대경", "돋보기", "저시력", "시력", "눈", "vision"],
    "22 06": ["읽기", "점자", "스크린리더", "음성변환", "텍스트", "독서"],
    "22 30": ["의사소통", "aac", "대화", "언어", "communication", "말하기"],
    "22 33": ["학습", "기억", "학습도구", "기억보조", "교육"],
    "24 06": ["손", "손기능", "손떨림", "손보조", "hand"],
    "24 03": ["들기", "옮기기", "운반", "물건"],
    "04 03": ["인지", "기억", "주의", "사고", "훈련", "cognitive"],
    "04 48": ["운동", "근력", "균형", "심폐", "훈련", "exercise"],
    "06 06": ["상지", "보조기", "팔", "arm"],
    "06 12": ["하지", "보조기", "다리", "leg"],
    "30 03": ["놀이", "play", "게임"],
    "30 09": ["스포츠", "sports", "운동"],
  };

  // ISO 카탈로그에서 키워드 매칭
  for (const isoInfo of iso9999Catalog) {
    const labelLower = isoInfo.label.toLowerCase();
    const descLower = isoInfo.description.toLowerCase();
    const isoLower = isoInfo.iso.toLowerCase();
    const productNameLower = productName.toLowerCase();

    // 키워드 추출 및 매칭
    const matchedKeywords: string[] = [];

    // 1. 사전 정의된 키워드 맵 사용
    const predefinedKeywords = isoKeywordMap[isoInfo.iso] || [];
    for (const keyword of predefinedKeywords) {
      if (productNameLower.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }

    // 2. 라벨과 설명에서 키워드 추출
    const labelWords = labelLower
      .split(/[\s,\-()]+/)
      .filter((w) => w.length > 1);
    const descWords = descLower.split(/[\s,\-()]+/).filter((w) => w.length > 1);

    for (const word of [...labelWords, ...descWords]) {
      if (word.length > 1 && productNameLower.includes(word)) {
        matchedKeywords.push(word);
      }
    }

    // 3. ISO 코드 자체도 매칭 (예: "15 09" 입력 시)
    if (
      productNameLower.includes(isoLower.replace(/\s/g, "")) ||
      productNameLower.includes(isoLower)
    ) {
      matchedKeywords.push(isoInfo.iso);
    }

    // 4. 부분 매칭 (예: "식기"가 포함된 모든 단어)
    const productWords = productNameLower
      .split(/[\s,\-()]+/)
      .filter((w) => w.length > 1);
    for (const productWord of productWords) {
      for (const keyword of predefinedKeywords) {
        if (productWord.includes(keyword) || keyword.includes(productWord)) {
          matchedKeywords.push(keyword);
        }
      }
    }

    if (matchedKeywords.length > 0) {
      // 중복 제거
      const uniqueKeywords = Array.from(new Set(matchedKeywords));

      // 점수 계산: 매칭된 키워드 수와 관련성
      const keywordScore = uniqueKeywords.length * 0.5;
      const relevanceScore = uniqueKeywords.reduce((sum, kw) => {
        // 더 긴 키워드일수록 높은 점수
        const keywordLength = kw.length;
        const matchRatio = keywordLength / Math.max(productName.length, 1);
        return sum + matchRatio * 0.5;
      }, 0);

      // 사전 정의된 키워드 매칭은 추가 점수
      const predefinedMatchCount = uniqueKeywords.filter((kw) =>
        predefinedKeywords.includes(kw)
      ).length;
      const predefinedBonus = predefinedMatchCount * 0.3;

      const score = keywordScore + relevanceScore + predefinedBonus;

      keywordMatches.push({
        iso: isoInfo.iso,
        label: isoInfo.label,
        description: isoInfo.description,
        score,
        matchedKeywords: uniqueKeywords,
      });
    }
  }

  // 2. ISO 카탈로그 검색 기능 활용
  const searchMatches = searchIsoCodes(productName);
  for (const isoInfo of searchMatches) {
    const existing = keywordMatches.find((m) => m.iso === isoInfo.iso);
    if (!existing) {
      keywordMatches.push({
        iso: isoInfo.iso,
        label: isoInfo.label,
        description: isoInfo.description,
        score: 0.5, // 검색 매칭은 기본 점수
        matchedKeywords: [],
      });
    } else {
      // 검색 매칭이 있으면 점수 보너스
      existing.score += 0.3;
    }
  }

  // 3. AI 기반 추론 (선택적, 시간이 걸릴 수 있음)
  let aiMatches: Array<{
    iso: string;
    label: string;
    description: string;
    score: number;
    matchedKeywords?: string[];
  }> = [];

  try {
    const aiResult = await inferIsoCodeFromProduct({
      name: body.productName,
      description: "",
    });

    if (aiResult) {
      // 메인 ISO 코드
      const isoInfo = iso9999Catalog.find(
        (item) =>
          item.iso === aiResult.isoCode ||
          item.iso.replace(/\s/g, "") === aiResult.isoCode.replace(/\s/g, "")
      );

      if (isoInfo) {
        const existing = keywordMatches.find((m) => m.iso === isoInfo.iso);
        if (existing) {
          // AI 추론이 있으면 점수 대폭 증가
          existing.score += aiResult.confidence * 2;
        } else {
          aiMatches.push({
            iso: isoInfo.iso,
            label: isoInfo.label,
            description: isoInfo.description,
            score: aiResult.confidence * 1.5,
            matchedKeywords: [],
          });
        }
      }

      // 대안 ISO 코드들
      if (aiResult.alternativeCodes && aiResult.alternativeCodes.length > 0) {
        for (const altCode of aiResult.alternativeCodes) {
          const altIsoInfo = iso9999Catalog.find(
            (item) =>
              item.iso === altCode.isoCode ||
              item.iso.replace(/\s/g, "") === altCode.isoCode.replace(/\s/g, "")
          );

          if (altIsoInfo) {
            const existing = keywordMatches.find(
              (m) => m.iso === altIsoInfo.iso
            );
            if (existing) {
              existing.score += altCode.confidence * 1.5;
            } else {
              const existingAi = aiMatches.find(
                (m) => m.iso === altIsoInfo.iso
              );
              if (!existingAi) {
                aiMatches.push({
                  iso: altIsoInfo.iso,
                  label: altIsoInfo.label,
                  description: altIsoInfo.description,
                  score: altCode.confidence * 1.0,
                  matchedKeywords: [],
                });
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[ISO Suggest] AI inference error:", error);
    // AI 실패해도 계속 진행
  }

  // 모든 매칭 통합
  const allMatches = [...keywordMatches, ...aiMatches];

  // 중복 제거 및 점수 통합
  const matchMap = new Map<string, (typeof keywordMatches)[0]>();
  for (const match of allMatches) {
    const existing = matchMap.get(match.iso);
    if (existing) {
      const mergedKeywords = [
        ...new Set([
          ...(existing.matchedKeywords ?? []),
          ...(match.matchedKeywords ?? []),
        ]),
      ];

      if (match.score > existing.score) {
        matchMap.set(match.iso, {
          ...match,
          matchedKeywords: mergedKeywords,
        });
      } else {
        // 점수는 유지하되 키워드 정보는 병합
        matchMap.set(match.iso, {
          ...existing,
          matchedKeywords: mergedKeywords,
        });
      }
    } else {
      matchMap.set(match.iso, match);
    }
  }

  // 점수 순으로 정렬 (높은 순)
  const sortedMatches = Array.from(matchMap.values()).sort(
    (a, b) => b.score - a.score
  );

  // 상위 5개만 반환
  const suggestions = sortedMatches
    .slice(0, 5)
    .map(({ matchedKeywords, ...rest }) => rest);

  return NextResponse.json({
    suggestions,
    productName: body.productName,
    totalMatches: sortedMatches.length,
  });
}
