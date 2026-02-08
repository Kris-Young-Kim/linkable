import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("category")
    .eq("is_active", true)
    .not("category", "is", null);

  if (error) {
    console.error("[products/categories] fetch error:", error);
    return NextResponse.json(
      { error: "카테고리 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  const categories = [...new Set((data ?? []).map((r) => r.category).filter(Boolean))] as string[];
  categories.sort((a, b) => a.localeCompare(b, "ko"));

  return NextResponse.json({ categories });
}
