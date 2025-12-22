/**
 * Meta Pixel 구매 이벤트 Webhook 엔드포인트
 * 
 * POST /api/webhooks/meta/purchase
 * 
 * Meta Pixel에서 구매 완료 이벤트를 받아서 DB에 저장합니다.
 * 외부 판매 사이트에서 구매 완료 시 Meta Pixel이 이 엔드포인트로 이벤트를 전송합니다.
 * 
 * 참고: Meta Pixel Conversions API를 사용하여 서버 사이드 이벤트를 받을 수 있습니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";

/**
 * Meta Pixel 구매 이벤트 데이터 타입
 */
interface MetaPurchaseEvent {
  event_name?: string
  event_time?: number
  user_data?: {
    client_ip_address?: string
    client_user_agent?: string
    fbc?: string // Facebook Click ID
    fbp?: string // Facebook Browser ID
    external_id?: string
  }
  custom_data?: {
    value?: number
    currency?: string
    content_ids?: string[]
    contents?: Array<{ id: string; quantity: number }>
    content_name?: string
    order_id?: string
  }
  event_source_url?: string
  action_source?: string
  // 추가 필드들
  [key: string]: unknown
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as MetaPurchaseEvent

    console.log("[Meta Pixel Purchase] 구매 이벤트 수신:", JSON.stringify(body, null, 2))

    // 필수 필드 검증
    if (body.event_name !== "Purchase") {
      console.warn("[Meta Pixel Purchase] Purchase 이벤트가 아닙니다:", body.event_name)
      return NextResponse.json({ error: "Only Purchase events are accepted" }, { status: 400 })
    }

    if (!body.custom_data?.value) {
      console.warn("[Meta Pixel Purchase] 구매 금액이 없습니다:", body)
      return NextResponse.json({ error: "Purchase value is required" }, { status: 400 })
    }

    const supabase = getSupabaseServerClient();

    // 구매 데이터 파싱
    const purchaseAmount = parseFloat(String(body.custom_data.value || 0))
    const currency = body.custom_data.currency || "KRW"
    const orderId = body.custom_data.order_id || `meta_${Date.now()}`
    const productIds = body.custom_data.content_ids || []
    const purchaseDate = body.event_time
      ? new Date(body.event_time * 1000) // Meta Pixel은 초 단위 타임스탬프
      : new Date()

    // user_data에서 사용자 ID 추출 (external_id 또는 fbp/fbc)
    let userId: string | null = null
    if (body.user_data?.external_id) {
      // external_id가 사용자 ID일 수 있음
      userId = body.user_data.external_id
    }

    // recommendations 테이블에서 해당 상품의 추천 찾기
    let recommendationId: string | null = null
    let productId: string | null = null
    let consultationId: string | null = null

    if (productIds.length > 0) {
      // content_ids의 첫 번째 ID로 상품 찾기
      const firstProductId = productIds[0]

      const { data: rec } = await supabase
        .from("recommendations")
        .select("id, product_id, consultation_id, user_id")
        .eq("is_clicked", true)
        .order("created_at", { ascending: false })
        .limit(10) // 최근 10개만 조회

      // product_id로 매칭 시도
      if (rec && rec.length > 0) {
        const matchedRec = rec.find((r) => r.product_id === firstProductId)
        if (matchedRec) {
          recommendationId = matchedRec.id
          userId = matchedRec.user_id || userId
          productId = matchedRec.product_id
          consultationId = matchedRec.consultation_id
        } else if (rec.length > 0) {
          // 첫 번째 추천 사용 (정확한 매칭이 어려운 경우)
          recommendationId = rec[0].id
          userId = rec[0].user_id || userId
          productId = rec[0].product_id
          consultationId = rec[0].consultation_id
        }
      }
    }

    // conversion_events에 purchase_completed 이벤트 저장
    const { error: insertError } = await supabase
      .from("conversion_events")
      .insert({
        user_id: userId,
        event_type: "purchase_completed",
        recommendation_id: recommendationId,
        product_id: productId,
        consultation_id: consultationId,
        purchase_amount: purchaseAmount,
        commission_amount: 0, // Meta Pixel에서는 수수료 정보가 없음
        purchase_date: purchaseDate,
        tracking_source: "meta_pixel",
        metadata: {
          order_id: orderId,
          currency,
          product_ids: productIds,
          contents: body.custom_data.contents,
          product_name: body.custom_data.content_name,
          event_source_url: body.event_source_url,
          action_source: body.action_source,
          user_data: {
            client_ip: body.user_data?.client_ip_address,
            user_agent: body.user_data?.client_user_agent,
            fbc: body.user_data?.fbc,
            fbp: body.user_data?.fbp,
          },
          raw_data: body, // 원본 데이터 보관
        },
      })

    if (insertError) {
      console.error("[Meta Pixel Purchase] 이벤트 저장 오류:", insertError)
      logEvent({
        category: "product",
        action: "meta_pixel_insert_error",
        payload: { error: insertError, orderId },
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

      // 매칭 성능 로그 업데이트 (비동기, 에러 무시)
      import("@/lib/matching-performance-updater").then(({ updateMatchingPerformanceOnPurchase }) => {
        updateMatchingPerformanceOnPurchase(recommendationId).catch((err) => {
          console.error("[Meta Purchase] Performance update failed:", err);
        });
      });

      // CTA A/B 테스트: 구매 이벤트 기록 (비동기, 에러 무시)
      import("@/lib/cta-ab-testing").then(async ({ logCtaPerformance }) => {
        try {
          // 할당된 변형 조회
          const { data: assignment } = await supabase
            .from("cta_ab_test_assignments")
            .select("variant_id")
            .eq("consultation_id", consultationId)
            .maybeSingle();
          
          if (assignment?.variant_id) {
            await logCtaPerformance(assignment.variant_id, "purchase", {
              userId,
              consultationId,
              recommendationId,
            });
          }
        } catch (err) {
          console.error("[Meta Purchase] CTA AB test logging failed:", err);
        }
      });

      // 실시간 학습: 구매 이벤트 기록 (비동기, 에러 무시)
      import("@/lib/realtime-learning").then(async ({ updateRealtimeLearningStats }) => {
        try {
          // ICF 코드와 ISO 코드 조회
          const { data: recommendationData } = await supabase
            .from("recommendations")
            .select(`
              consultation_id,
              product:product_id(iso_code)
            `)
            .eq("id", recommendationId)
            .single();

          if (recommendationData?.consultation_id) {
            // ICF 코드 조회
            const { data: icfData } = await supabase
              .from("consultation_icf_codes")
              .select("icf_codes!icf_code_id(code)")
              .eq("consultation_id", recommendationData.consultation_id);

            if (icfData && icfData.length > 0) {
              const icfCodes = icfData
                .map((item: any) => item.icf_codes?.code)
                .filter((code: string | undefined): code is string => !!code);

              const product = Array.isArray(recommendationData.product)
                ? recommendationData.product[0]
                : recommendationData.product;
              const isoCode = (product as any)?.iso_code;

              if (icfCodes.length > 0 && isoCode) {
                await updateRealtimeLearningStats(icfCodes, isoCode, "purchase");
              }
            }
          }
        } catch (err) {
          console.error("[Meta Purchase] Realtime learning failed:", err);
        }
      });
    }

    logEvent({
      category: "product",
      action: "purchase_completed_from_meta_pixel",
      payload: {
        orderId,
        recommendationId,
        purchaseAmount,
        productIds,
      },
    })

    console.log(`[Meta Pixel Purchase] 구매 완료 이벤트 저장 완료: ${orderId}`)

    return NextResponse.json({
      success: true,
      message: "Purchase event saved successfully",
      orderId,
    })
  } catch (error) {
    console.error("[Meta Pixel Purchase] 처리 중 오류:", error)
    logEvent({
      category: "product",
      action: "meta_pixel_error",
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
    message: "Meta Pixel Purchase Webhook Endpoint",
    method: "POST",
    description: "Meta Pixel에서 구매 완료 이벤트를 받습니다.",
    example: {
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      custom_data: {
        value: 50000,
        currency: "KRW",
        content_ids: ["product123"],
        order_id: "ORDER123",
      },
    },
  })
}

