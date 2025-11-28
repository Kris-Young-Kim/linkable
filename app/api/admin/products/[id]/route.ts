import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { verifyAdminAccess } from "@/lib/auth/verify-admin"

const supabase = getSupabaseServerClient()

const statusFromReason = (reason: "not_authenticated" | "insufficient_permissions" | "error") => {
  if (reason === "not_authenticated") return 401
  if (reason === "insufficient_permissions") return 403
  return 500
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await verifyAdminAccess()
  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: statusFromReason(access.reason) },
    )
  }

  const { id } = await context.params

  const body = (await request.json().catch(() => ({}))) as {
    name?: string
    iso_code?: string
    description?: string | null
    price?: number | string | null
    purchase_link?: string | null
    image_url?: string | null
    is_active?: boolean
  }

  if (!Object.keys(body).length) {
    return NextResponse.json({ error: "업데이트할 필드가 없습니다." }, { status: 400 })
  }

  const parsedPrice =
    typeof body.price === "string"
      ? Number(body.price)
      : typeof body.price === "number"
        ? body.price
        : undefined

  const updatePayload: Record<string, unknown> = {}
  if (body.name !== undefined) updatePayload.name = body.name
  if (body.iso_code !== undefined) updatePayload.iso_code = body.iso_code
  if (body.description !== undefined) updatePayload.description = body.description
  if (parsedPrice !== undefined) updatePayload.price = parsedPrice
  if (body.purchase_link !== undefined) updatePayload.purchase_link = body.purchase_link
  if (body.image_url !== undefined) updatePayload.image_url = body.image_url
  if (body.is_active !== undefined) updatePayload.is_active = body.is_active
  updatePayload.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("id", id)
    .select(
      `
      id,
      name,
      iso_code,
      description,
      price,
      purchase_link,
      image_url,
      is_active,
      updated_at
    `,
    )
    .single()

  if (error) {
    return NextResponse.json({ error: "상품을 수정하지 못했습니다." }, { status: 500 })
  }

  return NextResponse.json({ product: data })
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await verifyAdminAccess()
  if (!access.hasAccess) {
    return NextResponse.json(
      { error: "관리자 권한이 필요합니다." },
      { status: statusFromReason(access.reason) },
    )
  }

  const { id } = await context.params

  const { error } = await supabase.from("products").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: "상품을 삭제하지 못했습니다." }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}


