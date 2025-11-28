import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { verifyAdminAccess } from "@/lib/auth/verify-admin"

const supabase = getSupabaseServerClient()

const mapReasonToStatus = (reason: "not_authenticated" | "insufficient_permissions" | "error") => {
  if (reason === "not_authenticated") return 401
  if (reason === "insufficient_permissions") return 403
  return 500
}

export async function GET() {
  const access = await verifyAdminAccess()

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: mapReasonToStatus(access.reason) },
    )
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      iso_code,
      description,
      price,
      purchase_link,
      image_url,
      manufacturer,
      category,
      is_active,
      updated_at
    `,
    )
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("[Admin Products] Fetch error:", error)
    return NextResponse.json({ error: "상품을 불러오지 못했습니다." }, { status: 500 })
  }

  console.log(`[Admin Products] Fetched ${data?.length ?? 0} products`)
  return NextResponse.json({ products: data ?? [] })
}

export async function POST(request: Request) {
  const access = await verifyAdminAccess()

  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: mapReasonToStatus(access.reason) },
    )
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string
    iso_code?: string
    description?: string | null
    price?: number | string | null
    purchase_link?: string | null
    image_url?: string | null
    manufacturer?: string | null
    category?: string | null
    is_active?: boolean
  }

  if (!body.name || !body.iso_code) {
    return NextResponse.json({ error: "상품 이름과 ISO 코드는 필수입니다." }, { status: 400 })
  }

  const parsedPrice =
    typeof body.price === "string"
      ? Number(body.price)
      : typeof body.price === "number"
        ? body.price
        : null

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: body.name,
      iso_code: body.iso_code,
      description: body.description ?? null,
      price: parsedPrice,
      purchase_link: body.purchase_link ?? null,
      image_url: body.image_url ?? null,
      manufacturer: body.manufacturer ?? null,
      category: body.category ?? null,
      is_active: body.is_active ?? true,
    })
    .select(
      `
      id,
      name,
      iso_code,
      description,
      price,
      purchase_link,
      image_url,
      manufacturer,
      category,
      is_active,
      updated_at
    `,
    )
    .single()

  if (error) {
    console.error("[Admin Products] Create error:", error)
    return NextResponse.json({ error: "상품을 추가하지 못했습니다." }, { status: 500 })
  }

  console.log(`[Admin Products] Product created: ${data.id} - ${data.name}`)
  return NextResponse.json({ product: data }, { status: 201 })
}


