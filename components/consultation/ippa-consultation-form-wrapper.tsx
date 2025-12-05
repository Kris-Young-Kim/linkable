"use client"

import { useRouter } from "next/navigation"
import { IppaConsultationForm } from "@/components/ippa-consultation-form"

interface IppaConsultationFormWrapperProps {
  consultationId: string
  problemDescription?: string
}

export function IppaConsultationFormWrapper({
  consultationId,
  problemDescription,
}: IppaConsultationFormWrapperProps) {
  const router = useRouter()

  const handleComplete = (data: { activities: Array<{ icfCode: string; importance: number; currentDifficulty: number }> }) => {
    // 평가 완료 후 페이지 새로고침
    router.refresh()
  }

  const handleSkip = () => {
    // 건너뛰기 시 페이지 새로고침
    router.refresh()
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

