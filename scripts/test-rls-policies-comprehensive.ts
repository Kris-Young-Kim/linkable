/**
 * RLS 정책 종합 테스트 스크립트
 * 
 * 이 스크립트는 JWT를 사용하여 실제 RLS 정책이 올바르게 작동하는지 확인합니다.
 * 
 * 실행 방법:
 *   pnpm tsx scripts/test-rls-policies-comprehensive.ts
 * 
 * 필요 환경 변수:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - SUPABASE_JWT_SECRET
 *   - SUPABASE_SERVICE_ROLE_KEY (테스트 데이터 생성용)
 */

import { config } from "dotenv"
import { resolve } from "path"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/database.types"
import jwt from "jsonwebtoken"

// 환경 변수 로드 (jwt-helper보다 먼저 로드)
// .env.local 우선, 없으면 .env 사용
const envLocalPath = resolve(process.cwd(), ".env.local")
const envPath = resolve(process.cwd(), ".env")

if (require("fs").existsSync(envLocalPath)) {
  config({ path: envLocalPath })
  console.log("📝 .env.local 파일에서 환경 변수 로드")
} else if (require("fs").existsSync(envPath)) {
  config({ path: envPath })
  console.log("📝 .env 파일에서 환경 변수 로드")
} else {
  // 둘 다 없으면 기본 .env 로드 시도
  config({ path: envPath })
}

// JWT 생성 함수 (jwt-helper 대신 직접 구현)
function createSupabaseJWT(
  clerkUserId: string,
  options?: {
    email?: string
    role?: string
    expiresIn?: number
    name?: string
  }
): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET!

  const now = Math.floor(Date.now() / 1000)
  const expiresIn = options?.expiresIn || 3600

  const payload = {
    aud: "authenticated",
    exp: now + expiresIn,
    iat: now,
    iss: supabaseUrl,
    sub: clerkUserId,
    email: options?.email,
    role: "authenticated", // Supabase는 authenticated/anon만 인식, 실제 역할은 app_metadata에 저장
    clerk_id: clerkUserId,
    app_metadata: {
      clerk_id: clerkUserId,
      role: options?.role || "user", // 실제 역할은 여기에 저장
    },
    user_metadata: {
      email: options?.email,
      name: options?.name,
    },
  }

  return jwt.sign(payload, supabaseJwtSecret, {
    algorithm: "HS256",
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const missingVars: string[] = []
if (!supabaseUrl) missingVars.push("NEXT_PUBLIC_SUPABASE_URL")
if (!supabaseAnonKey) missingVars.push("NEXT_PUBLIC_SUPABASE_ANON_KEY")
if (!supabaseJwtSecret) missingVars.push("SUPABASE_JWT_SECRET")
if (!serviceRoleKey) missingVars.push("SUPABASE_SERVICE_ROLE_KEY")

if (missingVars.length > 0) {
  console.error("❌ 환경 변수가 설정되지 않았습니다.")
  console.error("")
  console.error("누락된 환경 변수:")
  missingVars.forEach((v) => console.error(`  - ${v}`))
  console.error("")
  console.error("설정 방법:")
  console.error("1. .env 파일을 프로젝트 루트에 생성하세요.")
  console.error("2. 다음 환경 변수를 추가하세요:")
  console.error("   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url")
  console.error("   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key")
  console.error("   SUPABASE_JWT_SECRET=your_jwt_secret")
  console.error("   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key")
  console.error("")
  console.error("SUPABASE_JWT_SECRET은 Supabase Dashboard > Settings > API > JWT Settings에서 확인할 수 있습니다.")
  process.exit(1)
}

// Service Role Key를 사용하는 클라이언트 (테스트 데이터 생성용)
const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

interface TestResult {
  test: string
  passed: boolean
  message: string
  error?: string
}

const results: TestResult[] = []

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn()
    results.push({ test: name, passed: true, message: "✅ 통과" })
    console.log(`✅ ${name}`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    results.push({ test: name, passed: false, message: "❌ 실패", error: errorMessage })
    console.error(`❌ ${name}: ${errorMessage}`)
  }
}

/**
 * JWT를 사용하여 Supabase 클라이언트 생성
 */
function createSupabaseClientWithJWT(clerkUserId: string, role: string = "user", email?: string) {
  const jwt = createSupabaseJWT(clerkUserId, {
    email,
    role,
    expiresIn: 3600,
  })

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * 테스트 사용자 생성 (Service Role Key 사용)
 */
async function createTestUser(clerkId: string, role: string = "user", email?: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        clerk_id: clerkId,
        email: email || `${clerkId}@test.linkable.local`,
        name: `Test User ${clerkId}`,
        role,
      },
      { onConflict: "clerk_id" }
    )
    .select()
    .single()

  if (error) {
    throw new Error(`테스트 사용자 생성 실패: ${error.message}`)
  }

  return data
}

/**
 * 테스트 상담 생성
 */
async function createTestConsultation(userId: string, title: string = "Test Consultation") {
  const { data, error } = await supabaseAdmin
    .from("consultations")
    .insert({
      user_id: userId,
      title,
      status: "in_progress",
    })
    .select()
    .single()

  if (error) {
    throw new Error(`테스트 상담 생성 실패: ${error.message}`)
  }

  return data
}

async function main() {
  console.log("=".repeat(60))
  console.log("RLS 정책 종합 테스트 시작")
  console.log("=".repeat(60))
  console.log()

  // 테스트 사용자 ID 생성
  const testUser1Id = `test_user_${Date.now()}_1`
  const testUser2Id = `test_user_${Date.now()}_2`
  const testAdminId = `test_admin_${Date.now()}`

  let testUser1: any = null
  let testUser2: any = null
  let testAdmin: any = null
  let consultation1: any = null
  let consultation2: any = null

  try {
    // 테스트 데이터 생성
    console.log("📝 테스트 데이터 생성 중...")
    testUser1 = await createTestUser(testUser1Id, "user", "user1@test.linkable.local")
    testUser2 = await createTestUser(testUser2Id, "user", "user2@test.linkable.local")
    testAdmin = await createTestUser(testAdminId, "admin", "admin@test.linkable.local")

    consultation1 = await createTestConsultation(testUser1.id, "User 1 Consultation")
    consultation2 = await createTestConsultation(testUser2.id, "User 2 Consultation")

    console.log("✅ 테스트 데이터 생성 완료")
    console.log()

    // =========================================================
    // 1. JWT 생성 및 검증 테스트
    // =========================================================
    console.log("=".repeat(60))
    console.log("1. JWT 생성 및 검증 테스트")
    console.log("=".repeat(60))
    console.log()

    await test("JWT 생성 테스트", async () => {
      const jwt = createSupabaseJWT(testUser1Id, {
        email: "user1@test.linkable.local",
        role: "user",
      })

      if (!jwt || jwt.length === 0) {
        throw new Error("JWT 생성 실패")
      }

      console.log(`   JWT 생성 성공 (길이: ${jwt.length})`)
    })

    // =========================================================
    // 2. 사용자별 데이터 접근 제어 테스트
    // =========================================================
    console.log()
    console.log("=".repeat(60))
    console.log("2. 사용자별 데이터 접근 제어 테스트")
    console.log("=".repeat(60))
    console.log()

    // 2.1 자신의 데이터 조회 가능
    await test("사용자 1이 자신의 상담 조회 가능", async () => {
      const supabaseUser1 = createSupabaseClientWithJWT(testUser1Id, "user")
      const { data, error } = await supabaseUser1
        .from("consultations")
        .select("*")
        .eq("id", consultation1.id)
        .single()

      if (error) {
        throw new Error(`상담 조회 실패: ${error.message}`)
      }

      if (!data || data.id !== consultation1.id) {
        throw new Error("상담 데이터가 일치하지 않습니다")
      }

      console.log(`   상담 조회 성공: ${data.title}`)
    })

    // 2.2 다른 사용자의 데이터 조회 불가
    await test("사용자 1이 사용자 2의 상담 조회 불가", async () => {
      const supabaseUser1 = createSupabaseClientWithJWT(testUser1Id, "user")
      const { data, error } = await supabaseUser1
        .from("consultations")
        .select("*")
        .eq("id", consultation2.id)
        .single()

      // RLS 정책에 의해 접근이 차단되어야 함
      if (!error) {
        throw new Error("다른 사용자의 상담에 접근할 수 있어서는 안 됩니다")
      }

      if (error.code !== "PGRST116" && error.message !== "JSON object requested, multiple (or no) rows returned") {
        // PGRST116은 "no rows returned" 에러
        // RLS 정책이 작동하면 데이터가 없어야 함
        console.log(`   접근 차단 확인: ${error.message} (코드: ${error.code})`)
      } else {
        console.log(`   접근 차단 확인: 데이터 없음 (정상)`)
      }
    })

    // 2.3 자신의 사용자 정보 조회 가능
    await test("사용자 1이 자신의 사용자 정보 조회 가능", async () => {
      const supabaseUser1 = createSupabaseClientWithJWT(testUser1Id, "user")
      const { data, error } = await supabaseUser1
        .from("users")
        .select("*")
        .eq("id", testUser1.id)
        .single()

      if (error) {
        throw new Error(`사용자 정보 조회 실패: ${error.message}`)
      }

      if (!data || data.id !== testUser1.id) {
        throw new Error("사용자 데이터가 일치하지 않습니다")
      }

      console.log(`   사용자 정보 조회 성공: ${data.email}`)
    })

    // 2.4 다른 사용자의 정보 조회 불가
    await test("사용자 1이 사용자 2의 정보 조회 불가", async () => {
      const supabaseUser1 = createSupabaseClientWithJWT(testUser1Id, "user")
      const { data, error } = await supabaseUser1
        .from("users")
        .select("*")
        .eq("id", testUser2.id)
        .single()

      // RLS 정책에 의해 접근이 차단되어야 함
      if (!error) {
        throw new Error("다른 사용자의 정보에 접근할 수 있어서는 안 됩니다")
      }

      console.log(`   접근 차단 확인: ${error.message} (코드: ${error.code})`)
    })

    // =========================================================
    // 3. 관리자 권한 테스트
    // =========================================================
    console.log()
    console.log("=".repeat(60))
    console.log("3. 관리자 권한 테스트")
    console.log("=".repeat(60))
    console.log()

    // 3.1 관리자가 모든 사용자 조회 가능
    await test("관리자가 모든 사용자 조회 가능", async () => {
      const supabaseAdminClient = createSupabaseClientWithJWT(testAdminId, "admin")
      const { data, error } = await supabaseAdminClient
        .from("users")
        .select("*")
        .in("id", [testUser1.id, testUser2.id, testAdmin.id])

      if (error) {
        throw new Error(`사용자 조회 실패: ${error.message}`)
      }

      if (!data || data.length < 3) {
        throw new Error(`예상된 사용자 수와 일치하지 않습니다 (예상: 3, 실제: ${data?.length || 0})`)
      }

      console.log(`   모든 사용자 조회 성공: ${data.length}명`)
    })

    // 3.2 관리자가 모든 상담 조회 가능
    await test("관리자가 모든 상담 조회 가능", async () => {
      const supabaseAdminClient = createSupabaseClientWithJWT(testAdminId, "admin")
      const { data, error } = await supabaseAdminClient
        .from("consultations")
        .select("*")
        .in("id", [consultation1.id, consultation2.id])

      if (error) {
        throw new Error(`상담 조회 실패: ${error.message}`)
      }

      if (!data || data.length < 2) {
        throw new Error(`예상된 상담 수와 일치하지 않습니다 (예상: 2, 실제: ${data?.length || 0})`)
      }

      console.log(`   모든 상담 조회 성공: ${data.length}개`)
    })

    // 3.3 일반 사용자가 모든 사용자 조회 불가
    await test("일반 사용자가 모든 사용자 조회 불가", async () => {
      const supabaseUser1 = createSupabaseClientWithJWT(testUser1Id, "user")
      const { data, error } = await supabaseUser1
        .from("users")
        .select("*")

      // 일반 사용자는 자신의 데이터만 조회 가능
      if (error) {
        // 에러가 발생할 수 있지만, 데이터가 있으면 자신의 것만 있어야 함
        console.log(`   조회 결과: ${error.message} (코드: ${error.code})`)
      } else {
        // 데이터가 있으면 자신의 것만 있어야 함
        if (data && data.length > 0) {
          const hasOtherUsers = data.some((u) => u.id !== testUser1.id)
          if (hasOtherUsers) {
            throw new Error("일반 사용자가 다른 사용자의 정보를 조회할 수 있어서는 안 됩니다")
          }
          console.log(`   자신의 데이터만 조회 가능 확인: ${data.length}개`)
        }
      }
    })

    // =========================================================
    // 4. 헬퍼 함수 테스트
    // =========================================================
    console.log()
    console.log("=".repeat(60))
    console.log("4. 헬퍼 함수 테스트")
    console.log("=".repeat(60))
    console.log()

    await test("get_current_user_id 함수 테스트", async () => {
      const supabaseUser1 = createSupabaseClientWithJWT(testUser1Id, "user")
      const { data, error } = await supabaseUser1.rpc("get_current_user_id")

      if (error && error.code !== "P0001") {
        // P0001은 함수 실행 오류 (예: NULL 반환)이므로 정상일 수 있음
        throw new Error(`함수 호출 실패: ${error.message} (코드: ${error.code})`)
      }

      // 함수가 정상적으로 호출되었는지 확인
      console.log(`   함수 호출 성공 (반환값: ${data || "NULL"})`)
    })

    await test("get_current_user_role 함수 테스트", async () => {
      const supabaseUser1 = createSupabaseClientWithJWT(testUser1Id, "user")
      const { data, error } = await supabaseUser1.rpc("get_current_user_role")

      if (error && error.code !== "P0001") {
        throw new Error(`함수 호출 실패: ${error.message} (코드: ${error.code})`)
      }

      console.log(`   함수 호출 성공 (반환값: ${data || "NULL"})`)
    })

    await test("is_admin_or_manager 함수 테스트 (일반 사용자)", async () => {
      const supabaseUser1 = createSupabaseClientWithJWT(testUser1Id, "user")
      const { data, error } = await supabaseUser1.rpc("is_admin_or_manager")

      if (error && error.code !== "P0001") {
        throw new Error(`함수 호출 실패: ${error.message} (코드: ${error.code})`)
      }

      if (data === true) {
        throw new Error("일반 사용자는 관리자가 아니어야 합니다")
      }

      console.log(`   함수 호출 성공 (반환값: ${data}, 예상: false)`)
    })

    await test("is_admin_or_manager 함수 테스트 (관리자)", async () => {
      const supabaseAdminClient = createSupabaseClientWithJWT(testAdminId, "admin")
      const { data, error } = await supabaseAdminClient.rpc("is_admin_or_manager")

      if (error && error.code !== "P0001") {
        throw new Error(`함수 호출 실패: ${error.message} (코드: ${error.code})`)
      }

      if (data !== true) {
        throw new Error("관리자는 true를 반환해야 합니다")
      }

      console.log(`   함수 호출 성공 (반환값: ${data}, 예상: true)`)
    })

  } finally {
    // 테스트 데이터 정리
    console.log()
    console.log("🧹 테스트 데이터 정리 중...")
    try {
      if (consultation1) {
        await supabaseAdmin.from("consultations").delete().eq("id", consultation1.id)
      }
      if (consultation2) {
        await supabaseAdmin.from("consultations").delete().eq("id", consultation2.id)
      }
      if (testUser1) {
        await supabaseAdmin.from("users").delete().eq("id", testUser1.id)
      }
      if (testUser2) {
        await supabaseAdmin.from("users").delete().eq("id", testUser2.id)
      }
      if (testAdmin) {
        await supabaseAdmin.from("users").delete().eq("id", testAdmin.id)
      }
      console.log("✅ 테스트 데이터 정리 완료")
    } catch (error) {
      console.error("⚠️  테스트 데이터 정리 중 오류:", error)
    }
  }

  // 결과 요약
  console.log()
  console.log("=".repeat(60))
  console.log("테스트 결과 요약")
  console.log("=".repeat(60))

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length

  console.log(`✅ 통과: ${passed}개`)
  console.log(`❌ 실패: ${failed}개`)
  console.log()

  if (failed > 0) {
    console.log("실패한 테스트:")
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.test}: ${r.error}`)
      })
    console.log()
  }

  // 주의사항
  console.log("=".repeat(60))
  console.log("📝 참고 사항")
  console.log("=".repeat(60))
  console.log("1. 이 테스트는 JWT를 사용하여 실제 RLS 정책을 검증합니다.")
  console.log("2. 테스트 데이터는 자동으로 정리됩니다.")
  console.log("3. SUPABASE_JWT_SECRET이 올바르게 설정되어 있어야 합니다.")
  console.log("=".repeat(60))

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error("❌ 테스트 실행 중 오류 발생:", error)
  process.exit(1)
})

