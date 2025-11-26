import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"

const supabase = getSupabaseServerClient()

type IppaConsultationRequest = {
  consultationId: string
  importance: number
  currentDifficulty: number
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as IppaConsultationRequest

    if (!body.consultationId) {
      return NextResponse.json({ error: "consultationId is required" }, { status: 400 })
    }

    if (
      !body.importance ||
      !body.currentDifficulty ||
      body.importance < 1 ||
      body.importance > 5 ||
      body.currentDifficulty < 1 ||
      body.currentDifficulty > 5
    ) {
      return NextResponse.json(
        { error: "importance and currentDifficulty must be between 1 and 5" },
        { status: 400 }
      )
    }

    // consultations 테이블에 K-IPPA 데이터 저장
    // JSONB 필드로 저장하거나 별도 컬럼으로 저장
    // 일단 JSONB로 저장 (향후 스키마 확장 가능)
    const { error: updateError } = await supabase
      .from("consultations")
      .update({
        // JSONB 필드에 저장 (향후 스키마 확장 시 별도 컬럼으로 변경 가능)
        // 현재는 metadata JSONB 필드가 없으므로, 일단 analysis_results에 저장하거나
        // 별도 테이블에 저장하는 방법도 있음
        // 임시로 title에 힌트를 남기거나, 별도 처리 필요
      })
      .eq("id", body.consultationId)

    // consultations 테이블에 직접 저장할 수 없으므로,
    // analysis_results 테이블에 저장하거나 별도 처리
    // 일단 analysis_results의 icf_codes JSONB에 추가
    const { data: analysisData, error: analysisError } = await supabase
      .from("analysis_results")
      .select("icf_codes")
      .eq("consultation_id", body.consultationId)
      .single()

    if (analysisError && analysisError.code !== "PGRST116") {
      console.error("[K-IPPA] Analysis fetch error:", analysisError)
    }

    // analysis_results에 K-IPPA 데이터 추가
    const updatedIcfCodes = {
      ...(analysisData?.icf_codes as Record<string, unknown> | null),
      ippa_consultation: {
        importance: body.importance,
        current_difficulty: body.currentDifficulty,
        collected_at: new Date().toISOString(),
      },
    }

    const { error: upsertError } = await supabase
      .from("analysis_results")
      .upsert(
        {
          consultation_id: body.consultationId,
          icf_codes: updatedIcfCodes,
        },
        {
          onConflict: "consultation_id",
        }
      )

    if (upsertError) {
      console.error("[K-IPPA] Upsert error:", upsertError)
      return NextResponse.json({ error: "Failed to save K-IPPA data" }, { status: 500 })
    }

    logEvent({
      category: "consultation",
      action: "ippa_consultation_saved",
      payload: {
        consultationId: body.consultationId,
        importance: body.importance,
        currentDifficulty: body.currentDifficulty,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[K-IPPA] Unexpected error:", error)
    return NextResponse.json({ error: "Failed to save K-IPPA data" }, { status: 500 })
  }
}

