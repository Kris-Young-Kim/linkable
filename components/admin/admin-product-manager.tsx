"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CardActionButtons } from "@/components/ui/card-action-buttons"

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

export function AdminProductManager({ initialProducts }: AdminProductManagerProps) {
  const [products, setProducts] = useState(initialProducts)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
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

  return (
    <div className="space-y-8">
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
            <Input
              required
              placeholder="상품 이름"
              value={formValues.name}
              onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              required
              placeholder="ISO 코드 (예: 12 22)"
              value={formValues.iso_code}
              onChange={(event) => setFormValues((prev) => ({ ...prev, iso_code: event.target.value }))}
            />
            <Input
              placeholder="가격 (원)"
              value={formValues.price}
              onChange={(event) => setFormValues((prev) => ({ ...prev, price: event.target.value }))}
              type="number"
              min="0"
              step="1000"
            />
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

      <div className="grid gap-6">
        {products.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              아직 등록된 상품이 없습니다.
            </CardContent>
          </Card>
        ) : (
          products.map((product) => (
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
                <Label htmlFor="edit-price" className="text-xs text-muted-foreground mb-1 block">
                  가격 (원)
                </Label>
                <Input
                  id="edit-price"
                  value={localValues.price}
                  onChange={(event) => setLocalValues((prev) => ({ ...prev, price: event.target.value }))}
                  type="number"
                  min="0"
                  step="1000"
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


