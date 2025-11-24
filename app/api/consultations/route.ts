import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"

const supabase = getSupabaseServerClient()

async function ensureUserRecord(clerkUserId: string) {
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

  const fullName = user?.fullName ?? user?.username ?? null

  const { data: insertData, error: insertError } = await supabase
    .from("users")
    .insert({
      clerk_id: clerkUserId,
      email,
      name: fullName,
    })
    .select("id")
    .single()

  if (insertError) {
    throw insertError
  }

  logEvent({
    category: "system",
    action: "user_created",
    payload: { clerkUserId },
  })

  return insertData.id
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userRowId = await ensureUserRecord(userId)

  const { data, error } = await supabase
    .from("consultations")
    .select(
      `
        id,
        title,
        status,
        created_at,
        updated_at,
        analysis_results:analysis_results(id, summary, icf_codes),
        recommendations:recommendations(id, product_id, is_clicked)
      `
    )
    .eq("user_id", userRowId)
    .order("created_at", { ascending: false })

  if (error) {
    logEvent({
      category: "consultation",
      action: "fetch_error",
      payload: { error },
      level: "error",
    })
    return NextResponse.json({ error: "Failed to load consultations" }, { status: 500 })
  }

  return NextResponse.json({ consultations: data ?? [] })
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { title } = (await request.json().catch(() => ({}))) as { title?: string }
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  const userRowId = await ensureUserRecord(userId)

  const { data, error } = await supabase
    .from("consultations")
    .insert({
      title,
      user_id: userRowId,
    })
    .select("*")
    .single()

  if (error) {
    logEvent({
      category: "consultation",
      action: "create_error",
      payload: { error },
      level: "error",
    })
    return NextResponse.json({ error: "Failed to create consultation" }, { status: 500 })
  }

  logEvent({
    category: "consultation",
    action: "created",
    payload: { userId, consultationId: data.id },
  })

  return NextResponse.json({ consultation: data }, { status: 201 })
}

