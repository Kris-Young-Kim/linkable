"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Filter, ArrowUpDown, X, Trash2 } from "lucide-react"

import { ProductRecommendationCard } from "@/components/product-recommendation-card"
import { useLanguage } from "@/components/language-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { trackEvent } from "@/lib/analytics"
import { PartnershipNotice } from "@/components/recommendations/partnership-notice"
import type { RecommendationProduct } from "@/components/recommendations-view"
import { CardActionButtons } from "@/components/ui/card-action-buttons"

// Re-export the type for convenience
export type { RecommendationProduct }

type SortOption = "rank" | "price-asc" | "price-desc" | "name"
type FilterOption = "all" | "clicked" | "not-clicked"

interface RecommendationsViewWithFiltersProps {
  products: RecommendationProduct[]
  errorMessage?: string | null
  consultationId: string
  initialSort?: string
  initialFilter?: string
}

export function RecommendationsViewWithFilters({
  products,
  errorMessage,
  consultationId,
  initialSort = "rank",
  initialFilter = "all",
}: RecommendationsViewWithFiltersProps) {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [localProducts, setLocalProducts] = useState(products)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>(
    (initialSort as SortOption) || "rank",
  )
  const [filterBy, setFilterBy] = useState<FilterOption>(
    (initialFilter as FilterOption) || "all",
  )

  // 추천 목록 조회 이벤트 추적
  useEffect(() => {
    if (localProducts.length > 0) {
      trackEvent("recommendations_viewed", {
        count: localProducts.length,
        consultation_id: consultationId,
      })
    }
  }, [localProducts.length, consultationId])

  useEffect(() => {
    setLocalProducts(products)
  }, [products])

  // 필터링 및 정렬
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...localProducts]

    // 필터링
    if (filterBy === "clicked") {
      // 클릭된 항목만 표시 (recommendation_id가 있고 클릭된 것으로 가정)
      // 실제로는 recommendation_id가 있으면 클릭 가능한 항목
      filtered = filtered.filter((p) => p.recommendation_id)
    } else if (filterBy === "not-clicked") {
      filtered = filtered.filter((p) => !p.recommendation_id)
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "rank":
          // match_score가 높은 순 (또는 rank 순)
          const scoreA = a.match_score ?? 0
          const scoreB = b.match_score ?? 0
          return scoreB - scoreA
        case "price-asc":
          const priceA = typeof a.price === "number" ? a.price : typeof a.price === "string" ? parseFloat(a.price) : Infinity
          const priceB = typeof b.price === "number" ? b.price : typeof b.price === "string" ? parseFloat(b.price) : Infinity
          return priceA - priceB
        case "price-desc":
          const priceA2 = typeof a.price === "number" ? a.price : typeof a.price === "string" ? parseFloat(a.price) : -Infinity
          const priceB2 = typeof b.price === "number" ? b.price : typeof b.price === "string" ? parseFloat(b.price) : -Infinity
          return priceB2 - priceA2
        case "name":
          return a.name.localeCompare(b.name, "ko")
        default:
          return 0
      }
    })

    return filtered
  }, [localProducts, sortBy, filterBy])

  const handleRemoveProduct = useCallback(
    async (product: RecommendationProduct) => {
      if (removingId) {
        return
      }

      if (!window.confirm("이 추천을 목록에서 제거할까요?")) {
        return
      }

      setRemoveError(null)
      setRemovingId(product.id)

      try {
        if (product.recommendation_id) {
          const response = await fetch(`/api/recommendations/${product.recommendation_id}`, {
            method: "DELETE",
          })

          if (!response.ok) {
            const errorPayload = await response.json().catch(() => ({}))
            throw new Error(errorPayload?.error ?? "Failed to delete recommendation")
          }
        }

        setLocalProducts((prev) => prev.filter((item) => item.id !== product.id))
      } catch (error) {
        console.error("[recommendations] remove_error", error)
        setRemoveError("추천을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.")
      } finally {
        setRemovingId(null)
      }
    },
    [removingId],
  )

  // URL 업데이트
  const updateUrl = (newSort: SortOption, newFilter: FilterOption) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newSort !== "rank") {
      params.set("sort", newSort)
    } else {
      params.delete("sort")
    }
    if (newFilter !== "all") {
      params.set("filter", newFilter)
    } else {
      params.delete("filter")
    }
    router.push(`/recommendations/${consultationId}?${params.toString()}`, { scroll: false })
  }

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort)
    updateUrl(newSort, filterBy)
  }

  const handleFilterChange = (newFilter: FilterOption) => {
    setFilterBy(newFilter)
    updateUrl(sortBy, newFilter)
  }

  const clearFilters = () => {
    setSortBy("rank")
    setFilterBy("all")
    router.push(`/recommendations/${consultationId}`, { scroll: false })
  }

  const hasActiveFilters = sortBy !== "rank" || filterBy !== "all"

  if (errorMessage) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-center text-sm text-red-700">
        {errorMessage}
      </div>
    )
  }

  if (filteredAndSortedProducts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
        <p className="text-lg font-medium text-foreground">
          {localProducts.length === 0
            ? "아직 추천이 생성되지 않았습니다"
            : "필터 조건에 맞는 추천이 없습니다"}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {localProducts.length === 0
            ? "상담을 더 진행해 주세요"
            : "다른 필터를 선택해 보세요"}
        </p>
        {hasActiveFilters && (
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            <X className="size-4 mr-2" />
            필터 초기화
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 필터 및 정렬 컨트롤 */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">필터:</span>
          <div className="flex gap-2">
            <Button
              variant={filterBy === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("all")}
            >
              전체
            </Button>
            <Button
              variant={filterBy === "clicked" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("clicked")}
            >
              클릭됨
            </Button>
            <Button
              variant={filterBy === "not-clicked" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("not-clicked")}
            >
              미클릭
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">정렬:</span>
          <div className="flex gap-2">
            <Button
              variant={sortBy === "rank" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortChange("rank")}
            >
              추천순
            </Button>
            <Button
              variant={sortBy === "price-asc" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortChange("price-asc")}
            >
              가격 낮은순
            </Button>
            <Button
              variant={sortBy === "price-desc" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortChange("price-desc")}
            >
              가격 높은순
            </Button>
            <Button
              variant={sortBy === "name" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortChange("name")}
            >
              이름순
            </Button>
          </div>
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto">
            <X className="size-4 mr-2" />
            초기화
          </Button>
        )}
      </div>

      {removeError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {removeError}
        </div>
      )}

      {/* 결과 개수 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredAndSortedProducts.length}개의 추천
          {localProducts.length !== filteredAndSortedProducts.length && ` (전체 ${localProducts.length}개 중)`}
        </p>
      </div>

      {/* 추천 카드 목록 */}
      <div className="space-y-6">
        {filteredAndSortedProducts.map((product) => (
            <ProductRecommendationCard
              key={product.id}
              productName={product.name}
              functionalSupport={product.category ?? t("recommendations.defaultCategory")}
              description={product.description}
              imageUrl={product.image_url ?? undefined}
              isoCode={product.iso_code}
              isoLabel={product.match_label}
              matchScore={product.match_score}
              matchReason={product.match_reason}
              matchedIcf={product.matched_icf}
              price={product.price}
              purchaseLink={product.purchase_link}
              recommendationId={product.recommendation_id}
              adminActions={
                <CardActionButtons
                  onDelete={() => handleRemoveProduct(product)}
                  deleteLabel="추천 삭제"
                  isDeleteDisabled={removingId === product.id}
                />
              }
            />
        ))}
      </div>

      {/* 쿠팡 파트너스 활동 시 주의사항 */}
      <PartnershipNotice />
    </div>
  )
}

