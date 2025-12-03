import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"

const supabase = getSupabaseServerClient()

type ActivityScore = {
  icfCode: string
  importance: number
  currentDifficulty: number
}

type IppaConsultationRequest = {
  consultationId: string
  activities: ActivityScore[]
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

    if (!body.activities || !Array.isArray(body.activities) || body.activities.length === 0) {
      return NextResponse.json(
        { error: "activities array is required and must not be empty" },
        { status: 400 }
      )
    }

    // 활동 점수 유효성 검사
    for (const activity of body.activities) {
      if (
        !activity.icfCode ||
        !activity.importance ||
        !activity.currentDifficulty ||
        activity.importance < 1 ||
        activity.importance > 5 ||
        activity.currentDifficulty < 1 ||
        activity.currentDifficulty > 5
      ) {
        return NextResponse.json(
          { error: "Each activity must have valid icfCode, importance (1-5), and currentDifficulty (1-5)" },
          { status: 400 }
        )
      }
    }

    // consultations 테이블의 ippa_activities JSONB 필드에 저장
    const ippaActivitiesData = {
      activities: body.activities.map(a => ({
        icfCode: a.icfCode,
        importance: a.importance,
        preDifficulty: a.currentDifficulty,
        collectedAt: new Date().toISOString(),
      })),
      collectedAt: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from("consultations")
      .update({
        ippa_activities: ippaActivitiesData,
      })
      .eq("id", body.consultationId)

    if (updateError) {
      console.error("[K-IPPA] Update error:", updateError)
      return NextResponse.json({ error: "Failed to save K-IPPA activities" }, { status: 500 })
    }

    logEvent({
      category: "consultation",
      action: "ippa_consultation_saved",
      payload: {
        consultationId: body.consultationId,
        activityCount: body.activities.length,
        activities: body.activities.map(a => a.icfCode),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[K-IPPA] Unexpected error:", error)
    return NextResponse.json({ error: "Failed to save K-IPPA data" }, { status: 500 })
  }
}

