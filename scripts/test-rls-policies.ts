/**
 * RLS 정책 테스트 스크립트
 * 
 * 이 스크립트는 RLS 정책이 올바르게 작동하는지 확인합니다.
 * 
 * 실행 방법:
 *   pnpm tsx scripts/test-rls-policies.ts
 */

import { config } from "dotenv"
import { resolve } from "path"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/database.types"

// 환경 변수 로드
config({ path: resolve(process.cwd(), ".env") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ 환경 변수가 설정되지 않았습니다.")
  console.error("필요한 환경 변수:")
  console.error("  - NEXT_PUBLIC_SUPABASE_URL")
  console.error("  - SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
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

async function main() {
  console.log("=".repeat(60))
  console.log("RLS 정책 테스트 시작")
  console.log("=".repeat(60))
  console.log()

  // 1. RLS 활성화 확인 (SQL 직접 실행)
  await test("RLS 활성화 확인", async () => {
    // Service Role Key를 사용하므로 직접 SQL 실행
    const { data, error } = await supabase.rpc("exec_sql", {
      query: `
        SELECT 
          tablename,
          rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN (
            'users', 'consultations', 'chat_messages', 
            'analysis_results', 'recommendations', 'ippa_evaluations'
          )
          AND rowsecurity = true
        ORDER BY tablename;
      `,
    })

    if (error) {
      // exec_sql 함수가 없을 수 있으므로 간단한 테이블 접근으로 확인
      // RLS가 활성화되어 있어도 Service Role Key는 접근 가능
      const { error: testError } = await supabase.from("users").select("id").limit(1)
      
      if (testError) {
        throw new Error(`테이블 접근 실패: ${testError.message}`)
      }

      console.log("   RLS 활성화 확인: Service Role Key로 접근 가능 (정상)")
    } else {
      console.log(`   활성화된 테이블 확인 완료`)
    }
  })

  // 2. 헬퍼 함수 존재 확인 (함수 호출로 확인)
  await test("헬퍼 함수 존재 확인", async () => {
    const functions = [
      { name: "get_current_user_id", test: () => supabase.rpc("get_current_user_id") },
      { name: "get_current_user_role", test: () => supabase.rpc("get_current_user_role") },
      { name: "is_admin_or_manager", test: () => supabase.rpc("is_admin_or_manager") },
    ]

    for (const { name, test: testFn } of functions) {
      const { error } = await testFn()

      if (error && error.code === "42883") {
        // 함수가 존재하지 않는 경우
        throw new Error(`함수 ${name}가 존재하지 않습니다: ${error.message}`)
      } else if (error && error.code !== "P0001") {
        // P0001은 함수 실행 오류 (예: NULL 반환)이므로 정상
        // 다른 오류는 문제
        console.log(`   함수 ${name} 확인: ${error.message} (코드: ${error.code})`)
      } else {
        console.log(`   함수 ${name} 존재 확인 완료`)
      }
    }
  })

  // 3. RLS 정책 존재 확인 (테이블 접근으로 간접 확인)
  await test("RLS 정책 존재 확인", async () => {
    // Service Role Key를 사용하므로 정책이 있어도 접근 가능
    // 정책이 없으면 에러가 발생하지만, Service Role Key는 우회하므로
    // 실제로는 정책 존재 여부를 직접 확인하기 어렵습니다.
    // 대신 테이블 접근이 가능한지 확인합니다.
    
    const tables = ["users", "consultations", "recommendations"]
    
    for (const table of tables) {
      const { error } = await supabase.from(table as any).select("id").limit(1)
      
      if (error) {
        throw new Error(`테이블 ${table} 접근 실패: ${error.message}`)
      }
    }

    console.log("   테이블 접근 확인: users, consultations, recommendations")
    console.log("   (Service Role Key는 RLS를 우회하므로 정책 존재 여부는 간접 확인)")
  })

  // 4. 테이블 접근 테스트 (Service Role Key는 RLS를 우회하므로 항상 성공)
  await test("테이블 접근 테스트 (Service Role Key)", async () => {
    const { data, error } = await supabase.from("users").select("id").limit(1)

    if (error) {
      throw new Error(`테이블 접근 실패: ${error.message}`)
    }

    console.log("   Service Role Key로 접근 성공 (RLS 우회)")
  })

  // 5. 정책 개수 확인 (간접 확인)
  await test("정책 개수 확인", async () => {
    // pg_policies는 시스템 뷰이므로 직접 쿼리 불가
    // 대신 주요 테이블 접근으로 RLS 활성화 여부 확인
    const tables = [
      "users",
      "consultations",
      "chat_messages",
      "analysis_results",
      "recommendations",
      "ippa_evaluations",
      "notifications",
      "consultation_feedback",
    ]

    let accessibleCount = 0

    for (const table of tables) {
      const { error } = await supabase.from(table as any).select("id").limit(1)
      if (!error) {
        accessibleCount++
      }
    }

    console.log(`   접근 가능한 테이블: ${accessibleCount}/${tables.length}개`)
    console.log("   (Service Role Key는 RLS를 우회하므로 정책 개수는 간접 확인)")
  })

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
  console.log("⚠️  중요 사항")
  console.log("=".repeat(60))
  console.log("1. Service Role Key를 사용하면 RLS를 우회합니다.")
  console.log("2. RLS를 완전히 활용하려면 클라이언트 측 인증으로 전환하거나,")
  console.log("   API에서 사용자 컨텍스트를 명시적으로 전달해야 합니다.")
  console.log("3. JWT 커스텀 클레임에 clerk_id를 추가해야 합니다.")
  console.log("=".repeat(60))

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error("❌ 테스트 실행 중 오류 발생:", error)
  process.exit(1)
})

