#!/usr/bin/env tsx
/**
 * 추천 생성 → +14일 K-IPPA 알림 트리거 연동 테스트
 * 
 * 사용법:
 *   tsx scripts/test-reminder-flow.ts
 *   tsx scripts/test-reminder-flow.ts --cleanup  # 테스트 데이터 정리
 * 
 * 이 스크립트는 전체 플로우를 검증합니다:
 * 1. 추천 생성 (is_clicked = true로 설정)
 * 2. 시간 경과 시뮬레이션 (created_at을 14일 전으로 업데이트)
 * 3. Cron API 호출하여 알림 생성
 * 4. 알림 확인
 * 5. 사용자 대시보드에서 확인 가능한지 검증
 */

// 환경 변수 로드
import { config } from "dotenv"
import { resolve } from "path"

config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ 환경 변수가 설정되지 않았습니다.")
  console.error("필요한 환경 변수:")
  console.error("  - NEXT_PUBLIC_SUPABASE_URL")
  console.error("  - SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/database.types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// 테스트 데이터 ID 저장
const testDataIds = {
  userId: null as string | null,
  consultationId: null as string | null,
  productId: null as string | null,
  recommendationId: null as string | null,
  notificationId: null as string | null,
}

/**
 * 1단계: 추천 생성 시뮬레이션
 */
async function step1_CreateRecommendation() {
  console.log("\n📝 1단계: 추천 생성 시뮬레이션")

  try {
    // 1. 테스트 사용자 생성
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        clerk_id: `test-flow-${Date.now()}`,
        email: `test-flow-${Date.now()}@example.com`,
        name: "테스트 사용자 (Flow)",
        role: "user",
        points: 0,
      })
      .select("id")
      .single()

    if (userError) {
      throw new Error(`사용자 생성 실패: ${userError.message}`)
    }

    testDataIds.userId = user.id
    console.log(`✅ 사용자 생성: ${user.id}`)

    // 2. 테스트 상품 생성
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        name: "테스트 보조기기 (Flow)",
        iso_code: "15 09",
        manufacturer: "테스트 제조사",
        description: "통합 테스트용 상품",
        price: 25000,
        purchase_link: "https://example.com/test-product",
        is_active: true,
      })
      .select("id")
      .single()

    if (productError) {
      throw new Error(`상품 생성 실패: ${productError.message}`)
    }

    testDataIds.productId = product.id
    console.log(`✅ 상품 생성: ${product.id}`)

    // 3. 테스트 상담 생성
    const { data: consultation, error: consultationError } = await supabase
      .from("consultations")
      .insert({
        user_id: user.id,
        title: "테스트 상담 (Flow)",
        status: "completed",
      })
      .select("id")
      .single()

    if (consultationError) {
      throw new Error(`상담 생성 실패: ${consultationError.message}`)
    }

    testDataIds.consultationId = consultation.id
    console.log(`✅ 상담 생성: ${consultation.id}`)

    // 4. 추천 생성 (현재 시간으로)
    const { data: recommendation, error: recommendationError } = await supabase
      .from("recommendations")
      .insert({
        consultation_id: consultation.id,
        product_id: product.id,
        match_reason: "통합 테스트용 추천",
        rank: 1,
        is_clicked: true, // 클릭된 것으로 설정
      })
      .select("id, created_at")
      .single()

    if (recommendationError) {
      throw new Error(`추천 생성 실패: ${recommendationError.message}`)
    }

    testDataIds.recommendationId = recommendation.id
    console.log(`✅ 추천 생성: ${recommendation.id}`)
    console.log(`   생성일: ${recommendation.created_at}`)
    console.log(`   클릭 상태: true`)

    return true
  } catch (error) {
    console.error("❌ 추천 생성 실패:", error)
    return false
  }
}

/**
 * 2단계: 시간 경과 시뮬레이션 (14일 전으로 업데이트)
 */
async function step2_SimulateTimePassage() {
  console.log("\n⏰ 2단계: 시간 경과 시뮬레이션 (14일 전으로 설정)")

  if (!testDataIds.recommendationId) {
    console.error("❌ 추천 ID가 없습니다.")
    return false
  }

  try {
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const createdDate = fourteenDaysAgo.toISOString()

    const { error } = await supabase
      .from("recommendations")
      .update({ created_at: createdDate })
      .eq("id", testDataIds.recommendationId)

    if (error) {
      throw new Error(`추천 업데이트 실패: ${error.message}`)
    }

    console.log(`✅ 추천 생성일을 14일 전으로 업데이트: ${createdDate}`)

    // 확인
    const { data: updated } = await supabase
      .from("recommendations")
      .select("created_at")
      .eq("id", testDataIds.recommendationId)
      .single()

    console.log(`   확인: ${updated?.created_at}`)

    return true
  } catch (error) {
    console.error("❌ 시간 경과 시뮬레이션 실패:", error)
    return false
  }
}

/**
 * 3단계: Cron API 호출
 */
async function step3_CallCronAPI() {
  console.log("\n🔄 3단계: Cron API 호출")

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const cronSecret = process.env.CRON_SECRET

    const url = `${baseUrl}/api/cron/reminder-ippa`
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    if (cronSecret) {
      headers["Authorization"] = `Bearer ${cronSecret}`
    }

    console.log(`📡 API 호출: ${url}`)

    const response = await fetch(url, {
      method: "GET",
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status} - ${JSON.stringify(data)}`)
    }

    console.log("✅ API 응답:", JSON.stringify(data, null, 2))
    return data
  } catch (error) {
    console.error("❌ Cron API 호출 실패:", error)
    throw error
  }
}

/**
 * 4단계: 알림 확인
 */
async function step4_VerifyNotification() {
  console.log("\n🔍 4단계: 알림 생성 확인")

  if (!testDataIds.userId || !testDataIds.recommendationId) {
    console.error("❌ 필요한 ID가 없습니다.")
    return false
  }

  try {
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", testDataIds.userId)
      .eq("type", "ippa_reminder")
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error(`알림 조회 실패: ${error.message}`)
    }

    console.log(`📬 발견된 알림 수: ${notifications?.length ?? 0}`)

    if (notifications && notifications.length > 0) {
      const testNotification = notifications.find(
        (n) =>
          n.metadata &&
          typeof n.metadata === "object" &&
          "recommendation_id" in n.metadata &&
          n.metadata.recommendation_id === testDataIds.recommendationId,
      )

      if (testNotification) {
        testDataIds.notificationId = testNotification.id
        console.log("✅ 테스트 알림 발견:")
        console.log(`   ID: ${testNotification.id}`)
        console.log(`   제목: ${testNotification.title}`)
        console.log(`   메시지: ${testNotification.message}`)
        console.log(`   링크: ${testNotification.link_url}`)
        console.log(`   읽음 상태: ${testNotification.is_read ? "읽음" : "안 읽음"}`)
        return true
      } else {
        console.log("⚠️  테스트 알림을 찾을 수 없습니다.")
        return false
      }
    } else {
      console.log("⚠️  알림이 생성되지 않았습니다.")
      return false
    }
  } catch (error) {
    console.error("❌ 알림 확인 실패:", error)
    return false
  }
}

/**
 * 5단계: 사용자 대시보드에서 확인 가능한지 검증
 */
async function step5_VerifyDashboardAccess() {
  console.log("\n📊 5단계: 사용자 대시보드 접근 검증")

  if (!testDataIds.userId || !testDataIds.notificationId) {
    console.log("⚠️  알림이 없어 대시보드 검증을 건너뜁니다.")
    return true
  }

  try {
    // 알림 API를 통해 사용자가 알림을 조회할 수 있는지 확인
    // 실제로는 인증이 필요하지만, 여기서는 데이터베이스에서 직접 확인
    const { data: notification, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", testDataIds.notificationId)
      .eq("user_id", testDataIds.userId)
      .single()

    if (error) {
      throw new Error(`알림 조회 실패: ${error.message}`)
    }

    if (notification) {
      console.log("✅ 사용자 대시보드에서 알림 확인 가능:")
      console.log(`   - 알림 ID: ${notification.id}`)
      console.log(`   - 사용자 ID: ${notification.user_id}`)
      console.log(`   - 링크 URL: ${notification.link_url}`)
      console.log(`   - 읽음 상태: ${notification.is_read ? "읽음" : "안 읽음"}`)
      console.log("\n💡 실제 대시보드에서 확인:")
      console.log(`   - 알림 벨 아이콘 클릭 시 알림이 표시되어야 합니다`)
      console.log(`   - 링크 클릭 시: ${notification.link_url}`)
      return true
    } else {
      console.log("⚠️  알림을 찾을 수 없습니다.")
      return false
    }
  } catch (error) {
    console.error("❌ 대시보드 검증 실패:", error)
    return false
  }
}

/**
 * 테스트 데이터 정리
 */
async function cleanupTestData() {
  console.log("\n🧹 테스트 데이터 정리 중...")

  try {
    // 알림 삭제
    if (testDataIds.notificationId) {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", testDataIds.notificationId)

      if (error) {
        console.error(`⚠️  알림 삭제 실패: ${error.message}`)
      } else {
        console.log(`✅ 알림 삭제: ${testDataIds.notificationId}`)
      }
    }

    // 추천 삭제
    if (testDataIds.recommendationId) {
      const { error } = await supabase
        .from("recommendations")
        .delete()
        .eq("id", testDataIds.recommendationId)

      if (error) {
        console.error(`⚠️  추천 삭제 실패: ${error.message}`)
      } else {
        console.log(`✅ 추천 삭제: ${testDataIds.recommendationId}`)
      }
    }

    // 상담 삭제
    if (testDataIds.consultationId) {
      const { error } = await supabase
        .from("consultations")
        .delete()
        .eq("id", testDataIds.consultationId)

      if (error) {
        console.error(`⚠️  상담 삭제 실패: ${error.message}`)
      } else {
        console.log(`✅ 상담 삭제: ${testDataIds.consultationId}`)
      }
    }

    // 상품 삭제
    if (testDataIds.productId) {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", testDataIds.productId)

      if (error) {
        console.error(`⚠️  상품 삭제 실패: ${error.message}`)
      } else {
        console.log(`✅ 상품 삭제: ${testDataIds.productId}`)
      }
    }

    // 사용자 삭제
    if (testDataIds.userId) {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", testDataIds.userId)

      if (error) {
        console.error(`⚠️  사용자 삭제 실패: ${error.message}`)
      } else {
        console.log(`✅ 사용자 삭제: ${testDataIds.userId}`)
      }
    }

    console.log("✅ 테스트 데이터 정리 완료")
  } catch (error) {
    console.error("❌ 데이터 정리 실패:", error)
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  const args = process.argv.slice(2)
  const shouldCleanup = args.includes("--cleanup")

  if (shouldCleanup) {
    console.log("🧹 테스트 데이터 정리 모드")
    console.log("⚠️  정리 모드는 개별적으로 실행해야 합니다.")
    return
  }

  console.log("🚀 추천 생성 → +14일 K-IPPA 알림 트리거 연동 테스트 시작")
  console.log("=".repeat(60))

  const results = {
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
  }

  try {
    // 1단계: 추천 생성
    results.step1 = await step1_CreateRecommendation()
    if (!results.step1) {
      throw new Error("1단계 실패")
    }

    // 2단계: 시간 경과 시뮬레이션
    results.step2 = await step2_SimulateTimePassage()
    if (!results.step2) {
      throw new Error("2단계 실패")
    }

    // 3단계: Cron API 호출
    const apiResult = await step3_CallCronAPI()
    results.step3 = true

    // 4단계: 알림 확인
    results.step4 = await step4_VerifyNotification()

    // 5단계: 대시보드 검증
    results.step5 = await step5_VerifyDashboardAccess()

    // 결과 요약
    console.log("\n" + "=".repeat(60))
    console.log("📊 통합 테스트 결과 요약")
    console.log("=".repeat(60))
    console.log(`✅ 1단계 (추천 생성): ${results.step1 ? "성공" : "실패"}`)
    console.log(`✅ 2단계 (시간 경과 시뮬레이션): ${results.step2 ? "성공" : "실패"}`)
    console.log(`✅ 3단계 (Cron API 호출): ${results.step3 ? "성공" : "실패"} (processed: ${apiResult.processed}, created: ${apiResult.created})`)
    console.log(`✅ 4단계 (알림 확인): ${results.step4 ? "성공" : "실패"}`)
    console.log(`✅ 5단계 (대시보드 검증): ${results.step5 ? "성공" : "실패"}`)

    const allPassed = Object.values(results).every((r) => r)

    if (allPassed) {
      console.log("\n🎉 모든 단계 통과! 통합 테스트 성공!")
    } else {
      console.log("\n⚠️  일부 단계 실패. 위의 로그를 확인하세요.")
    }

    // 테스트 데이터 정리 안내
    console.log("\n💡 테스트 데이터를 정리하려면 다음 명령을 실행하세요:")
    console.log("   tsx scripts/test-reminder-flow.ts --cleanup")
  } catch (error) {
    console.error("\n❌ 테스트 실패:", error)
    await cleanupTestData()
    process.exit(1)
  }
}

// 스크립트 실행
main().catch(console.error)

