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
    console.error("[Admin Products API] Fetch error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      // 환경변수 확인 (민감 정보 제외)
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    })
    return NextResponse.json(
      { error: `상품을 불러오지 못했습니다: ${error.message}` },
      { status: 500 }
    )
  }

  console.log(`[Admin Products API] Fetched ${data?.length ?? 0} products`)
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
    products?: Array<{
      name: string
      iso_code: string
      price?: number | null
      purchase_link?: string | null
      image_url?: string | null
      manufacturer?: string | null
      description?: string | null
      category?: string | null
    }>
  }

  // 일괄 등록 (크롤링 결과 등록용)
  if (body.products && Array.isArray(body.products)) {
    let created = 0
    let updated = 0
    let failed = 0

    for (const product of body.products) {
      // name만 필수, iso_code는 선택 사항 (ICF 매칭 시에만 사용)
      if (!product.name || !product.name.trim()) {
        console.error(`[Admin Products] Validation failed:`, {
          name: product.name,
          iso_code: product.iso_code,
          hasName: !!product.name,
          nameTrimmed: product.name?.trim(),
        })
        failed++
        continue
      }

      // ISO 코드 정규화 (빈 문자열은 null로 변환, null일 때는 기본값 설정)
      const normalizedIsoCode = product.iso_code?.trim() || "N999999";

      try {
        const parsedPrice =
          typeof product.price === "string"
            ? Number(product.price)
            : typeof product.price === "number"
              ? product.price
              : null

        // purchase_link로 중복 확인
        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("purchase_link", product.purchase_link || "")
          .maybeSingle()

        if (existing) {
          // 업데이트
          const { error } = await supabase
            .from("products")
            .update({
              name: product.name,
              iso_code: normalizedIsoCode,
              description: product.description ?? null,
              price: parsedPrice,
              image_url: product.image_url ?? null,
              manufacturer: product.manufacturer ?? null,
              category: product.category ?? null,
              is_active: true,
            })
            .eq("id", existing.id)

          if (error) {
            console.error(`[Admin Products] Update error for ${product.name}:`, error)
            failed++
          } else {
            updated++
          }
        } else {
          // 생성
          const { error } = await supabase
            .from("products")
            .insert({
              name: product.name,
              iso_code: normalizedIsoCode,
              description: product.description ?? null,
              price: parsedPrice,
              purchase_link: product.purchase_link ?? null,
              image_url: product.image_url ?? null,
              manufacturer: product.manufacturer ?? null,
              category: product.category ?? null,
              is_active: true,
            })

          if (error) {
            console.error(`[Admin Products] Insert error for ${product.name}:`, {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
              product: {
                name: product.name,
                iso_code: product.iso_code,
                purchase_link: product.purchase_link,
              },
            })
            failed++
          } else {
            created++
            console.log(`[Admin Products] Product created: ${product.name}`)
          }
        }
      } catch (error) {
        console.error(`[Admin Products] Error processing ${product.name}:`, error)
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      failed,
      total: body.products.length,
    })
  }

  // 단일 상품 등록
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "상품 이름은 필수입니다." }, { status: 400 })
  }

  // ISO 코드 정규화 (선택 사항)
  const normalizedIsoCode = body.iso_code?.trim() || null;

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
      iso_code: normalizedIsoCode,
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


