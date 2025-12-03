import { NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/auth/verify-admin"
import { isoMappingTable } from "@/core/matching/iso-mapping"

const mapReasonToStatus = (reason: "not_authenticated" | "insufficient_permissions" | "error") => {
  if (reason === "not_authenticated") return 401
  if (reason === "insufficient_permissions") return 403
  return 500
}

/**
 * 상품명 기반 ISO 코드 자동 추천 API
 */
export async function POST(request: Request) {
  const access = await verifyAdminAccess()

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: mapReasonToStatus(access.reason) },
    )
  }

  const body = (await request.json().catch(() => ({}))) as {
    productName?: string
  }

  if (!body.productName || typeof body.productName !== "string") {
    return NextResponse.json({ error: "상품명이 필요합니다." }, { status: 400 })
  }

  const productName = body.productName.toLowerCase().trim()

  // 키워드 매칭 규칙
  const keywordRules: Array<{
    keywords: string[]
    iso: string
    label: string
    description: string
    score: number
  }> = []

  // isoMappingTable에서 키워드 추출 및 매칭
  for (const rule of isoMappingTable) {
    const labelLower = rule.label.toLowerCase()
    const descLower = rule.description.toLowerCase()

    // 라벨과 설명에서 키워드 추출
    const keywords: string[] = []
    
    // 일반적인 키워드 매칭
    if (labelLower.includes("식사") || labelLower.includes("식기") || labelLower.includes("음주")) {
      keywords.push("식기", "식사", "숟가락", "포크", "컵", "음주")
    }
    if (labelLower.includes("휠체어")) {
      keywords.push("휠체어", "휠체", "wheelchair")
      if (labelLower.includes("전동")) {
        keywords.push("전동", "전기", "모터")
      } else {
        keywords.push("수동")
      }
    }
    if (labelLower.includes("보행") || labelLower.includes("워커") || labelLower.includes("지팡이")) {
      keywords.push("보행기", "워커", "지팡이", "목발", "보행보조")
    }
    if (labelLower.includes("경사로") || labelLower.includes("승강기") || labelLower.includes("접근성")) {
      keywords.push("경사로", "승강기", "램프", "접근성")
    }
    if (labelLower.includes("청각") || labelLower.includes("보청기")) {
      keywords.push("청각", "보청기", "난청", "청력")
    }
    if (labelLower.includes("시각") || labelLower.includes("확대경") || labelLower.includes("돋보기")) {
      keywords.push("시각", "확대경", "돋보기", "저시력", "시력")
    }
    if (labelLower.includes("의사소통") || labelLower.includes("aac")) {
      keywords.push("의사소통", "aac", "대화", "언어")
    }
    if (labelLower.includes("체위") || labelLower.includes("리프트")) {
      keywords.push("체위", "리프트", "앉기", "서기")
    }
    if (labelLower.includes("손잡이") || labelLower.includes("그랩바")) {
      keywords.push("손잡이", "그랩바", "핸드레일")
    }
    if (labelLower.includes("목욕") || labelLower.includes("샤워") || labelLower.includes("세면")) {
      keywords.push("목욕", "샤워", "세면", "욕조")
    }
    if (labelLower.includes("옷") || labelLower.includes("착의")) {
      keywords.push("옷", "착의", "의복")
    }
    if (labelLower.includes("청소")) {
      keywords.push("청소", "청소기", "청소도구")
    }
    if (labelLower.includes("요리") || labelLower.includes("음식 준비")) {
      keywords.push("요리", "음식", "조리")
    }

    if (keywords.length > 0) {
      keywordRules.push({
        keywords,
        iso: rule.iso,
        label: rule.label,
        description: rule.description,
        score: 0,
      })
    }
  }

  // 상품명과 키워드 매칭
  const matches: Array<{
    iso: string
    label: string
    description: string
    score: number
    matchedKeywords: string[]
  }> = []

  for (const rule of keywordRules) {
    const matchedKeywords = rule.keywords.filter((keyword) =>
      productName.includes(keyword.toLowerCase())
    )

    if (matchedKeywords.length > 0) {
      // 매칭된 키워드 수와 길이에 따라 점수 계산
      const score = matchedKeywords.length * 0.3 + (matchedKeywords.join("").length / productName.length) * 0.7

      const existingMatch = matches.find((m) => m.iso === rule.iso)
      if (existingMatch) {
        // 이미 있는 경우 점수 업데이트 (더 높은 점수로)
        if (score > existingMatch.score) {
          existingMatch.score = score
          existingMatch.matchedKeywords = [
            ...new Set([...existingMatch.matchedKeywords, ...matchedKeywords]),
          ]
        }
      } else {
        matches.push({
          iso: rule.iso,
          label: rule.label,
          description: rule.description,
          score,
          matchedKeywords,
        })
      }
    }
  }

  // 점수 순으로 정렬 (높은 순)
  matches.sort((a, b) => b.score - a.score)

  // 상위 5개만 반환
  const suggestions = matches.slice(0, 5).map(({ matchedKeywords, ...rest }) => rest)

  return NextResponse.json({
    suggestions,
    productName: body.productName,
  })
}

