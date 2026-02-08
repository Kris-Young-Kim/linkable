import type { Metadata } from "next";
import { ProductsBrowseView } from "@/components/products-browse-view";
import type { ProductListItem } from "@/app/api/products/list/route";

const DEFAULT_PAGE_SIZE = 24;

async function fetchProductsList(params: {
  q?: string;
  category?: string;
}): Promise<{ products: ProductListItem[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.category) searchParams.set("category", params.category);
  searchParams.set("limit", String(DEFAULT_PAGE_SIZE));

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/products/list?${searchParams.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

async function fetchCategories(): Promise<string[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/products/categories`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.categories ?? [];
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const resolved = await searchParams;
  const q = typeof resolved.q === "string" ? resolved.q : "";
  const category = typeof resolved.category === "string" ? resolved.category : "";

  const [listData, categories] = await Promise.all([
    fetchProductsList({ q, category }),
    fetchCategories(),
  ]);

  return (
    <ProductsBrowseView
      initialProducts={listData.products}
      initialTotal={listData.total}
      categories={categories}
    />
  );
}

export const metadata: Metadata = {
  title: "직접 찾기 — LinkAble 보조기기 카탈로그",
  description:
    "보조기기 카탈로그에서 검색하고 카테고리 필터로 원하는 제품을 직접 찾아보세요.",
};
