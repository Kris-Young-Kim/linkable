import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getIsoPrefixForClass } from "@/lib/iso-classes";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 48;

export type ProductListItem = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  purchase_link: string | null;
  price: number | null;
  category: string | null;
  manufacturer: string | null;
  iso_code: string | null;
  iso_name: string | null;
  updated_at: string | null;
};

const SORT_OPTIONS = {
  name_asc: { column: "name", ascending: true },
  name_desc: { column: "name", ascending: false },
  price_asc: { column: "price", ascending: true },
  price_desc: { column: "price", ascending: false },
  newest: { column: "updated_at", ascending: false },
} as const;

type SortKey = keyof typeof SORT_OPTIONS;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const category = searchParams.get("category")?.trim() || "";
  const priceMin = searchParams.get("price_min");
  const priceMax = searchParams.get("price_max");
  const sortKey = (searchParams.get("sort")?.trim() || "name_asc") as SortKey;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_PAGE_SIZE), 10))
  );
  const from = (page - 1) * pageSize;

  const supabase = getSupabaseServerClient();
  const sort = SORT_OPTIONS[sortKey] ?? SORT_OPTIONS.name_asc;

  let query = supabase
    .from("products")
    .select(
      `
      id,
      name,
      description,
      image_url,
      purchase_link,
      price,
      category,
      manufacturer,
      updated_at,
      iso_code_id,
      iso_codes!iso_code_id (
        code,
        name
      )
    `,
      { count: "exact" }
    )
    .eq("is_active", true)
    .not("iso_code_id", "is", null);

  if (category) {
    const isoPrefix = getIsoPrefixForClass(category);
    if (isoPrefix) {
      const { data } = await supabase
        .from("iso_codes")
        .select("id")
        .ilike("code", `${isoPrefix}%`);
      const isoIds = (data ?? []).map((r: { id: string }) => r.id);
      if (isoIds.length > 0) {
        query = query.in("iso_code_id", isoIds);
      }
    }
  }
  if (priceMin != null && priceMin !== "") {
    const n = parseInt(priceMin, 10);
    if (!Number.isNaN(n) && n >= 0) query = query.gte("price", n);
  }
  if (priceMax != null && priceMax !== "") {
    const n = parseInt(priceMax, 10);
    if (!Number.isNaN(n) && n >= 0) query = query.lte("price", n);
  }

  if (q) {
    const safe = q.slice(0, 100).replace(/'/g, "''");
    query = query.or(
      `name.ilike.%${safe}%,description.ilike.%${safe}%,category.ilike.%${safe}%,manufacturer.ilike.%${safe}%`
    );
  }

  query = query.order(sort.column, { ascending: sort.ascending, nullsFirst: false });
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("[products/list] fetch error:", error);
    return NextResponse.json(
      { error: "제품 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  const items: ProductListItem[] = (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    image_url: p.image_url ?? null,
    purchase_link: p.purchase_link ?? null,
    price: p.price ?? null,
    category: p.category ?? null,
    manufacturer: p.manufacturer ?? null,
    iso_code: p.iso_codes?.code ?? null,
    iso_name: p.iso_codes?.name ?? null,
    updated_at: p.updated_at ?? null,
  }));

  const total = typeof count === "number" ? count : items.length;

  return NextResponse.json({
    products: items,
    total,
    page,
    pageSize,
  });
}
