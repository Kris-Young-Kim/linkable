import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("manufacturer")
    .eq("is_active", true)
    .not("manufacturer", "is", null);

  if (error) {
    console.error("[products/manufacturers] fetch error:", error);
    return NextResponse.json(
      { error: "제조사 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }

  const manufacturers = [
    ...new Set((data ?? []).map((r) => r.manufacturer).filter(Boolean)),
  ] as string[];
  manufacturers.sort((a, b) => a.localeCompare(b, "ko"));

  return NextResponse.json({ manufacturers });
}
