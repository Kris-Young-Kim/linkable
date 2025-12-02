#!/usr/bin/env tsx
/**
 * ICF 매칭 로직 QA 테스트 스크립트
 * 
 * 사용법:
 *   tsx scripts/tests/icf-matching.test.ts
 * 
 * 이 스크립트는 다음을 테스트합니다:
 * 1. ICF Validator 키워드 규칙 적용 테스트
 * 2. Keyword Inference ISO 코드 매칭 테스트
 * 3. ISO Mapping ICF → ISO 변환 테스트
 * 4. 통합 시나리오 테스트
 */

import { enforceIcfConsistency } from "@/core/assessment/icf-validator"
import { appendKeywordIsoMatches } from "@/core/matching/keyword-inference"
import { getIsoMatches } from "@/core/matching/iso-mapping"
import type { ParsedAnalysis } from "@/core/assessment/parser"
import type { IsoMatch } from "@/core/matching/iso-mapping"

// 테스트 결과 타입
type TestResult = {
  name: string
  passed: boolean
  error?: string
  details?: any
}

const testResults: TestResult[] = []

// 테스트 헬퍼 함수
function assert(condition: boolean, message: string, details?: any): void {
  if (condition) {
    testResults.push({ name: message, passed: true, details })
    console.log(`✅ ${message}`)
  } else {
    testResults.push({ name: message, passed: false, error: "Assertion failed", details })
    console.error(`❌ ${message}`)
  }
}

function assertIncludes<T>(array: T[], item: T, message: string): void {
  const passed = array.includes(item)
  assert(passed, message, { array, item, found: passed })
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  const passed = actual === expected
  assert(passed, message, { actual, expected })
}

// 테스트 케이스 생성 헬퍼
function createMockAnalysis(icfCodes: { b?: string[]; d?: string[]; e?: string[] }): ParsedAnalysis {
  return {
    icf_analysis: {
      b: icfCodes.b || [],
      d: icfCodes.d || [],
      e: icfCodes.e || [],
    },
    normalizedCodes: [
      ...(icfCodes.b || []),
      ...(icfCodes.d || []),
      ...(icfCodes.e || []),
    ],
    problem_description: "",
    suggested_questions: [],
  }
}

/**
 * 테스트 1: ICF Validator - 시각 관련 키워드 규칙
 */
function testVisionKeywordRules() {
  console.log("\n📋 테스트 1: ICF Validator - 시각 관련 키워드 규칙")
  console.log("-".repeat(60))

  const testCases = [
    {
      message: "시각이 나빠서 책을 읽기 어려워요",
      expectedCodes: { b: ["b210", "b215"], d: ["d110", "d166"], e: ["e240"] },
    },
    {
      message: "저시력으로 인해 글씨가 안보여요",
      expectedCodes: { b: ["b210"], d: ["d110", "d166"], e: ["e240", "e150"] },
    },
    {
      message: "밤에 안보여서 불편해요",
      expectedCodes: { b: ["b210"], d: ["d110"], e: ["e240"] },
    },
  ]

  for (const testCase of testCases) {
    const analysis = createMockAnalysis({})
    const result = enforceIcfConsistency(testCase.message, analysis)

    if (result.updated && result.analysis) {
      for (const [category, codes] of Object.entries(testCase.expectedCodes)) {
        for (const code of codes) {
          assertIncludes(
            result.analysis.icf_analysis[category as "b" | "d" | "e"],
            code,
            `시각 키워드 "${testCase.message}" → ${category}.${code} 추가 확인`
          )
        }
      }
    } else {
      assert(false, `시각 키워드 "${testCase.message}" → ICF 코드 추가 실패`)
    }
  }
}

/**
 * 테스트 2: ICF Validator - 의사소통 관련 키워드 규칙
 */
function testCommunicationKeywordRules() {
  console.log("\n📋 테스트 2: ICF Validator - 의사소통 관련 키워드 규칙")
  console.log("-".repeat(60))

  const testCases = [
    {
      message: "말하기가 어려워서 대화가 힘들어요",
      expectedCodes: { b: ["b240"], d: ["d320", "d330"], e: ["e125"] },
    },
    {
      message: "의사소통이 어려워요",
      expectedCodes: { d: ["d310", "d320", "d330", "d350", "d360"], e: ["e125"] },
    },
    {
      message: "말을 이해하기 어려워요",
      expectedCodes: { b: ["b167"], d: ["d310", "d350"], e: ["e125"] },
    },
  ]

  for (const testCase of testCases) {
    const analysis = createMockAnalysis({})
    const result = enforceIcfConsistency(testCase.message, analysis)

    if (result.updated && result.analysis) {
      for (const [category, codes] of Object.entries(testCase.expectedCodes)) {
        for (const code of codes) {
          assertIncludes(
            result.analysis.icf_analysis[category as "b" | "d" | "e"],
            code,
            `의사소통 키워드 "${testCase.message}" → ${category}.${code} 추가 확인`
          )
        }
      }
    } else {
      assert(false, `의사소통 키워드 "${testCase.message}" → ICF 코드 추가 실패`)
    }
  }
}

/**
 * 테스트 3: ICF Validator - 인지 관련 키워드 규칙
 */
function testCognitionKeywordRules() {
  console.log("\n📋 테스트 3: ICF Validator - 인지 관련 키워드 규칙")
  console.log("-".repeat(60))

  const testCases = [
    {
      message: "기억력이 나빠서 잊어버려요",
      expectedCodes: { b: ["b144"], d: ["d160", "d163"], e: ["e130", "e150"] },
    },
    {
      message: "집중이 안되어서 일하기 어려워요",
      expectedCodes: { b: ["b140"], d: ["d160"] },
    },
    {
      message: "생각하기가 어려워서 판단을 못해요",
      expectedCodes: { b: ["b160", "b164"], d: ["d175", "d177"], e: ["e130"] },
    },
  ]

  for (const testCase of testCases) {
    const analysis = createMockAnalysis({})
    const result = enforceIcfConsistency(testCase.message, analysis)

    if (result.updated && result.analysis) {
      for (const [category, codes] of Object.entries(testCase.expectedCodes)) {
        for (const code of codes) {
          assertIncludes(
            result.analysis.icf_analysis[category as "b" | "d" | "e"],
            code,
            `인지 키워드 "${testCase.message}" → ${category}.${code} 추가 확인`
          )
        }
      }
    } else {
      assert(false, `인지 키워드 "${testCase.message}" → ICF 코드 추가 실패`)
    }
  }
}

/**
 * 테스트 4: ICF Validator - 자세 관련 키워드 규칙
 */
function testPostureKeywordRules() {
  console.log("\n📋 테스트 4: ICF Validator - 자세 관련 키워드 규칙")
  console.log("-".repeat(60))

  const testCases = [
    {
      message: "앉기 어려워서 불편해요",
      expectedCodes: { b: ["b730"], d: ["d410", "d415"], e: ["e110", "e120"] },
    },
    {
      message: "균형이 안잡혀서 넘어질 것 같아요",
      expectedCodes: { b: ["b235", "b760"], d: ["d415", "d450"], e: ["e120", "e1818"] },
    },
    {
      message: "자세가 나빠서 아파요",
      expectedCodes: { b: ["b730", "b280"], d: ["d410", "d415", "d420"], e: ["e110", "e120"] },
    },
  ]

  for (const testCase of testCases) {
    const analysis = createMockAnalysis({})
    const result = enforceIcfConsistency(testCase.message, analysis)

    if (result.updated && result.analysis) {
      for (const [category, codes] of Object.entries(testCase.expectedCodes)) {
        for (const code of codes) {
          assertIncludes(
            result.analysis.icf_analysis[category as "b" | "d" | "e"],
            code,
            `자세 키워드 "${testCase.message}" → ${category}.${code} 추가 확인`
          )
        }
      }
    } else {
      assert(false, `자세 키워드 "${testCase.message}" → ICF 코드 추가 실패`)
    }
  }
}

/**
 * 테스트 5: Keyword Inference - ISO 코드 매칭
 */
function testKeywordIsoMatching() {
  console.log("\n📋 테스트 5: Keyword Inference - ISO 코드 매칭")
  console.log("-".repeat(60))

  const testCases = [
    {
      text: "시각 보조기기가 필요해요",
      icfCodes: ["b210", "d110"],
      expectedIso: "22 03",
    },
    {
      text: "의사소통 보조기기를 찾고 있어요",
      icfCodes: ["d310", "d320"],
      expectedIso: "22 30",
    },
    {
      text: "인지 훈련 보조기기를 원해요",
      icfCodes: ["b140", "b144"],
      expectedIso: "04 03",
    },
    {
      text: "균형 보조기기가 필요해요",
      icfCodes: ["b235", "d415"],
      expectedIso: "12 08",
    },
  ]

  for (const testCase of testCases) {
    const existingMatches: IsoMatch[] = []
    const result = appendKeywordIsoMatches({
      text: testCase.text,
      icfCodes: testCase.icfCodes,
      matches: existingMatches,
    })

    const matchedIso = result.find((match) => match.isoCode === testCase.expectedIso)
    assert(
      matchedIso !== undefined,
      `키워드 "${testCase.text}" → ISO ${testCase.expectedIso} 매칭 확인`,
      { result, expectedIso: testCase.expectedIso }
    )
  }
}

/**
 * 테스트 6: ISO Mapping - ICF → ISO 변환
 */
function testIsoMapping() {
  console.log("\n📋 테스트 6: ISO Mapping - ICF → ISO 변환")
  console.log("-".repeat(60))

  const testCases = [
    {
      icfCodes: ["b210", "d110"],
      expectedIso: "22 03",
      description: "시각 보조기기",
    },
    {
      icfCodes: ["d450", "e120"],
      expectedIso: "18 30",
      description: "수직 접근성 보조기기",
    },
    {
      icfCodes: ["b765", "d550"],
      expectedIso: "15 09",
      description: "식사 및 음주 보조기기",
    },
    {
      icfCodes: ["b144", "d160"],
      expectedIso: "04 03",
      description: "인지 훈련 보조기기",
    },
  ]

  for (const testCase of testCases) {
    const result = getIsoMatches(testCase.icfCodes)
    const matchedIso = result.find((match) => match.isoCode === testCase.expectedIso)

    assert(
      matchedIso !== undefined,
      `ICF ${testCase.icfCodes.join(", ")} → ISO ${testCase.expectedIso} (${testCase.description})`,
      { result, expectedIso: testCase.expectedIso }
    )

    if (matchedIso) {
      assert(
        matchedIso.score > 0,
        `ISO 매칭 점수 확인 (${testCase.expectedIso}: ${matchedIso.score})`,
        { score: matchedIso.score }
      )
    }
  }
}

/**
 * 테스트 7: 통합 시나리오 - 전체 플로우
 */
function testIntegrationScenario() {
  console.log("\n📋 테스트 7: 통합 시나리오 - 전체 플로우")
  console.log("-".repeat(60))

  // 시나리오: 시각 장애 사용자가 책 읽기 어려움
  const userMessage = "시각이 나빠서 책을 읽기 어려워요. 확대경이나 돋보기가 필요해요."

  // 1단계: ICF Validator 적용
  const initialAnalysis = createMockAnalysis({})
  const validatedResult = enforceIcfConsistency(userMessage, initialAnalysis)

  assert(
    validatedResult.updated && validatedResult.analysis !== null,
    "통합 시나리오: ICF Validator 적용 성공",
    { appliedRules: validatedResult.appliedRules }
  )

  if (!validatedResult.analysis) {
    assert(false, "통합 시나리오: ICF 분석 결과 없음")
    return
  }

  // 2단계: ISO Mapping 적용
  const allIcfCodes = [
    ...validatedResult.analysis.icf_analysis.b,
    ...validatedResult.analysis.icf_analysis.d,
    ...validatedResult.analysis.icf_analysis.e,
  ]

  const isoMatches = getIsoMatches(allIcfCodes)
  assert(isoMatches.length > 0, "통합 시나리오: ISO 매칭 결과 존재", { isoMatches })

  // 3단계: Keyword Inference 적용
  const keywordMatches = appendKeywordIsoMatches({
    text: userMessage,
    icfCodes: allIcfCodes,
    matches: isoMatches,
  })

  assert(
    keywordMatches.length >= isoMatches.length,
    "통합 시나리오: Keyword Inference 적용 후 매칭 수 증가",
    { before: isoMatches.length, after: keywordMatches.length }
  )

  // 4단계: 시각 보조기기 ISO 코드 확인
  const visionIso = keywordMatches.find((match) => match.isoCode === "22 03")
  assert(
    visionIso !== undefined,
    "통합 시나리오: 시각 보조기기 ISO 22 03 매칭 확인",
    { visionIso }
  )
}

/**
 * 결과 요약 출력
 */
function printSummary() {
  console.log("\n" + "=".repeat(60))
  console.log("📊 테스트 결과 요약")
  console.log("=".repeat(60))

  const passed = testResults.filter((r) => r.passed).length
  const failed = testResults.filter((r) => !r.passed).length
  const total = testResults.length

  console.log(`총 테스트: ${total}`)
  console.log(`✅ 통과: ${passed}`)
  console.log(`❌ 실패: ${failed}`)
  console.log(`정확도: ${((passed / total) * 100).toFixed(1)}%`)

  if (failed > 0) {
    console.log("\n❌ 실패한 테스트:")
    testResults
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}`)
        if (r.error) {
          console.log(`    오류: ${r.error}`)
        }
        if (r.details) {
          console.log(`    상세: ${JSON.stringify(r.details, null, 2)}`)
        }
      })
  }

  console.log("\n" + "=".repeat(60))

  if (failed === 0) {
    console.log("🎉 모든 테스트 통과!")
    process.exit(0)
  } else {
    console.log("⚠️  일부 테스트 실패")
    process.exit(1)
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log("🚀 ICF 매칭 로직 QA 테스트 시작")
  console.log("=".repeat(60))

  try {
    // 테스트 실행
    testVisionKeywordRules()
    testCommunicationKeywordRules()
    testCognitionKeywordRules()
    testPostureKeywordRules()
    testKeywordIsoMatching()
    testIsoMapping()
    testIntegrationScenario()

    // 결과 요약
    printSummary()
  } catch (error) {
    console.error("\n❌ 테스트 실행 중 오류 발생:")
    console.error(error)
    process.exit(1)
  }
}

// 스크립트 실행
if (require.main === module) {
  main()
}

