import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { syncProducts } from "@/lib/integrations/product-sync"
import { sampleProducts } from "@/lib/integrations/sample-products"
import { logEvent } from "@/lib/logging"
import type { ProductInput } from "@/lib/integrations/product-sync"

/**
 * 상품 데이터 동기화 API
 * 
 * POST /api/products/sync
 * 
 * Body:
 * - products?: ProductInput[] - 동기화할 상품 목록 (없으면 샘플 데이터 사용)
 * - validateLinks?: boolean - 링크 검증 여부 (기본값: true)
 * - useSample?: boolean - 샘플 데이터 사용 여부 (기본값: false)
 */
export async function POST(request: Request) {
  const { userId } = await auth()

  // 관리자 권한 확인 (선택적 - MVP에서는 모든 인증된 사용자 허용)
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      products?: ProductInput[]
      validateLinks?: boolean
      useSample?: boolean
    }

    const validateLinks = body.validateLinks ?? true
    let productsToSync: ProductInput[] = []

    if (body.useSample || (!body.products && body.useSample !== false)) {
      // 샘플 데이터 사용
      productsToSync = sampleProducts
      logEvent({
        category: "product",
        action: "sync_sample_products",
        payload: { count: productsToSync.length },
      })
    } else if (body.products && Array.isArray(body.products)) {
      // 사용자 제공 데이터 사용
      productsToSync = body.products
    } else {
      return NextResponse.json(
        { error: "products array or useSample flag is required" },
        { status: 400 },
      )
    }

    const result = await syncProducts(productsToSync, { validateLinks })

    return NextResponse.json({
      success: result.success,
      summary: {
        total: productsToSync.length,
        created: result.created,
        updated: result.updated,
        failed: result.failed,
      },
      errors: result.errors,
    })
  } catch (error) {
    logEvent({
      category: "product",
      action: "sync_error",
      payload: { error: error instanceof Error ? error.message : String(error) },
      level: "error",
    })

    return NextResponse.json(
      { error: "Failed to sync products", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

/**
 * 상품 동기화 상태 확인
 * 
 * GET /api/products/sync
 */
export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { getSupabaseServerClient } = await import("@/lib/supabase/server")
    const supabase = getSupabaseServerClient()

    const { data, error } = await supabase
      .from("products")
      .select("id, name, iso_code, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      throw error
    }

    const activeCount = data?.filter((p) => p.is_active).length ?? 0
    const inactiveCount = (data?.length ?? 0) - activeCount

    return NextResponse.json({
      total: data?.length ?? 0,
      active: activeCount,
      inactive: inactiveCount,
      products: data,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch sync status", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

