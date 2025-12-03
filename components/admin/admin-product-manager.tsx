"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CardActionButtons } from "@/components/ui/card-action-buttons"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, X, Upload, Download, Sparkles, Loader2, FileText, Globe, CheckSquare, Square } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { IsoCodeSelector } from "./iso-code-selector"

type AdminProduct = {
  id: string
  name: string
  iso_code: string
  description: string | null
  price: number | null
  purchase_link: string | null
  image_url: string | null
  manufacturer: string | null
  category: string | null
  is_active: boolean
  updated_at: string | null
}

type AdminProductManagerProps = {
  initialProducts: AdminProduct[]
}

type SortOption = "updated-desc" | "updated-asc" | "name-asc" | "name-desc" | "price-asc" | "price-desc"

export function AdminProductManager({ initialProducts }: AdminProductManagerProps) {
  const [products, setProducts] = useState(initialProducts)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 제품 목록 새로고침 함수
  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error("[Admin Products] 제품 목록 새로고침 실패:", error)
    }
  }, [])
  const [formValues, setFormValues] = useState({
    name: "",
    iso_code: "",
    price: "",
    purchase_link: "",
    description: "",
    image_url: "",
    manufacturer: "",
    category: "",
  })

  // ISO 코드 자동 추천
  const [isoSuggestions, setIsoSuggestions] = useState<Array<{ iso: string; label: string; description: string }>>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)

  // 일괄 업로드
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    created: number
    updated: number
    failed: number
    total: number
  } | null>(null)

  // 크롤링
  const [crawlValues, setCrawlValues] = useState({
    keyword: "",
    category: "",
    categories: "",
    isoCode: "",
    platform: "all",
    max: "10",
    productUrl: "", // 개별 제품 URL
  })
  const [isCrawling, setIsCrawling] = useState(false)
  const [crawlResult, setCrawlResult] = useState<string | null>(null)
  const [crawlPreview, setCrawlPreview] = useState<Array<{
    id: string
    name: string
    price: number | null
    purchase_link: string | null
    image_url: string | null
    iso_code: string
    description?: string | null
    manufacturer?: string | null
    category?: string | null
  }>>([])
  const [selectedPreviewProducts, setSelectedPreviewProducts] = useState<Set<string>>(new Set())
  const [crawlLogs, setCrawlLogs] = useState<string[]>([])
  const [isRegistering, setIsRegistering] = useState(false)

  // 필터링 및 검색 상태
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIsoCode, setSelectedIsoCode] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortOption>("updated-desc")

  // ISO 코드 자동 추천 (상품명 입력 시)
  const fetchIsoSuggestions = useCallback(async (productName: string) => {
    if (!productName || productName.length < 2) {
      setIsoSuggestions([])
      return
    }

    setIsLoadingSuggestions(true)
    try {
      const response = await fetch("/api/admin/iso-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName }),
      })

      if (response.ok) {
        const data = await response.json()
        setIsoSuggestions(data.suggestions || [])
        
        // 첫 번째 추천이 있으면 자동으로 선택 (선택적)
        if (data.suggestions && data.suggestions.length > 0 && !formValues.iso_code) {
          // 자동 선택은 하지 않고, 사용자가 선택하도록 함
        }
      }
    } catch (error) {
      console.error("[Admin Products] ISO suggestion error:", error)
    } finally {
      setIsLoadingSuggestions(false)
    }
  }, [formValues.iso_code])

  // 상품명 변경 시 ISO 코드 추천
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formValues.name) {
        fetchIsoSuggestions(formValues.name)
      } else {
        setIsoSuggestions([])
      }
    }, 500) // 500ms 디바운스

    return () => clearTimeout(timer)
  }, [formValues.name, fetchIsoSuggestions])

  // 일괄 업로드 핸들러
  const handleFileUpload = async () => {
    if (!uploadFile) {
      setErrorMessage("파일을 선택해주세요.")
      return
    }

    setIsUploading(true)
    setErrorMessage(null)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append("file", uploadFile)

      const response = await fetch("/api/admin/products/import", {
        method: "POST",
        body: formData,
      }).catch((error) => {
        console.error("[Admin Products] Fetch error:", error)
        throw new Error(`네트워크 오류: ${error.message}`)
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new Error(errorPayload?.error ?? `파일 업로드 실패 (${response.status})`)
      }

      const result = await response.json()
      setUploadResult(result)
      setUploadFile(null)

      // 상품 목록 새로고침
      const productsResponse = await fetch("/api/admin/products")
      if (productsResponse.ok) {
        const data = await productsResponse.json()
        setProducts(data.products || [])
      }

      setSuccessMessage(
        `일괄 등록 완료: 생성 ${result.created}개, 업데이트 ${result.updated}개, 실패 ${result.failed}개`
      )
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (error) {
      console.error("[Admin Products] Upload error:", error)
      setErrorMessage(error instanceof Error ? error.message : "파일 업로드 실패")
    } finally {
      setIsUploading(false)
    }
  }

  // 크롤링 실행 핸들러 (미리보기 모드)
  const handleCrawl = async () => {
    // 개별 제품 URL이 있으면 URL 크롤링 우선 (즉시 등록)
    if (crawlValues.productUrl) {
      setIsCrawling(true)
      setErrorMessage(null)
      setCrawlResult(null)
      setCrawlPreview([])
      setCrawlLogs([])
      addCrawlLog("개별 제품 URL 크롤링 시작...")

      try {
        const response = await fetch("/api/admin/products/crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productUrl: crawlValues.productUrl,
            isoCode: crawlValues.isoCode || undefined,
            platform: crawlValues.platform,
          }),
        })

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}))
          throw new Error(errorPayload?.error ?? "제품 크롤링 실패")
        }

        const result = await response.json()
        addCrawlLog(`제품 크롤링 완료: ${result.product?.name || "알 수 없음"}`)
        setCrawlResult(
          result.message || `제품 크롤링 완료: ${result.created > 0 ? "생성" : "업데이트"} (${result.product?.name || "알 수 없음"})`
        )
        setSuccessMessage(null)
        // 제품 목록 새로고침
        await fetchProducts()
      } catch (error) {
        console.error("제품 크롤링 오류:", error)
        const errorMsg = error instanceof Error ? error.message : "제품 크롤링 실패"
        addCrawlLog(`오류: ${errorMsg}`, true)
        setErrorMessage(errorMsg)
      } finally {
        setIsCrawling(false)
      }
      return
    }

    if (!crawlValues.keyword && !crawlValues.category && !crawlValues.categories) {
      setErrorMessage("키워드, 카테고리 또는 제품 URL을 입력해주세요.")
      return
    }

    setIsCrawling(true)
    setErrorMessage(null)
    setCrawlResult(null)
    setCrawlPreview([])
    setSelectedPreviewProducts(new Set())
    setCrawlLogs([])
    addCrawlLog("크롤링 시작...")

    try {
      const response = await fetch("/api/admin/products/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: crawlValues.keyword || undefined,
          category: crawlValues.category || undefined,
          categories: crawlValues.categories || undefined,
          isoCode: crawlValues.isoCode || undefined,
          platform: crawlValues.platform,
          max: crawlValues.max ? parseInt(crawlValues.max) : undefined,
          preview: true, // 미리보기 모드
        }),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new Error(errorPayload?.error ?? "크롤링 실행 실패")
      }

      const result = await response.json()
      
      if (result.preview && result.products) {
        addCrawlLog(`${result.products.length}개 상품 수집 완료`)
        if (result.errors && result.errors.length > 0) {
          addCrawlLog(`경고: ${result.errors.length}개 오류 발생`, true)
          result.errors.forEach((err: string) => addCrawlLog(`  - ${err}`, true))
        }
        setCrawlPreview(result.products)
        setCrawlResult(`${result.products.length}개 상품을 수집했습니다. 아래에서 선택하여 등록하세요.`)
        // 모든 상품 자동 선택
        setSelectedPreviewProducts(new Set(result.products.map((p: { id: string }) => p.id)))
      } else {
        // 미리보기 모드가 아닌 경우 (레거시)
        setCrawlResult(result.message || "크롤링이 시작되었습니다.")
        setSuccessMessage("크롤링이 시작되었습니다. 잠시 후 상품 목록을 확인해주세요.")
        setTimeout(() => setSuccessMessage(null), 5000)
        setTimeout(async () => {
          await fetchProducts()
        }, 3000)
      }
    } catch (error) {
      console.error("[Admin Products] Crawl error:", error)
      const errorMsg = error instanceof Error ? error.message : "크롤링 실행 실패"
      addCrawlLog(`오류: ${errorMsg}`, true)
      setErrorMessage(errorMsg)
    } finally {
      setIsCrawling(false)
    }
  }

  // 크롤링 로그 추가
  const addCrawlLog = (message: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString("ko-KR")
    setCrawlLogs((prev) => [...prev, `[${timestamp}] ${isError ? "❌" : "✓"} ${message}`])
  }

  // 선택한 상품 등록
  const handleRegisterSelected = async () => {
    if (selectedPreviewProducts.size === 0) {
      setErrorMessage("등록할 상품을 선택해주세요.")
      return
    }

    setIsRegistering(true)
    setErrorMessage(null)
    addCrawlLog(`${selectedPreviewProducts.size}개 상품 등록 시작...`)

    try {
      const response = await fetch("/api/admin/products/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: crawlValues.keyword || undefined,
          category: crawlValues.category || undefined,
          categories: crawlValues.categories || undefined,
          isoCode: crawlValues.isoCode || undefined,
          platform: crawlValues.platform,
          max: crawlValues.max ? parseInt(crawlValues.max) : undefined,
          selectedProducts: Array.from(selectedPreviewProducts),
        }),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new Error(errorPayload?.error ?? "상품 등록 실패")
      }

      const result = await response.json()
      addCrawlLog(`등록 완료: ${result.created}개 생성, ${result.updated}개 업데이트`)
      if (result.errors && result.errors.length > 0) {
        addCrawlLog(`실패: ${result.failed}개`, true)
      }
      
      setSuccessMessage(
        `등록 완료: ${result.created}개 생성, ${result.updated}개 업데이트${result.failed > 0 ? `, ${result.failed}개 실패` : ""}`
      )
      setTimeout(() => setSuccessMessage(null), 5000)

      // 상품 목록 새로고침
      await fetchProducts()
      
      // 미리보기 초기화
      setCrawlPreview([])
      setSelectedPreviewProducts(new Set())
      setCrawlResult(null)
    } catch (error) {
      console.error("[Admin Products] Register error:", error)
      const errorMsg = error instanceof Error ? error.message : "상품 등록 실패"
      addCrawlLog(`오류: ${errorMsg}`, true)
      setErrorMessage(errorMsg)
    } finally {
      setIsRegistering(false)
    }
  }

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      console.log("[Admin Products] Creating product:", formValues.name)
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formValues.name,
          iso_code: formValues.iso_code,
          description: formValues.description || null,
          purchase_link: formValues.purchase_link || null,
          price: formValues.price ? Number(formValues.price) : null,
          image_url: formValues.image_url || null,
          manufacturer: formValues.manufacturer || null,
          category: formValues.category || null,
        }),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}))
        throw new Error(errorPayload?.error ?? "상품 등록을 실패했습니다.")
      }

      const payload = (await response.json()) as { product: AdminProduct }
      setProducts((prev) => [payload.product, ...prev])
      setFormValues({
        name: "",
        iso_code: "",
        price: "",
        purchase_link: "",
        description: "",
        image_url: "",
        manufacturer: "",
        category: "",
      })
      setSuccessMessage(`"${payload.product.name}" 상품이 성공적으로 등록되었습니다.`)
      console.log("[Admin Products] Product created successfully:", payload.product.id)
      
      // 성공 메시지 3초 후 자동 제거
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error("[Admin Products] Create error:", error)
      setErrorMessage(error instanceof Error ? error.message : "상품 등록을 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (id: string, updates: Partial<AdminProduct>) => {
    console.log(`[Admin Products] Updating product ${id}:`, updates)
    const response = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}))
      throw new Error(errorPayload?.error ?? "상품 수정에 실패했습니다.")
    }

    const payload = (await response.json()) as { product: AdminProduct }
    setProducts((prev) => prev.map((product) => (product.id === id ? payload.product : product)))
    console.log(`[Admin Products] Product updated successfully: ${id}`)
  }

  const handleDelete = async (id: string) => {
    console.log(`[Admin Products] Deleting product ${id}`)
    const response = await fetch(`/api/admin/products/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}))
      throw new Error(errorPayload?.error ?? "상품 삭제에 실패했습니다.")
    }

    setProducts((prev) => prev.filter((product) => product.id !== id))
    console.log(`[Admin Products] Product deleted successfully: ${id}`)
  }

  const productCountByIso = useMemo(() => {
    return products.reduce<Record<string, number>>((acc, item) => {
      acc[item.iso_code] = (acc[item.iso_code] ?? 0) + 1
      return acc
    }, {})
  }, [products])

  // 고유한 ISO 코드 목록
  const uniqueIsoCodes = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.iso_code))).sort()
  }, [products])

  // 고유한 카테고리 목록
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category).filter((cat): cat is string => Boolean(cat)))).sort()
  }, [products])

  // 필터링 및 정렬된 상품 목록
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products]

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.iso_code.toLowerCase().includes(query) ||
          product.manufacturer?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query),
      )
    }

    // ISO 코드 필터
    if (selectedIsoCode !== "all") {
      filtered = filtered.filter((product) => product.iso_code === selectedIsoCode)
    }

    // 카테고리 필터
    if (selectedCategory !== "all") {
      filtered = filtered.filter((product) => product.category === selectedCategory)
    }

    // 상태 필터
    if (selectedStatus !== "all") {
      const isActive = selectedStatus === "active"
      filtered = filtered.filter((product) => product.is_active === isActive)
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "updated-desc":
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        case "updated-asc":
          return new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime()
        case "name-asc":
          return a.name.localeCompare(b.name, "ko")
        case "name-desc":
          return b.name.localeCompare(a.name, "ko")
        case "price-asc":
          return (a.price || 0) - (b.price || 0)
        case "price-desc":
          return (b.price || 0) - (a.price || 0)
        default:
          return 0
      }
    })

    return filtered
  }, [products, searchQuery, selectedIsoCode, selectedCategory, selectedStatus, sortBy])

  return (
    <div className="space-y-8">
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="single">단일 등록</TabsTrigger>
          <TabsTrigger value="bulk">일괄 업로드</TabsTrigger>
          <TabsTrigger value="crawl">크롤링</TabsTrigger>
          <TabsTrigger value="list">상품 목록</TabsTrigger>
        </TabsList>

        {/* 단일 상품 등록 */}
        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle>새 상품 등록</CardTitle>
              <CardDescription>ISO 9999 코드에 해당하는 상품을 빠르게 추가하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              {errorMessage && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                  {successMessage}
                </div>
              )}
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
                <div className="md:col-span-2">
                  <Label htmlFor="product-name" className="mb-2 block">
                    상품 이름
                    {isLoadingSuggestions && (
                      <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />
                    )}
                  </Label>
                  <Input
                    id="product-name"
                    required
                    placeholder="상품 이름을 입력하세요 (ISO 코드 자동 추천)"
                    value={formValues.name}
                    onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  {isoSuggestions.length > 0 && (
                    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-900">
                        <Sparkles className="h-4 w-4" />
                        추천 ISO 코드
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isoSuggestions.map((suggestion) => (
                          <Badge
                            key={suggestion.iso}
                            variant="secondary"
                            className="cursor-pointer hover:bg-blue-100"
                            onClick={() => {
                              setFormValues((prev) => ({ ...prev, iso_code: suggestion.iso }))
                            }}
                          >
                            ISO {suggestion.iso} - {suggestion.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="iso-code" className="mb-2 block">
                    ISO 코드 <span className="text-red-500">*</span>
                  </Label>
                  <IsoCodeSelector
                    value={formValues.iso_code}
                    onValueChange={(value) => setFormValues((prev) => ({ ...prev, iso_code: value }))}
                    suggestions={isoSuggestions}
                  />
                </div>
            <Input
              placeholder="구매 링크"
              value={formValues.purchase_link}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  purchase_link: event.target.value,
                }))
              }
            />
            <Input
              placeholder="이미지 URL"
              value={formValues.image_url}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  image_url: event.target.value,
                }))
              }
            />
            <Input
              placeholder="제조사"
              value={formValues.manufacturer}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  manufacturer: event.target.value,
                }))
              }
            />
            <Input
              placeholder="카테고리 (예: coupang, naver)"
              value={formValues.category}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  category: event.target.value,
                }))
              }
            />
            <div className="md:col-span-2">
              <Textarea
                placeholder="설명"
                value={formValues.description}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                rows={3}
              />
            </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "등록 중..." : "상품 등록"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 일괄 업로드 */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>일괄 업로드</CardTitle>
              <CardDescription>CSV, JSON 또는 PDF 카탈로그 파일로 여러 상품을 한 번에 등록하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                  {successMessage}
                </div>
              )}
              {uploadResult && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
                  <div className="text-sm font-medium text-blue-900">업로드 결과</div>
                  <div className="mt-2 text-sm text-blue-700">
                    <div>✅ 생성: {uploadResult.created}개</div>
                    <div>🔄 업데이트: {uploadResult.updated}개</div>
                    {uploadResult.failed > 0 && (
                      <div className="text-red-600">❌ 실패: {uploadResult.failed}개</div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      총 {uploadResult.total}개 중 {uploadResult.created + uploadResult.updated}개 처리 완료
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file-upload" className="mb-2 block">
                    파일 선택 (CSV, JSON 또는 PDF)
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv,.json,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setUploadFile(file)
                          setUploadResult(null)
                        }
                      }}
                      className="cursor-pointer"
                    />
                    {uploadFile && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        {uploadFile.name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-muted bg-muted/50 p-4">
                  <div className="mb-2 text-sm font-medium">파일 형식 예시</div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div>
                      <strong>CSV:</strong> name,iso_code,purchase_link,image_url,manufacturer,category,description
                    </div>
                    <div>
                      <strong>JSON:</strong> [{"{"}"name": "상품명", "iso_code": "15 09", "purchase_link": "https://..."{"}"}]
                    </div>
                    <div>
                      <strong>PDF:</strong> 제품 카탈로그 PDF 파일. 보조기기 관련 제품명과 가격 정보를 자동으로 추출합니다. (개선된 필터링 적용)
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground/70">
                      * 가격(price) 필드는 선택 사항입니다. 생략 가능합니다.
                      * PDF는 보조기기 관련 키워드가 포함된 제품만 추출됩니다.
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleFileUpload}
                  disabled={!uploadFile || isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      업로드 중...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      파일 업로드 및 등록
                    </>
                  )}
                </Button>
                <div className="text-center">
                  <a
                    href="/scripts/example-products.csv"
                    download
                    className="text-sm text-primary hover:underline"
                  >
                    <Download className="mr-1 inline h-4 w-4" />
                    CSV 예제 파일 다운로드
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 크롤링 */}
        <TabsContent value="crawl">
          <Card>
            <CardHeader>
              <CardTitle>웹 크롤링</CardTitle>
              <CardDescription>웹사이트에서 상품 정보를 자동으로 수집하여 등록합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                  {successMessage}
                </div>
              )}
              {crawlResult && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
                  {crawlResult}
                </div>
              )}
              <div className="space-y-4">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <Label htmlFor="crawl-product-url" className="mb-2 block font-medium">
                    개별 제품 URL (우선 사용)
                  </Label>
                  <Input
                    id="crawl-product-url"
                    placeholder="예: https://www.wheelopia.co.kr/shop/goods/goods_view.php?goodsno=50"
                    value={crawlValues.productUrl}
                    onChange={(e) => setCrawlValues((prev) => ({ ...prev, productUrl: e.target.value }))}
                    className="font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    특정 제품 상세 페이지 URL을 입력하면 해당 제품만 크롤링합니다.
                  </p>
                </div>
                <div className="text-center text-sm text-muted-foreground">또는</div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="crawl-keyword" className="mb-2 block">
                    검색 키워드
                  </Label>
                  <Input
                    id="crawl-keyword"
                    placeholder="예: 무게조절 식기"
                    value={crawlValues.keyword}
                    onChange={(e) => setCrawlValues((prev) => ({ ...prev, keyword: e.target.value, productUrl: "" }))}
                  />
                </div>
                <div>
                  <Label htmlFor="crawl-category" className="mb-2 block">
                    카테고리 (또는 여러 카테고리: 쉼표로 구분)
                  </Label>
                  <Input
                    id="crawl-category"
                    placeholder="예: 휠체어 또는 휠체어,워커"
                    value={crawlValues.categories || crawlValues.category}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value.includes(",")) {
                        setCrawlValues((prev) => ({ ...prev, categories: value, category: "" }))
                      } else {
                        setCrawlValues((prev) => ({ ...prev, category: value, categories: "" }))
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="crawl-iso" className="mb-2 block">
                    ISO 코드
                  </Label>
                  <IsoCodeSelector
                    value={crawlValues.isoCode}
                    onValueChange={(value) => setCrawlValues((prev) => ({ ...prev, isoCode: value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="crawl-platform" className="mb-2 block">
                    플랫폼
                  </Label>
                  <Select
                    value={crawlValues.platform}
                    onValueChange={(value) => setCrawlValues((prev) => ({ ...prev, platform: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="coupang">쿠팡</SelectItem>
                      <SelectItem value="naver">네이버 쇼핑</SelectItem>
                      <SelectItem value="ablelife">에이블라이프</SelectItem>
                      <SelectItem value="carelifemall">케어라이프몰</SelectItem>
                      <SelectItem value="willbe">윌비</SelectItem>
                      <SelectItem value="11st">11번가</SelectItem>
                      <SelectItem value="wheelopia">휠로피아</SelectItem>
                      <SelectItem value="sk-easymove">SK 이지무브</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="crawl-max" className="mb-2 block">
                    최대 수집 개수
                  </Label>
                  <Input
                    id="crawl-max"
                    type="number"
                    min="1"
                    max="50"
                    value={crawlValues.max}
                    onChange={(e) => setCrawlValues((prev) => ({ ...prev, max: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                onClick={handleCrawl}
                disabled={
                  isCrawling ||
                  (!crawlValues.productUrl && !crawlValues.keyword && !crawlValues.category && !crawlValues.categories)
                }
                className="w-full"
              >
                {isCrawling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    크롤링 중...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    크롤링 시작
                  </>
                )}
              </Button>
              <div className="rounded-lg border border-muted bg-muted/50 p-4">
                <div className="mb-2 text-sm font-medium">사용 예시</div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>• 개별 제품 URL: "https://www.wheelopia.co.kr/shop/goods/goods_view.php?goodsno=50", ISO: "12 23"</div>
                  <div>• 키워드: "무게조절 식기", ISO: "15 09", 플랫폼: "쿠팡"</div>
                  <div>• 카테고리: "워커", ISO: "12 03", 플랫폼: "에이블라이프"</div>
                  <div>• 여러 카테고리: "휠체어,워커", ISO: "12 03", 플랫폼: "전체"</div>
                </div>
              </div>

              {/* 크롤링 로그 */}
              {crawlLogs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">크롤링 로그</CardTitle>
                    <CardDescription>크롤링 진행 상황 및 오류 메시지</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-32 w-full rounded-md border p-4">
                      <div className="space-y-1 text-xs font-mono">
                        {crawlLogs.map((log, idx) => (
                          <div
                            key={idx}
                            className={log.includes("❌") || log.includes("오류") ? "text-red-600" : "text-muted-foreground"}
                          >
                            {log}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* 크롤링 결과 미리보기 */}
              {crawlPreview.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">크롤링 결과 미리보기</CardTitle>
                        <CardDescription>
                          {selectedPreviewProducts.size}개 선택됨 / 전체 {crawlPreview.length}개
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedPreviewProducts.size === crawlPreview.length) {
                              setSelectedPreviewProducts(new Set())
                            } else {
                              setSelectedPreviewProducts(new Set(crawlPreview.map((p) => p.id)))
                            }
                          }}
                        >
                          {selectedPreviewProducts.size === crawlPreview.length ? "전체 해제" : "전체 선택"}
                        </Button>
                        <Button
                          onClick={handleRegisterSelected}
                          disabled={selectedPreviewProducts.size === 0 || isRegistering}
                          size="sm"
                        >
                          {isRegistering ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              등록 중...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              선택한 상품 등록 ({selectedPreviewProducts.size}개)
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedPreviewProducts.size === crawlPreview.length && crawlPreview.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPreviewProducts(new Set(crawlPreview.map((p) => p.id)))
                                  } else {
                                    setSelectedPreviewProducts(new Set())
                                  }
                                }}
                              />
                            </TableHead>
                            <TableHead>상품명</TableHead>
                            <TableHead>ISO 코드</TableHead>
                            <TableHead>가격</TableHead>
                            <TableHead>구매 링크</TableHead>
                            <TableHead>이미지</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {crawlPreview.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedPreviewProducts.has(product.id)}
                                  onCheckedChange={(checked) => {
                                    const newSelected = new Set(selectedPreviewProducts)
                                    if (checked) {
                                      newSelected.add(product.id)
                                    } else {
                                      newSelected.delete(product.id)
                                    }
                                    setSelectedPreviewProducts(newSelected)
                                  }}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{product.iso_code}</Badge>
                              </TableCell>
                              <TableCell>
                                {product.price ? `${product.price.toLocaleString()}원` : "-"}
                              </TableCell>
                              <TableCell>
                                {product.purchase_link ? (
                                  <a
                                    href={product.purchase_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline text-xs truncate max-w-[200px] block"
                                  >
                                    {product.purchase_link}
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {product.image_url ? (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="h-12 w-12 object-cover rounded"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none"
                                    }}
                                  />
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 상품 목록 */}
        <TabsContent value="list">
          <Card>
        <CardHeader>
          <CardTitle>상품 목록</CardTitle>
          <CardDescription>
            {filteredAndSortedProducts.length === products.length
              ? `전체 ${products.length}개 상품`
              : `검색 결과: ${filteredAndSortedProducts.length}개 / 전체 ${products.length}개`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 검색 및 필터 컨트롤 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* 검색 */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="상품명, ISO 코드, 제조사 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* ISO 코드 필터 */}
            <Select value={selectedIsoCode} onValueChange={setSelectedIsoCode}>
              <SelectTrigger>
                <SelectValue placeholder="ISO 코드" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 ISO 코드</SelectItem>
                {uniqueIsoCodes.map((iso) => (
                  <SelectItem key={iso} value={iso}>
                    ISO {iso} ({productCountByIso[iso]}개)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 카테고리 필터 */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 카테고리</SelectItem>
                {uniqueCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 정렬 */}
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger>
                <SelectValue placeholder="정렬" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated-desc">최근 업데이트순</SelectItem>
                <SelectItem value="updated-asc">오래된 업데이트순</SelectItem>
                <SelectItem value="name-asc">이름순 (가나다)</SelectItem>
                <SelectItem value="name-desc">이름순 (역순)</SelectItem>
                <SelectItem value="price-asc">가격 낮은순</SelectItem>
                <SelectItem value="price-desc">가격 높은순</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 상태 필터 */}
          <div className="flex items-center gap-4">
            <Label className="text-sm text-muted-foreground">상태:</Label>
            <div className="flex gap-2">
              <Button
                variant={selectedStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("all")}
              >
                전체
              </Button>
              <Button
                variant={selectedStatus === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("active")}
              >
                활성
              </Button>
              <Button
                variant={selectedStatus === "inactive" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus("inactive")}
              >
                비활성
              </Button>
            </div>
          </div>

          {/* 필터 초기화 버튼 */}
          {(searchQuery || selectedIsoCode !== "all" || selectedCategory !== "all" || selectedStatus !== "all") && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedIsoCode("all")
                  setSelectedCategory("all")
                  setSelectedStatus("all")
                }}
              >
                <X className="mr-2 size-4" />
                필터 초기화
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {filteredAndSortedProducts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {products.length === 0
                ? "아직 등록된 상품이 없습니다."
                : "검색 조건에 맞는 상품이 없습니다."}
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              count={productCountByIso[product.iso_code]}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

type ProductCardProps = {
  product: AdminProduct
  count: number
  onUpdate: (id: string, updates: Partial<AdminProduct>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function ProductCard({ product, count, onUpdate, onDelete }: ProductCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [pending, setPending] = useState(false)
  const [localValues, setLocalValues] = useState({
    name: product.name,
    iso_code: product.iso_code,
    price: product.price?.toString() ?? "",
    purchase_link: product.purchase_link ?? "",
    description: product.description ?? "",
    image_url: product.image_url ?? "",
    manufacturer: product.manufacturer ?? "",
    category: product.category ?? "",
    is_active: product.is_active,
  })
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSave = async () => {
    setPending(true)
    setErrorMessage(null)
    try {
      await onUpdate(product.id, {
        name: localValues.name,
        iso_code: localValues.iso_code,
        price: localValues.price ? Number(localValues.price) : null,
        purchase_link: localValues.purchase_link || null,
        description: localValues.description || null,
        image_url: localValues.image_url || null,
        manufacturer: localValues.manufacturer || null,
        category: localValues.category || null,
        is_active: localValues.is_active,
      })
      setIsEditing(false)
    } catch (error) {
      console.error("[Admin Products] Update error:", error)
      setErrorMessage(error instanceof Error ? error.message : "상품 수정에 실패했습니다.")
    } finally {
      setPending(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`"${product.name}" 상품을 삭제할까요?`)) {
      return
    }

    setPending(true)
    setErrorMessage(null)
    try {
      await onDelete(product.id)
    } catch (error) {
      console.error("[admin products] delete_error", error)
      setErrorMessage(error instanceof Error ? error.message : "상품 삭제에 실패했습니다.")
      setPending(false)
    }
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-xl">{product.name}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">ISO {product.iso_code}</Badge>
            <Badge variant={product.is_active ? "outline" : "destructive"}>{product.is_active ? "활성" : "비활성"}</Badge>
            <span className="text-xs text-muted-foreground">
              {count}개 상품 / 업데이트 {product.updated_at ? new Date(product.updated_at).toLocaleDateString("ko-KR") : "-"}
            </span>
          </CardDescription>
        </div>
        {!isEditing && (
          <CardActionButtons
            onEdit={() => setIsEditing(true)}
            onDelete={handleDelete}
            editLabel="상품 수정"
            deleteLabel="상품 삭제"
            isDeleteDisabled={pending}
          />
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {isEditing ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="edit-name" className="text-xs text-muted-foreground mb-1 block">
                  상품 이름
                </Label>
                <Input
                  id="edit-name"
                  value={localValues.name}
                  onChange={(event) => setLocalValues((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-iso" className="text-xs text-muted-foreground mb-1 block">
                  ISO 코드
                </Label>
                <Input
                  id="edit-iso"
                  value={localValues.iso_code}
                  onChange={(event) => setLocalValues((prev) => ({ ...prev, iso_code: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-link" className="text-xs text-muted-foreground mb-1 block">
                  구매 링크
                </Label>
                <Input
                  id="edit-link"
                  value={localValues.purchase_link}
                  onChange={(event) => setLocalValues((prev) => ({ ...prev, purchase_link: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-image" className="text-xs text-muted-foreground mb-1 block">
                  이미지 URL
                </Label>
                <Input
                  id="edit-image"
                  value={localValues.image_url}
                  onChange={(event) => setLocalValues((prev) => ({ ...prev, image_url: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-manufacturer" className="text-xs text-muted-foreground mb-1 block">
                  제조사
                </Label>
                <Input
                  id="edit-manufacturer"
                  value={localValues.manufacturer}
                  onChange={(event) => setLocalValues((prev) => ({ ...prev, manufacturer: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-category" className="text-xs text-muted-foreground mb-1 block">
                  카테고리
                </Label>
                <Input
                  id="edit-category"
                  value={localValues.category}
                  onChange={(event) => setLocalValues((prev) => ({ ...prev, category: event.target.value }))}
                  placeholder="예: coupang, naver"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-active"
                  checked={localValues.is_active}
                  onCheckedChange={(checked) => setLocalValues((prev) => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="edit-active" className="text-sm">
                  활성 상태
                </Label>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-description" className="text-xs text-muted-foreground mb-1 block">
                설명
              </Label>
              <Textarea
                id="edit-description"
                value={localValues.description}
                onChange={(event) => setLocalValues((prev) => ({ ...prev, description: event.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={pending}>
                취소
              </Button>
              <Button size="sm" onClick={handleSave} disabled={pending}>
                {pending ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {product.image_url && (
              <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {product.description || "설명이 등록되지 않았습니다."}
            </p>
            <div className="grid gap-2 text-sm">
              {product.price && (
                <div>
                  <span className="text-muted-foreground">가격:</span>{" "}
                  <span className="font-medium">{product.price.toLocaleString()}원</span>
                </div>
              )}
              {product.manufacturer && (
                <div>
                  <span className="text-muted-foreground">제조사:</span> <span>{product.manufacturer}</span>
                </div>
              )}
              {product.category && (
                <div>
                  <span className="text-muted-foreground">카테고리:</span>{" "}
                  <Badge variant="outline">{product.category}</Badge>
                </div>
              )}
              {product.purchase_link && (
                <div className="truncate">
                  <span className="text-muted-foreground">구매 링크:</span>{" "}
                  <a
                    href={product.purchase_link}
                    className="text-primary underline hover:text-primary/80"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {product.purchase_link}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}


