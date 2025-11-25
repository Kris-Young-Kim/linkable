/**
 * 상품 데이터 동기화 유틸리티
 */

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"
import type { ProductSyncResult } from "./types"
import { validatePurchaseLink } from "./link-validator"

export interface ProductInput {
  name: string
  iso_code: string
  manufacturer?: string | null
  description?: string | null
  image_url?: string | null
  purchase_link?: string | null
  price?: number | null
  category?: string | null
  is_active?: boolean
}

/**
 * 단일 상품을 데이터베이스에 삽입 또는 업데이트
 */
export async function upsertProduct(
  product: ProductInput,
  options?: { validateLink?: boolean },
): Promise<{ id: string; created: boolean }> {
  const supabase = getSupabaseServerClient()

  // 링크 검증 (옵션)
  if (options?.validateLink && product.purchase_link) {
    const validation = await validatePurchaseLink(product.purchase_link)
    if (!validation.isValid) {
      logEvent({
        category: "product",
        action: "link_validation_failed",
        payload: { url: product.purchase_link, error: validation.error },
        level: "warn",
      })
      // 검증 실패해도 상품은 등록 (링크만 null로 처리)
      product.purchase_link = null
    }
  }

  // 기존 상품 확인 (이름과 ISO 코드로)
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("name", product.name)
    .eq("iso_code", product.iso_code)
    .maybeSingle()

  if (existing) {
    // 업데이트
    const { data, error } = await supabase
      .from("products")
      .update({
        ...product,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id")
      .single()

    if (error) {
      throw error
    }

    return { id: data.id, created: false }
  } else {
    // 신규 생성
    const { data, error } = await supabase
      .from("products")
      .insert({
        ...product,
        is_active: product.is_active ?? true,
      })
      .select("id")
      .single()

    if (error) {
      throw error
    }

    return { id: data.id, created: true }
  }
}

/**
 * 여러 상품을 일괄 동기화
 */
export async function syncProducts(
  products: ProductInput[],
  options?: { validateLinks?: boolean },
): Promise<ProductSyncResult> {
  const result: ProductSyncResult = {
    success: true,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [],
  }

  for (const product of products) {
    try {
      const { created } = await upsertProduct(product, { validateLink: options?.validateLinks })
      if (created) {
        result.created++
      } else {
        result.updated++
      }
    } catch (error) {
      result.failed++
      result.success = false
      result.errors?.push({
        productId: product.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  logEvent({
    category: "product",
    action: "products_synced",
    payload: {
      total: products.length,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
    },
  })

  return result
}

