/**
 * 쿠팡 파트너스 Postback URL 엔드포인트
 * 
 * POST /api/webhooks/coupang/purchase
 * 
 * 쿠팡 파트너스에서 구매 완료 시 자동으로 호출하는 엔드포인트입니다.
 * 쿠팡 파트너스 대시보드에서 Postback URL을 이 엔드포인트로 설정하세요.
 * 
 * 참고: 쿠팡 파트너스 Postback URL 형식
 * https://developers.coupang.com/docs/affiliate-api-guide/postback
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"

/**
 * 쿠팡 Postback 요청 본문 타입
 * 실제 쿠팡 API 문서에 따라 필드명이 다를 수 있으므로 확인 필요
 */
interface CoupangPostbackData {
  orderId?: string
  productId?: string
  productName?: string
  purchaseAmount?: number | string
  commissionAmount?: number | string
  purchaseDate?: string
  status?: string
  linkId?: string
  userId?: string
  // 추가 필드들
  [key: string]: unknown
}

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱
    const body = (await request.json().catch(() => ({}))) as CoupangPostbackData

    console.log("[Coupang Postback] 구매 완료 알림 수신:", JSON.stringify(body, null, 2))

    // 필수 필드 검증
    if (!body.orderId) {
      console.warn("[Coupang Postback] orderId가 없습니다:", body)
      return NextResponse.json({ error: "orderId is required" }, { status: 400 })
    }

    const supabase = createClient()

    // 구매 금액 및 수수료 파싱
    const purchaseAmount = parseFloat(String(body.purchaseAmount || 0))
    const commissionAmount = parseFloat(String(body.commissionAmount || 0))
    const purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : new Date()

    // recommendations 테이블에서 해당 상품의 추천 찾기
    // linkId 또는 productId로 매칭 시도
    let recommendationId: string | null = null
    let userId: string | null = null
    let productId: string | null = null
    let consultationId: string | null = null

    if (body.linkId) {
      // linkId로 매칭 (가장 정확)
      // 실제로는 purchase_link에 linkId가 포함되어 있을 수 있음
      const { data: rec } = await supabase
        .from("recommendations")
        .select("id, product_id, consultation_id, user_id")
        .eq("is_clicked", true)
        .limit(1)
        .single()

      if (rec) {
        recommendationId = rec.id
        userId = rec.user_id
        productId = rec.product_id
        consultationId = rec.consultation_id
      }
    }

    // productId로 매칭 시도
    if (!recommendationId && body.productId) {
      const { data: rec } = await supabase
        .from("recommendations")
        .select("id, product_id, consultation_id, user_id")
        .eq("product_id", body.productId)
        .eq("is_clicked", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (rec) {
        recommendationId = rec.id
        userId = rec.user_id
        productId = rec.product_id
        consultationId = rec.consultation_id
      }
    }

    // conversion_events에 purchase_completed 이벤트 저장
    const { error: insertError } = await supabase.from("conversion_events").insert({
      user_id: userId,
      event_type: "purchase_completed",
      recommendation_id: recommendationId,
      product_id: productId,
      consultation_id: consultationId,
      purchase_amount: purchaseAmount,
      commission_amount: commissionAmount,
      purchase_date: purchaseDate,
      tracking_source: "postback",
      metadata: {
        order_id: body.orderId,
        product_id: body.productId,
        product_name: body.productName,
        status: body.status,
        link_id: body.linkId,
        raw_data: body, // 원본 데이터 보관
      },
    })

    if (insertError) {
      console.error("[Coupang Postback] 이벤트 저장 오류:", insertError)
      logEvent({
        category: "purchase_tracking",
        action: "postback_insert_error",
        payload: { error: insertError, orderId: body.orderId },
        level: "error",
      })

      return NextResponse.json(
        { error: "Failed to save purchase event", details: insertError.message },
        { status: 500 }
      )
    }

    // recommendations 테이블 업데이트 (recommendationId가 있는 경우)
    if (recommendationId) {
      await supabase
        .from("recommendations")
        .update({
          purchase_completed: true,
          purchase_completed_at: purchaseDate,
          purchase_amount: purchaseAmount,
        })
        .eq("id", recommendationId)
    }

    logEvent({
      category: "purchase_tracking",
      action: "purchase_completed_from_postback",
      payload: {
        orderId: body.orderId,
        recommendationId,
        purchaseAmount,
        commissionAmount,
      },
    })

    console.log(`[Coupang Postback] 구매 완료 이벤트 저장 완료: ${body.orderId}`)

    // 쿠팡에 성공 응답 반환 (200 OK)
    return NextResponse.json({
      success: true,
      message: "Purchase event saved successfully",
      orderId: body.orderId,
    })
  } catch (error) {
    console.error("[Coupang Postback] 처리 중 오류:", error)
    logEvent({
      category: "purchase_tracking",
      action: "postback_error",
      payload: { error: error instanceof Error ? error.message : String(error) },
      level: "error",
    })

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * GET 요청 처리 (테스트용)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Coupang Purchase Postback Endpoint",
    method: "POST",
    description: "쿠팡 파트너스에서 구매 완료 시 POST 요청을 보냅니다.",
    example: {
      orderId: "ORDER123",
      productId: "PRODUCT456",
      purchaseAmount: 50000,
      commissionAmount: 5000,
      purchaseDate: "2025-02-10T10:00:00Z",
    },
  })
}

