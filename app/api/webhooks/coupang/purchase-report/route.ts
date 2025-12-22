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
import { getSupabaseServerClient } from "@/lib/supabase/server";
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

    const supabase = getSupabaseServerClient();
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
          .eq("product_id", purchase.productId) // 구매 상품과 매칭
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

          // 매칭 성능 로그 업데이트 (비동기, 에러 무시)
          import("@/lib/matching-performance-updater").then(({ updateMatchingPerformanceOnPurchase }) => {
            updateMatchingPerformanceOnPurchase(rec.id).catch((err) => {
              console.error("[Coupang Purchase] Performance update failed:", err);
            });
          });

          // CTA A/B 테스트: 구매 이벤트 기록 (비동기, 에러 무시)
          import("@/lib/cta-ab-testing").then(async ({ logCtaPerformance }) => {
            try {
              // 할당된 변형 조회
              const { data: assignment } = await supabase
                .from("cta_ab_test_assignments")
                .select("variant_id")
                .eq("consultation_id", rec.consultation_id)
                .maybeSingle();
              
              if (assignment?.variant_id) {
                await logCtaPerformance(assignment.variant_id, "purchase", {
                  userId: rec.user_id,
                  consultationId: rec.consultation_id,
                  recommendationId: rec.id,
                });
              }
            } catch (err) {
              console.error("[Coupang Purchase] CTA AB test logging failed:", err);
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
                .eq("id", rec.id)
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
              console.error("[Coupang Purchase] Realtime learning failed:", err);
            }
          });

          successCount++;

          logEvent({
            category: "product",
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
      category: "product",
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
