#!/usr/bin/env tsx
/**
 * 자동 알림 스케줄러 PoC 테스트 스크립트
 * 
 * 사용법:
 *   tsx scripts/test-cron-reminder.ts
 *   tsx scripts/test-cron-reminder.ts --cleanup  # 테스트 데이터 정리
 * 
 * 이 스크립트는 다음을 수행합니다:
 * 1. 테스트 데이터 생성 (사용자, 상담, 상품, 추천)
 * 2. 14일 전 추천 데이터 생성 (is_clicked = true)
 * 3. Cron API 직접 호출하여 알림 생성 확인
 * 4. 생성된 알림 검증
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
  notificationIds: [] as string[],
}

/**
 * 테스트 데이터 생성
 */
async function createTestData() {
  console.log("📝 테스트 데이터 생성 중...")

  try {
    // 1. 테스트 사용자 생성
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        clerk_id: `test-cron-${Date.now()}`,
        email: `test-cron-${Date.now()}@example.com`,
        name: "테스트 사용자 (Cron)",
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
        name: "테스트 보조기기 (Cron)",
        iso_code: "15 09",
        manufacturer: "테스트 제조사",
        description: "Cron 테스트용 상품",
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
        title: "테스트 상담 (Cron)",
        status: "completed",
      })
      .select("id")
      .single()

    if (consultationError) {
      throw new Error(`상담 생성 실패: ${consultationError.message}`)
    }

    testDataIds.consultationId = consultation.id
    console.log(`✅ 상담 생성: ${consultation.id}`)

    // 4. 14일 전 추천 생성 (is_clicked = true)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const createdDate = fourteenDaysAgo.toISOString()

    const { data: recommendation, error: recommendationError } = await supabase
      .from("recommendations")
      .insert({
        consultation_id: consultation.id,
        product_id: product.id,
        match_reason: "테스트용 추천",
        rank: 1,
        is_clicked: true,
        created_at: createdDate, // 14일 전으로 설정
      })
      .select("id")
      .single()

    if (recommendationError) {
      throw new Error(`추천 생성 실패: ${recommendationError.message}`)
    }

    testDataIds.recommendationId = recommendation.id
    console.log(`✅ 추천 생성 (14일 전): ${recommendation.id}`)
    console.log(`   생성일: ${createdDate}`)

    return true
  } catch (error) {
    console.error("❌ 테스트 데이터 생성 실패:", error)
    return false
  }
}

/**
 * Cron API 직접 호출
 */
async function callCronAPI() {
  console.log("\n🔄 Cron API 호출 중...")

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const cronSecret = process.env.CRON_SECRET

    const url = `${baseUrl}/api/cron/reminder-ippa`
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    // CRON_SECRET이 설정되어 있으면 인증 헤더 추가
    if (cronSecret) {
      headers["Authorization"] = `Bearer ${cronSecret}`
    }

    console.log(`📡 API 호출: ${url}`)
    if (cronSecret) {
      console.log("   인증: Bearer token 사용")
    } else {
      console.log("   ⚠️  CRON_SECRET이 설정되지 않아 인증 없이 호출합니다.")
    }

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
 * 알림 생성 확인
 */
async function verifyNotifications() {
  console.log("\n🔍 알림 생성 확인 중...")

  if (!testDataIds.userId) {
    console.error("❌ 사용자 ID가 없습니다.")
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
        console.log("✅ 테스트 알림 발견:")
        console.log(`   ID: ${testNotification.id}`)
        console.log(`   제목: ${testNotification.title}`)
        console.log(`   메시지: ${testNotification.message}`)
        console.log(`   링크: ${testNotification.link_url}`)
        console.log(`   메타데이터:`, JSON.stringify(testNotification.metadata, null, 2))

        testDataIds.notificationIds.push(testNotification.id)
        return true
      } else {
        console.log("⚠️  테스트 알림을 찾을 수 없습니다.")
        console.log("   생성된 알림 목록:")
        notifications.forEach((n) => {
          console.log(`   - ${n.id}: ${n.title} (${n.created_at})`)
        })
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
 * 테스트 데이터 정리
 */
async function cleanupTestData() {
  console.log("\n🧹 테스트 데이터 정리 중...")

  try {
    // 알림 삭제
    if (testDataIds.notificationIds.length > 0) {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .in("id", testDataIds.notificationIds)

      if (error) {
        console.error(`⚠️  알림 삭제 실패: ${error.message}`)
      } else {
        console.log(`✅ 알림 삭제: ${testDataIds.notificationIds.length}개`)
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
    // 정리 모드: 기존 테스트 데이터만 정리
    console.log("🧹 테스트 데이터 정리 모드")
    // 이 경우 testDataIds가 비어있으므로 수동으로 정리해야 함
    console.log("⚠️  정리 모드는 개별적으로 실행해야 합니다.")
    return
  }

  console.log("🚀 자동 알림 스케줄러 PoC 테스트 시작\n")

  try {
    // 1. 테스트 데이터 생성
    const dataCreated = await createTestData()
    if (!dataCreated) {
      console.error("❌ 테스트 데이터 생성 실패")
      await cleanupTestData()
      process.exit(1)
    }

    // 2. Cron API 호출
    const apiResult = await callCronAPI()

    // 3. 알림 확인
    const notificationVerified = await verifyNotifications()

    // 4. 결과 요약
    console.log("\n" + "=".repeat(50))
    console.log("📊 테스트 결과 요약")
    console.log("=".repeat(50))
    console.log(`✅ 테스트 데이터 생성: 성공`)
    console.log(`✅ API 호출: 성공 (processed: ${apiResult.processed}, created: ${apiResult.created})`)
    console.log(`${notificationVerified ? "✅" : "❌"} 알림 생성 확인: ${notificationVerified ? "성공" : "실패"}`)

    if (notificationVerified) {
      console.log("\n🎉 모든 테스트 통과!")
    } else {
      console.log("\n⚠️  알림 생성 확인 실패. 다음을 확인하세요:")
      console.log("   1. Cron API가 정상적으로 실행되었는지")
      console.log("   2. 알림 테이블이 존재하는지")
      console.log("   3. 추천 데이터가 올바른지 (14일 전, is_clicked=true)")
    }

    // 5. 테스트 데이터 정리 (선택적)
    console.log("\n💡 테스트 데이터를 정리하려면 다음 명령을 실행하세요:")
    console.log("   tsx scripts/test-cron-reminder.ts --cleanup")
  } catch (error) {
    console.error("\n❌ 테스트 실패:", error)
    await cleanupTestData()
    process.exit(1)
  }
}

// 스크립트 실행
main().catch(console.error)

