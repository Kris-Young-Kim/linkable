import { NextResponse } from "next/server";
import { ISO_CLASSES } from "@/lib/iso-classes";

/**
 * ISO 9999 Class(대분류) 필터 옵션 반환
 * 06 보조기 및 보철물 제외
 */
export async function GET() {
  const categories = ISO_CLASSES.map((c) => ({
    code: c.code,
    label: c.label,
    shortLabel: c.shortLabel,
  }));
  return NextResponse.json({ categories });
}
