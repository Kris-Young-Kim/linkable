"use client"

import { useRouter } from "next/navigation"
import { IppaConsultationForm } from "@/components/ippa-consultation-form"

interface BaselineEvaluationClientProps {
  consultationId: string
  problemDescription?: string
}

export function BaselineEvaluationClient({
  consultationId,
  problemDescription,
}: BaselineEvaluationClientProps) {
  const router = useRouter()

  const handleComplete = async (data: { activities: Array<{ icfCode: string; importance: number; currentDifficulty: number }> }) => {
    // 평가 완료 후 추천 페이지로 리다이렉트
    router.push(`/recommendations/${consultationId}`)
  }

  const handleSkip = () => {
    // 건너뛰기 시 추천 페이지로 리다이렉트
    router.push(`/recommendations/${consultationId}`)
  }

  return (
    <IppaConsultationForm
      consultationId={consultationId}
      onComplete={handleComplete}
      onSkip={handleSkip}
      problemDescription={problemDescription}
    />
  )
}

