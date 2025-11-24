import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

const supabase = getSupabaseServerClient()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const isoCode = searchParams.get("iso_code")
  const limitParam = Number(searchParams.get("limit")) || 20

  let query = supabase.from("products").select(
    `
      id,
      name,
      iso_code,
      manufacturer,
      description,
      image_url,
      purchase_link,
      price,
      category
    `
  )

  if (isoCode) {
    query = query.ilike("iso_code", `${isoCode}%`)
  }

  const { data, error } = await query
    .eq("is_active", true)
    .limit(Math.min(Math.max(limitParam, 1), 50))

  if (error) {
    console.error("[products] fetch_error", error)
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 })
  }

  return NextResponse.json({ products: data ?? [] })
}

