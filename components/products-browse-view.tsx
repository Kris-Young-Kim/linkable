"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCatalogCard, type ProductCatalogItem } from "@/components/product-catalog-card";

type ProductsBrowseViewProps = {
  initialProducts: ProductCatalogItem[];
  initialTotal: number;
  categories: string[];
};

export function ProductsBrowseView({
  initialProducts,
  initialTotal,
  categories,
}: ProductsBrowseViewProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q") ?? "";
  const categoryParam = searchParams.get("category") ?? "";

  const [q, setQ] = useState(qParam);
  const [category, setCategory] = useState(categoryParam);
  const [products, setProducts] = useState<ProductCatalogItem[]>(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [debouncedQ, setDebouncedQ] = useState(qParam);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const fetchProducts = useCallback(
    async (search: string, cat: string, showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("q", search);
        if (cat) params.set("category", cat);
        params.set("limit", "24");
        const res = await fetch(`/api/products/list?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setProducts(data.products ?? []);
        setTotal(data.total ?? 0);
      } catch (e) {
        console.error("[ProductsBrowseView] fetch error:", e);
        setProducts([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const nextQ = debouncedQ.trim();
    const nextCat = category.trim();
    const params = new URLSearchParams(searchParams.toString());
    if (nextQ) params.set("q", nextQ);
    else params.delete("q");
    if (nextCat) params.set("category", nextCat);
    else params.delete("category");
    const newUrl = params.toString() ? `?${params.toString()}` : "/products";
    router.replace(newUrl, { scroll: false });
    const showLoading = !isInitialMount.current;
    if (isInitialMount.current) isInitialMount.current = false;
    fetchProducts(nextQ, nextCat, showLoading);
  }, [debouncedQ, category, router, searchParams, fetchProducts]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="inline-flex size-11 items-center justify-center rounded-xl border border-border bg-background shadow-sm transition-colors hover:bg-muted"
                aria-label={t("products.backToHome")}
              >
                <ArrowLeft className="size-6" aria-hidden="true" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {t("products.title")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("products.subtitle")}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  placeholder={t("products.searchPlaceholder")}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-9"
                  aria-label={t("products.searchPlaceholder")}
                />
              </div>
              <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder={t("products.filterCategory")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("products.allCategories")}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:px-6">
        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <Loader2 className="size-10 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
            <p className="text-lg font-medium text-foreground">
              {t("products.noResults")}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCatalogCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
