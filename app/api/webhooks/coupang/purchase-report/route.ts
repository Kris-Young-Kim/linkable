/**
 * 쿠팡 파트너스 구매 리포트 조회 및 DB 업데이트 API
 *
 * GET /api/webhooks/coupang/purchase-report
 *
 * 쿠팡 파트너스 API를 통해 구매 리포트를 조회하고,
 * conversion_events 테이블에 purchase_completed 이벤트를 저장합니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { createCoupangClient } from "@/lib/integrations/coupang";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || getDefaultStartDate();
    const endDate = searchParams.get("endDate") || getDefaultEndDate();
    const status =
      (searchParams.get("status") as "APPROVED" | "CANCELED") || "APPROVED";

    console.log(
      `[Purchase Report] 구매 리포트 조회 시작: ${startDate} ~ ${endDate}`
    );

    const coupangClient = createCoupangClient();
    if (!coupangClient) {
      return NextResponse.json(
        {
          error:
            "쿠팡 API 클라이언트를 생성할 수 없습니다. 환경 변수를 확인하세요.",
        },
        { status: 500 }
      );
    }

    // 쿠팡 API로 구매 리포트 조회
    const purchases = await coupangClient.getPurchaseReport(
      startDate,
      endDate,
      status
    );

    console.log(`[Purchase Report] ${purchases.length}건의 구매 내역 발견`);

    const supabase = createClient();
    let successCount = 0;
    let errorCount = 0;

    // 각 구매 내역을 DB에 저장
    for (const purchase of purchases) {
      try {
        // recommendations 테이블에서 해당 상품의 추천 찾기
        // purchase.productId 또는 purchase.linkId로 매칭
        const { data: recommendations, error: recError } = await supabase
          .from("recommendations")
          .select("id, product_id, consultation_id, user_id")
          .eq("is_clicked", true) // 클릭된 추천만 대상
          .limit(100); // 최근 100개만 조회 (성능 고려)

        if (recError) {
          console.error(`[Purchase Report] 추천 조회 오류:`, recError);
          errorCount++;
          continue;
        }

        // 상품 ID로 매칭 (정확한 매칭이 어려울 수 있으므로 metadata에 저장)
        // 실제로는 linkId나 orderId로 매칭하는 것이 더 정확함
        for (const rec of recommendations || []) {
          // conversion_events에 purchase_completed 이벤트 저장
          const { error: insertError } = await supabase
            .from("conversion_events")
            .insert({
              user_id: rec.user_id,
              event_type: "purchase_completed",
              recommendation_id: rec.id,
              product_id: rec.product_id,
              consultation_id: rec.consultation_id,
              purchase_amount: purchase.purchaseAmount,
              commission_amount: purchase.commissionAmount,
              purchase_date: new Date(purchase.purchaseDate),
              tracking_source: "coupang_api",
              metadata: {
                order_id: purchase.orderId,
                product_id: purchase.productId,
                product_name: purchase.productName,
                status: purchase.status,
                link_id: purchase.linkId,
              },
            });

          if (insertError) {
            console.error(`[Purchase Report] 이벤트 저장 오류:`, insertError);
            errorCount++;
            continue;
          }

          // recommendations 테이블 업데이트
          await supabase
            .from("recommendations")
            .update({
              purchase_completed: true,
              purchase_completed_at: new Date(purchase.purchaseDate),
              purchase_amount: purchase.purchaseAmount,
            })
            .eq("id", rec.id);

          successCount++;

          logEvent({
            category: "purchase_tracking",
            action: "purchase_completed_from_api",
            payload: {
              orderId: purchase.orderId,
              recommendationId: rec.id,
              purchaseAmount: purchase.purchaseAmount,
              commissionAmount: purchase.commissionAmount,
            },
          });
        }
      } catch (error) {
        console.error(`[Purchase Report] 구매 내역 처리 오류:`, error);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `구매 리포트 처리 완료`,
      stats: {
        total: purchases.length,
        success: successCount,
        errors: errorCount,
      },
      purchases: purchases.map((p) => ({
        orderId: p.orderId,
        productId: p.productId,
        purchaseAmount: p.purchaseAmount,
        commissionAmount: p.commissionAmount,
      })),
    });
  } catch (error) {
    console.error("[Purchase Report] 구매 리포트 조회 중 오류:", error);
    logEvent({
      category: "purchase_tracking",
      action: "purchase_report_error",
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
      level: "error",
    });

    return NextResponse.json(
      {
        error: "구매 리포트 조회 중 오류가 발생했습니다.",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * 기본 시작 날짜 (7일 전)
 */
function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split("T")[0];
}

/**
 * 기본 종료 날짜 (오늘)
 */
function getDefaultEndDate(): string {
  return new Date().toISOString().split("T")[0];
}
