import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"

const supabase = getSupabaseServerClient()

const ensureUserRecord = async (clerkUserId: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .single()

  if (data?.id) {
    return data.id
  }

  if (error && error.code !== "PGRST116") {
    throw error
  }

  const user = await currentUser()
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    `${clerkUserId}@linkable.local`
  const name = user?.fullName ?? user?.username ?? "LinkAble User"
  
  // Clerk 메타데이터에서 role 가져오기 (있으면)
  const role = (user?.publicMetadata?.role as string) || "user"

  const { data: insertData, error: insertError } = await supabase
    .from("users")
    .insert({
      clerk_id: clerkUserId,
      email,
      name,
      role,
    })
    .select("id")
    .single()

  if (insertError) {
    throw insertError
  }

  logEvent({ category: "system", action: "user_created", payload: { clerkUserId } })

  return insertData.id
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const params = await context.params
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const recommendationId = params.id
  if (!recommendationId) {
    return NextResponse.json({ error: "Recommendation id is required" }, { status: 400 })
  }

  const { source } = (await request.json().catch(() => ({}))) as { source?: string }

  try {
    const supabaseUserId = await ensureUserRecord(userId)

    const { data: recommendation, error: recommendationError } = await supabase
      .from("recommendations")
      .select("id, consultation_id, is_clicked")
      .eq("id", recommendationId)
      .single()

    if (recommendationError || !recommendation) {
      return NextResponse.json({ error: "Recommendation not found" }, { status: 404 })
    }

    const { data: consultation, error: consultationError } = await supabase
      .from("consultations")
      .select("user_id")
      .eq("id", recommendation.consultation_id)
      .single()

    if (consultationError || !consultation) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 })
    }

    if (consultation.user_id !== supabaseUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let pointsEarned = 0 // 포인트 적립 변수 초기화

    if (!recommendation.is_clicked) {
      const { error: updateError } = await supabase
        .from("recommendations")
        .update({ is_clicked: true })
        .eq("id", recommendationId)

      if (updateError) {
        logEvent({
          category: "matching",
          action: "recommendation_click_update_error",
          payload: { error: updateError, recommendationId },
          level: "error",
        })
        return NextResponse.json({ error: "Failed to record click" }, { status: 500 })
      }

      logEvent({
        category: "matching",
        action: "recommendation_clicked",
        payload: { recommendationId, source: source ?? "unknown" },
      })

      // 전환 이벤트 로깅 (Analytics 대시보드 연동)
      const { data: productData } = await supabase
        .from("recommendations")
        .select("product_id, consultation_id")
        .eq("id", recommendationId)
        .single()

      if (productData) {
        await supabase.from("conversion_events").insert({
          user_id: supabaseUserId,
          event_type: "recommendation_click",
          source: source ?? "unknown",
          recommendation_id: recommendationId,
          product_id: productData.product_id,
          consultation_id: productData.consultation_id,
          metadata: { source: source ?? "unknown" },
        })

        // 포인트 지급 (추천 클릭 시 10포인트)
        const pointsAwarded = 10
        const { error: pointsError } = await supabase.from("point_transactions").insert({
          user_id: supabaseUserId,
          points: pointsAwarded,
          transaction_type: "earned_recommendation_click",
          description: "추천 상품 클릭 보상",
          reference_id: recommendationId,
          reference_type: "recommendation",
        })
        
        // 포인트 적립 성공 여부를 응답에 포함
        pointsEarned = pointsError ? 0 : pointsAwarded

        // 매칭 성능 로그 업데이트 (비동기, 에러 무시)
        import("@/lib/matching-performance-updater").then(({ updateMatchingPerformanceOnClick }) => {
          updateMatchingPerformanceOnClick(recommendationId).catch((err) => {
            console.error("[Recommendation Click] Performance update failed:", err);
          });
        });

        // 실시간 학습: 클릭 이벤트 기록 (비동기, 에러 무시)
        import("@/lib/realtime-learning").then(async ({ updateRealtimeLearningStats }) => {
          try {
            // ICF 코드와 ISO 코드 조회
            const { data: consultationData } = await supabase
              .from("recommendations")
              .select(`
                consultation_id,
                product:product_id(iso_code)
              `)
              .eq("id", recommendationId)
              .single();

            if (consultationData?.consultation_id) {
              // ICF 코드 조회
              const { data: icfData } = await supabase
                .from("consultation_icf_codes")
                .select("icf_codes!icf_code_id(code)")
                .eq("consultation_id", consultationData.consultation_id);

              if (icfData && icfData.length > 0) {
                const icfCodes = icfData
                  .map((item: any) => item.icf_codes?.code)
                  .filter((code: string | undefined): code is string => !!code);

                const product = Array.isArray(consultationData.product)
                  ? consultationData.product[0]
                  : consultationData.product;
                const isoCode = (product as any)?.iso_code;

                if (icfCodes.length > 0 && isoCode) {
                  await updateRealtimeLearningStats(icfCodes, isoCode, "click");
                }
              }
            }
          } catch (err) {
            console.error("[Recommendation Click] Realtime learning failed:", err);
          }
        });
      }
    }

    return NextResponse.json({ 
      success: true,
      pointsEarned: pointsEarned || 0,
    })
  } catch (error) {
    logEvent({
      category: "matching",
      action: "recommendation_click_error",
      payload: { error, recommendationId },
      level: "error",
    })
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}

