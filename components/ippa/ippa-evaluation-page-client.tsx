"use client"

import { useRouter } from "next/navigation"
import { IppaForm } from "@/components/ippa-form"

interface IppaEvaluationPageClientProps {
  recommendationId: string
  productId: string
  productName?: string
  problemDescription?: string
  consultationId?: string
}

export function IppaEvaluationPageClient({
  recommendationId,
  productId,
  productName,
  problemDescription,
  consultationId,
}: IppaEvaluationPageClientProps) {
  const router = useRouter()

  return (
    <IppaForm
      recommendationId={recommendationId}
      productId={productId}
      productName={productName}
      problemDescription={problemDescription}
      consultationId={consultationId}
      onSuccess={() => {
        // 성공 시 페이지 새로고침하여 히스토리 업데이트
        router.refresh()
      }}
    />
  )
}

