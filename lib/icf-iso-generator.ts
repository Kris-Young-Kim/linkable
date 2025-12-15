/**
 * AI 기반 ISO 매핑 힌트 생성 유틸리티
 * 누적 데이터를 활용하여 ICF 코드에 대한 ISO 9999 매핑 힌트를 자동 생성합니다.
 */

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { callGemini } from "@/lib/gemini"
import { logEvent } from "./logging"
import { getIsoMatches } from "@/core/matching/iso-mapping"

interface IcfCodeStatistics {
  icf_code: string
  category: "b" | "d" | "e"
  associated_iso_codes?: string[]
  associated_keywords?: string[]
  usage_by_source?: Record<string, number>
}

/**
 * ICF 코드에 대한 ISO 매핑 힌트를 생성합니다.
 * 
 * 1. 사용 통계에서 연관 ISO 코드 추출
 * 2. AI를 활용한 의미론적 매핑
 * 3. 전문가 지식 그래프 기반 추론
 * 4. 결과 통합 및 우선순위 정렬
 */
export async function generateIsoHintsForIcfCode(
  icfCode: string,
  statistics?: IcfCodeStatistics
): Promise<string[]> {
  const code = icfCode.toUpperCase()
  const category = code[0]?.toLowerCase() as "b" | "d" | "e"

  if (!category || (category !== "b" && category !== "d" && category !== "e")) {
    return []
  }

  const hints: Set<string> = new Set()

  // 1. 사용 통계에서 연관 ISO 코드 추출
  if (statistics?.associated_iso_codes && statistics.associated_iso_codes.length > 0) {
    statistics.associated_iso_codes.forEach((iso) => hints.add(iso))
  }

  // 2. 기존 ISO 매핑 규칙에서 추론
  const existingMatches = getIsoMatches([code])
  existingMatches.forEach((match) => hints.add(match.isoCode))

  // 3. AI 기반 의미론적 매핑
  try {
    const aiHints = await generateIsoHintsWithAI(code, category, statistics)
    aiHints.forEach((iso) => hints.add(iso))
  } catch (error) {
    console.error(`[ICF ISO Generator] AI generation failed for ${code}:`, error)
    // AI 실패해도 계속 진행
  }

  // 4. 데이터베이스에서 유사한 ICF 코드의 ISO 매핑 조회
  try {
    const similarHints = await findSimilarIcfIsoMappings(code, category)
    similarHints.forEach((iso) => hints.add(iso))
  } catch (error) {
    console.error(`[ICF ISO Generator] Similar mapping lookup failed for ${code}:`, error)
    // 조회 실패해도 계속 진행
  }

  return Array.from(hints).sort()
}

/**
 * AI를 활용한 의미론적 ISO 매핑 힌트 생성
 */
async function generateIsoHintsWithAI(
  icfCode: string,
  category: "b" | "d" | "e",
  statistics?: IcfCodeStatistics
): Promise<string[]> {
  const categoryNames = {
    b: "신체 기능",
    d: "활동 및 참여",
    e: "환경 요소",
  }

  const prompt = `ICF 코드 ${icfCode} (${categoryNames[category]})에 대한 ISO 9999:2022 보조기기 분류 코드 매핑 힌트를 생성해주세요.

ICF 코드 정보:
- 코드: ${icfCode}
- 카테고리: ${categoryNames[category]}

${statistics?.associated_keywords && statistics.associated_keywords.length > 0
    ? `관련 키워드: ${statistics.associated_keywords.join(", ")}`
    : ""}

${statistics?.associated_iso_codes && statistics.associated_iso_codes.length > 0
    ? `기존 연관 ISO 코드: ${statistics.associated_iso_codes.join(", ")}`
    : ""}

ISO 9999:2022 표준에 따라 이 ICF 코드와 가장 관련이 높은 보조기기 분류 코드를 추천해주세요.
응답은 JSON 형식으로, isoCodes 배열에 ISO 코드만 포함해주세요 (예: "12 22", "18 30").
최대 5개까지 추천해주세요.

응답 형식:
{
  "isoCodes": ["12 22", "18 30"]
}`

  try {
    const response = await callGemini({
      prompt,
      temperature: 0.3, // 낮은 온도로 일관성 있는 응답
    })

    // JSON 파싱
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed.isoCodes)) {
        return parsed.isoCodes.filter(
          (iso: string) => typeof iso === "string" && iso.trim().length > 0
        )
      }
    }

    // JSON 파싱 실패 시 텍스트에서 ISO 코드 추출
    const isoCodePattern = /\b\d{2}\s\d{2}(?:\s\d{2})?\b/g
    const matches = response.match(isoCodePattern)
    return matches ? Array.from(new Set(matches)) : []
  } catch (error) {
    console.error("[ICF ISO Generator] AI call error:", error)
    return []
  }
}

/**
 * 유사한 ICF 코드의 ISO 매핑 조회
 */
async function findSimilarIcfIsoMappings(
  icfCode: string,
  category: "b" | "d" | "e"
): Promise<string[]> {
  const supabase = getSupabaseServerClient()

  // 같은 카테고리의 다른 ICF 코드 중 ISO 매핑이 있는 코드 조회
  const { data: similarCodes } = await supabase
    .from("icf_code_statistics")
    .select("icf_code, associated_iso_codes")
    .eq("category", category)
    .not("associated_iso_codes", "is", null)
    .neq("icf_code", icfCode.toUpperCase())
    .limit(10)

  const hints: Set<string> = new Set()

  if (similarCodes) {
    similarCodes.forEach((item) => {
      if (item.associated_iso_codes && Array.isArray(item.associated_iso_codes)) {
        item.associated_iso_codes.forEach((iso: string) => hints.add(iso))
      }
    })
  }

  return Array.from(hints)
}

