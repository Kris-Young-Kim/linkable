"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search, Loader2, X, SlidersHorizontal } from "lucide-react";
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
import type { IsoCategory } from "@/lib/iso-classes";

const SORT_KEYS = ["name_asc", "name_desc", "price_asc", "price_desc", "newest"] as const;
const DEBOUNCE_MS = 350;
const PAGE_SIZE = 24;

type ProductsBrowseViewProps = {
  initialProducts: ProductCatalogItem[];
  initialTotal: number;
  initialPage: number;
  pageSize: number;
  categories: IsoCategory[];
};

export function ProductsBrowseView({
  initialProducts,
  initialTotal,
  initialPage,
  pageSize,
  categories,
}: ProductsBrowseViewProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const getParam = (key: string) => searchParams.get(key) ?? "";
  const [q, setQ] = useState(getParam("q"));
  const [category, setCategory] = useState(getParam("category"));
  const [priceMin, setPriceMin] = useState(getParam("price_min"));
  const [priceMax, setPriceMax] = useState(getParam("price_max"));
  const [sort, setSort] = useState(getParam("sort") || "name_asc");
  const [products, setProducts] = useState<ProductCatalogItem[]>(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [debouncedQ, setDebouncedQ] = useState(getParam("q"));
  const isInitialMount = useRef(true);

  const hasActiveFilters = category || priceMin || priceMax || debouncedQ.trim();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q]);

  const buildParams = useCallback(
    (overrides: { page?: number; q?: string } = {}) => {
      const p = new URLSearchParams();
      const search = (overrides.q ?? debouncedQ).trim();
      if (search) p.set("q", search);
      if (category) p.set("category", category);
      if (priceMin) p.set("price_min", priceMin);
      if (priceMax) p.set("price_max", priceMax);
      if (sort && sort !== "name_asc") p.set("sort", sort);
      const pageNum = overrides.page ?? 1;
      if (pageNum > 1) p.set("page", String(pageNum));
      return p;
    },
    [debouncedQ, category, priceMin, priceMax, sort]
  );

  const syncUrl = useCallback(() => {
    const p = buildParams();
    const url = p.toString() ? `/products?${p.toString()}` : "/products";
    router.replace(url, { scroll: false });
  }, [buildParams, router]);

  const fetchProducts = useCallback(
    async (opts: { page?: number; append?: boolean; showLoading?: boolean }) => {
      const pageNum = opts.page ?? 1;
      const doLoading = opts.showLoading !== false;
      if (opts.append) setLoadingMore(true);
      else if (doLoading) setLoading(true);
      try {
        const params = new URLSearchParams();
        const search = debouncedQ.trim();
        if (search) params.set("q", search);
        if (category) params.set("category", category);
        if (priceMin) params.set("price_min", priceMin);
        if (priceMax) params.set("price_max", priceMax);
        params.set("sort", sort);
        params.set("page", String(pageNum));
        params.set("limit", String(PAGE_SIZE));
        const res = await fetch(`/api/products/list?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const list = data.products ?? [];
        const totalCount = typeof data.total === "number" ? data.total : 0;
        if (opts.append) {
          setProducts((prev) => (pageNum === 1 ? list : [...prev, ...list]));
        } else {
          setProducts(list);
        }
        setTotal(totalCount);
        setPage(pageNum);
      } catch (e) {
        console.error("[ProductsBrowseView] fetch error:", e);
        if (!opts.append) {
          setProducts([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedQ, category, priceMin, priceMax, sort]
  );

  useEffect(() => {
    const showLoading = !isInitialMount.current;
    if (isInitialMount.current) isInitialMount.current = false;
    syncUrl();
    fetchProducts({ page: 1, showLoading });
  }, [debouncedQ, category, priceMin, priceMax, sort]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    fetchProducts({ page: nextPage, append: true });
    const p = buildParams({ page: nextPage });
    router.replace(`/products?${p.toString()}`, { scroll: false });
  };

  const handleClearFilters = () => {
    setQ("");
    setDebouncedQ("");
    setCategory("");
    setPriceMin("");
    setPriceMax("");
    setSort("name_asc");
    router.replace("/products", { scroll: false });
    fetchProducts({ page: 1, showLoading: true });
  };

  const resultCountText =
    total === 0
      ? t("products.resultCountNone")
      : t("products.resultCount").replace("{count}", String(total));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background shadow-sm transition-colors hover:bg-muted"
                aria-label={t("products.backToHome")}
              >
                <ArrowLeft className="size-6" aria-hidden="true" />
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {t("products.title")}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t("products.subtitle")}
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                placeholder={t("products.searchPlaceholder")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-12 pl-10 pr-10 text-base"
                aria-label={t("products.searchLabel")}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="검색어 지우기"
                >
                  <X className="size-5" />
                </button>
              )}
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
                <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={t("products.filterCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("products.allCategories")}</SelectItem>
                    {categories
                      .filter((c): c is IsoCategory => Boolean(c?.code))
                      .map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.shortLabel ?? c.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder={t("products.priceMin")}
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-28"
                  min={0}
                />
                <span className="text-muted-foreground">~</span>
                <Input
                  type="number"
                  placeholder={t("products.priceMax")}
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-28"
                  min={0}
                />
                <Select value={sort} onValueChange={(v) => setSort(v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={t("products.sort")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name_asc">{t("products.sortNameAsc")}</SelectItem>
                    <SelectItem value="name_desc">{t("products.sortNameDesc")}</SelectItem>
                    <SelectItem value="price_asc">{t("products.sortPriceAsc")}</SelectItem>
                    <SelectItem value="price_desc">{t("products.sortPriceDesc")}</SelectItem>
                    <SelectItem value="newest">{t("products.sortNewest")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  {t("products.clearFilters")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:px-6">
        {/* Result count */}
        <p className="mb-4 text-sm text-muted-foreground">{resultCountText}</p>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <Loader2 className="size-10 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
            <p className="text-lg font-medium text-foreground">{t("products.noResults")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("products.noResultsHint")}</p>
            {hasActiveFilters && (
              <Button className="mt-4" variant="outline" onClick={handleClearFilters}>
                {t("products.clearFilters")}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCatalogCard key={product.id} product={product} />
              ))}
            </div>
            {products.length < total && (
              <div className="mt-10 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="min-w-[200px]"
                >
                  {loadingMore ? (
                    <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                  ) : (
                    t("products.loadMore")
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
