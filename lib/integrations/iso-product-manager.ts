/**
 * ISO 코드별 상품 링크 관리 유틸리티
 * 
 * ISO 코드별로 여러 상품 링크를 관리하고 조회하는 헬퍼 함수들
 */

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"
import { upsertProduct } from "./product-sync"

export interface IsoProductInput {
  name: string
  purchase_link: string
  platform?: "naver" | "11st" | "gmarket" | "manual"
  price?: number
  image_url?: string
  description?: string
  manufacturer?: string
}

/**
 * ISO 코드별로 여러 상품을 일괄 등록/업데이트
 * 
 * @example
 * await syncIsoCodeProducts("15 09", [
 *   {
 *     name: "무게조절 식기 세트",
 *     purchase_link: "https://naver.com/products/1",
 *     platform: "naver",
 *     price: 25000
 *   },
 *   {
 *     name: "적응형 숟가락",
 *     purchase_link: "https://naver.link/1",
 *     platform: "naver",
 *     price: 15000
 *   }
 * ])
 */
export async function syncIsoCodeProducts(
  isoCode: string,
  products: IsoProductInput[],
): Promise<{ success: number; failed: number }> {
  const supabase = getSupabaseServerClient()
  let success = 0
  let failed = 0

  // ISO 코드 레벨 검증: Division 레벨(6자리)만 허용
  const parts = isoCode.split(" ").filter(Boolean);
  if (parts.length < 3) {
    throw new Error(
      `제품은 Division 레벨(6자리) ISO 코드로만 등록할 수 있습니다. ` +
      `제공된 코드: "${isoCode}"는 ${parts.length === 2 ? 'Subclass' : 'Class'} 레벨입니다. ` +
      `Division 레벨 코드를 사용하세요 (예: "15 09 13").`
    );
  }

  for (const product of products) {
    try {
      await upsertProduct({
        name: product.name,
        iso_code: isoCode,
        purchase_link: product.purchase_link,
        price: product.price ?? null,
        image_url: product.image_url ?? null,
        description: product.description ?? null,
        manufacturer: product.manufacturer ?? null,
        category: product.platform ?? null,
      })

      success++

      logEvent({
        category: "product",
        action: "iso_product_synced",
        payload: { isoCode, productName: product.name, platform: product.platform },
      })
    } catch (error) {
      failed++

      logEvent({
        category: "product",
        action: "iso_product_sync_failed",
        payload: {
          isoCode,
          productName: product.name,
          error: error instanceof Error ? error.message : String(error),
        },
        level: "error",
      })
    }
  }

  return { success, failed }
}

/**
 * ISO 코드별 활성 상품 목록 조회
 * 
 * @param isoCode ISO 9999 코드 (예: "15 09 13", "18 30 01")
 * @returns 해당 ISO 코드의 활성 상품 목록
 */
export async function getIsoCodeProducts(isoCode: string) {
  const supabase = getSupabaseServerClient()
  const { getIsoCodeId } = await import("@/lib/utils/iso-code-converter")

  // ISO 코드 문자열을 iso_code_id로 변환
  const isoCodeId = await getIsoCodeId(isoCode, supabase);
  if (!isoCodeId) {
    return []
  }

  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      iso_codes!iso_code_id (
        code,
        name,
        level
      )
    `)
    .eq("iso_code_id", isoCodeId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) {
    logEvent({
      category: "product",
      action: "iso_products_fetch_error",
      payload: { isoCode, error },
      level: "error",
    })
    throw error
  }

  return data ?? []
}

/**
 * 여러 ISO 코드에 대한 상품 목록을 일괄 조회
 * 
 * @param isoCodes ISO 코드 배열
 * @returns ISO 코드별 상품 목록 (Map 형태)
 */
export async function getMultipleIsoCodeProducts(isoCodes: string[]) {
  const supabase = getSupabaseServerClient()
  const { getIsoCodeId } = await import("@/lib/utils/iso-code-converter")

  // 모든 ISO 코드를 iso_code_id로 변환
  const isoCodeIds: string[] = []
  for (const isoCode of isoCodes) {
    const isoCodeId = await getIsoCodeId(isoCode, supabase);
    if (isoCodeId) {
      isoCodeIds.push(isoCodeId);
    }
  }

  if (isoCodeIds.length === 0) {
    return new Map<string, typeof data>()
  }

  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      iso_codes!iso_code_id (
        code,
        name,
        level
      )
    `)
    .in("iso_code_id", isoCodeIds)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) {
    logEvent({
      category: "product",
      action: "multiple_iso_products_fetch_error",
      payload: { isoCodes, error },
      level: "error",
    })
    throw error
  }

  // ISO 코드별로 그룹화 (iso_codes 조인 결과 사용)
  const grouped = new Map<string, typeof data>()
  for (const product of data ?? []) {
    const code = (product.iso_codes as any)?.code || null
    if (code) {
      if (!grouped.has(code)) {
        grouped.set(code, [])
      }
      grouped.get(code)!.push(product)
    }
  }

  return grouped
}

/**
 * ISO 코드별 상품 링크만 추출 (간단한 조회용)
 * 
 * @param isoCode ISO 9999 코드
 * @returns purchase_link 배열
 */
export async function getIsoCodeLinks(isoCode: string): Promise<string[]> {
  const products = await getIsoCodeProducts(isoCode)
  return products
    .map((p) => p.purchase_link)
    .filter((link): link is string => Boolean(link))
}

/**
 * ISO 코드별 상품 통계 조회
 */
export async function getIsoCodeStats(isoCode: string) {
  const supabase = getSupabaseServerClient()
  const { getIsoCodeId } = await import("@/lib/utils/iso-code-converter")

  // ISO 코드 문자열을 iso_code_id로 변환
  const isoCodeId = await getIsoCodeId(isoCode, supabase);
  if (!isoCodeId) {
    return {
      totalProducts: 0,
      totalLinks: 0,
      averagePrice: null,
      minPrice: null,
      maxPrice: null,
    }
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, price, purchase_link")
    .eq("iso_code_id", isoCodeId)
    .eq("is_active", true)

  if (error) {
    throw error
  }

  const products = data ?? []
  const prices = products
    .map((p) => p.price)
    .filter((p): p is number => typeof p === "number" && p > 0)

  return {
    totalProducts: products.length,
    totalLinks: products.filter((p) => p.purchase_link).length,
    averagePrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
    minPrice: prices.length > 0 ? Math.min(...prices) : null,
    maxPrice: prices.length > 0 ? Math.max(...prices) : null,
  }
}

