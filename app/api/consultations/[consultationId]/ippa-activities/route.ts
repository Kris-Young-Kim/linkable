import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

const supabase = getSupabaseServerClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ consultationId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { consultationId } = await params

    // consultations 테이블에서 ippa_activities 조회
    const { data: consultation, error } = await supabase
      .from("consultations")
      .select("ippa_activities")
      .eq("id", consultationId)
      .single()

    if (error) {
      console.error("[IPPA Activities] Fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
    }

    if (!consultation) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 })
    }

    const ippaActivities = consultation.ippa_activities as any

    if (!ippaActivities || !ippaActivities.activities) {
      return NextResponse.json({ activities: [] })
    }

    return NextResponse.json({
      activities: ippaActivities.activities,
      collectedAt: ippaActivities.collectedAt,
    })
  } catch (error) {
    console.error("[IPPA Activities] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

