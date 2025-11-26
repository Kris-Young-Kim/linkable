"use client"

import { useRouter } from "next/navigation"
import { IppaForm } from "@/components/ippa-form"

interface IppaEvaluationPageClientProps {
  recommendationId: string
  productId: string
  productName?: string
  problemDescription?: string
}

export function IppaEvaluationPageClient({
  recommendationId,
  productId,
  productName,
  problemDescription,
}: IppaEvaluationPageClientProps) {
  const router = useRouter()

  return (
    <IppaForm
      recommendationId={recommendationId}
      productId={productId}
      productName={productName}
      problemDescription={problemDescription}
      onSuccess={() => {
        // 성공 시 페이지 새로고침하여 히스토리 업데이트
        router.refresh()
      }}
    />
  )
}

