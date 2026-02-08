import type { Metadata } from "next";
import { ProductsBrowseView } from "@/components/products-browse-view";
import type { ProductListItem } from "@/app/api/products/list/route";

const DEFAULT_PAGE_SIZE = 24;

async function fetchProductsList(params: {
  q?: string;
  category?: string;
  manufacturer?: string;
  price_min?: string;
  price_max?: string;
  sort?: string;
  page?: number;
}): Promise<{ products: ProductListItem[]; total: number; page: number; pageSize: number }> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set("q", params.q);
  if (params.category) searchParams.set("category", params.category);
  if (params.manufacturer) searchParams.set("manufacturer", params.manufacturer);
  if (params.price_min) searchParams.set("price_min", params.price_min);
  if (params.price_max) searchParams.set("price_max", params.price_max);
  if (params.sort) searchParams.set("sort", params.sort);
  searchParams.set("page", String(params.page ?? 1));
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

async function fetchManufacturers(): Promise<string[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/products/manufacturers`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.manufacturers ?? [];
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function ProductsPage({ searchParams }: Props) {
  const resolved = await searchParams;
  const q = str(resolved.q);
  const category = str(resolved.category);
  const manufacturer = str(resolved.manufacturer);
  const priceMin = str(resolved.price_min);
  const priceMax = str(resolved.price_max);
  const sort = str(resolved.sort) || "name_asc";

  const [listData, categories, manufacturers] = await Promise.all([
    fetchProductsList({ q, category, manufacturer, price_min: priceMin || undefined, price_max: priceMax || undefined, sort }),
    fetchCategories(),
    fetchManufacturers(),
  ]);

  return (
    <ProductsBrowseView
      initialProducts={listData.products}
      initialTotal={listData.total}
      initialPage={listData.page}
      pageSize={listData.pageSize}
      categories={categories}
      manufacturers={manufacturers}
    />
  );
}

export const metadata: Metadata = {
  title: "직접 찾기 — LinkAble 보조기기 카탈로그",
  description:
    "보조기기 카탈로그에서 검색하고 카테고리·제조사·가격 필터로 원하는 제품을 직접 찾아보세요.",
};
