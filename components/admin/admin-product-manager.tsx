"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CardActionButtons } from "@/components/ui/card-action-buttons"

type AdminProduct = {
  id: string
  name: string
  iso_code: string
  description: string | null
  price: number | null
  purchase_link: string | null
  image_url: string | null
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
  const [formValues, setFormValues] = useState({
    name: "",
    iso_code: "",
    price: "",
    purchase_link: "",
    description: "",
  })

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formValues.name,
          iso_code: formValues.iso_code,
          description: formValues.description || null,
          purchase_link: formValues.purchase_link || null,
          price: formValues.price ? Number(formValues.price) : null,
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
      })
    } catch (error) {
      console.error("[admin products] create_error", error)
      setErrorMessage(error instanceof Error ? error.message : "상품 등록을 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (id: string, updates: Partial<AdminProduct>) => {
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
  }

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/products/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}))
      throw new Error(errorPayload?.error ?? "상품 삭제에 실패했습니다.")
    }

    setProducts((prev) => prev.filter((product) => product.id !== id))
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
                상품 등록
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
        is_active: localValues.is_active,
      })
      setIsEditing(false)
    } catch (error) {
      console.error("[admin products] update_error", error)
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
              <Input
                value={localValues.name}
                onChange={(event) => setLocalValues((prev) => ({ ...prev, name: event.target.value }))}
              />
              <Input
                value={localValues.iso_code}
                onChange={(event) => setLocalValues((prev) => ({ ...prev, iso_code: event.target.value }))}
              />
              <Input
                value={localValues.price}
                onChange={(event) => setLocalValues((prev) => ({ ...prev, price: event.target.value }))}
                placeholder="가격"
                type="number"
              />
              <Input
                value={localValues.purchase_link}
                onChange={(event) => setLocalValues((prev) => ({ ...prev, purchase_link: event.target.value }))}
                placeholder="구매 링크"
              />
            </div>
            <Textarea
              value={localValues.description}
              onChange={(event) => setLocalValues((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={pending}>
                취소
              </Button>
              <Button size="sm" onClick={handleSave} disabled={pending}>
                저장
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {product.description || "설명이 등록되지 않았습니다."}
            </p>
            <div className="grid gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">가격:</span>{" "}
                {product.price ? `${product.price.toLocaleString()}원` : "미정"}
              </div>
              {product.purchase_link && (
                <div className="truncate">
                  <span className="text-muted-foreground">구매 링크:</span>{" "}
                  <a href={product.purchase_link} className="text-primary underline" target="_blank" rel="noreferrer">
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


