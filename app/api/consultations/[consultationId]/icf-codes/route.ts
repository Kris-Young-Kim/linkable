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

    // analysis_results에서 추출된 ICF 코드 조회
    const { data: analysis, error } = await supabase
      .from("analysis_results")
      .select("icf_codes")
      .eq("consultation_id", consultationId)
      .single()

    if (error) {
      console.error("[ICF Codes] Fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch ICF codes" }, { status: 500 })
    }

    if (!analysis || !analysis.icf_codes) {
      return NextResponse.json({ icfCodes: [] })
    }

    const icfCodes = analysis.icf_codes as { b?: string[]; d?: string[]; e?: string[] }
    
    // 모든 ICF 코드를 하나의 배열로 합치기
    const allCodes = [
      ...(icfCodes.b || []),
      ...(icfCodes.d || []),
      ...(icfCodes.e || []),
    ]

    return NextResponse.json({ icfCodes: allCodes })
  } catch (error) {
    console.error("[ICF Codes] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

