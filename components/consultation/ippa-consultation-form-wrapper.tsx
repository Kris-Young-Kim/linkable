"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IppaConsultationForm } from "@/components/ippa-consultation-form";

interface IppaConsultationFormWrapperProps {
  consultationId: string;
  problemDescription?: string;
}

export function IppaConsultationFormWrapper({
  consultationId,
  problemDescription,
}: IppaConsultationFormWrapperProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async (data: {
    activities: Array<{
      icfCode: string;
      importance: number;
      currentDifficulty: number;
    }>;
  }) => {
    setIsSubmitting(true);
    setError(null);

    try {
      console.log("[K-IPPA Consultation] 저장 시작:", {
        consultationId,
        activityCount: data.activities.length,
      });

      const response = await fetch("/api/consultations/ippa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consultationId,
          activities: data.activities,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "K-IPPA 데이터 저장에 실패했습니다."
        );
      }

      const result = await response.json();
      console.log("[K-IPPA Consultation] 저장 성공:", result);

      // 성공 후 페이지 새로고침
      router.refresh();
    } catch (err) {
      console.error("[K-IPPA Consultation] 저장 오류:", err);
      setError(
        err instanceof Error
          ? err.message
          : "K-IPPA 데이터 저장 중 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    // 건너뛰기 시 페이지 새로고침
    router.refresh();
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/20 dark:text-red-200">
          {error}
        </div>
      )}
      <IppaConsultationForm
        consultationId={consultationId}
        onComplete={handleComplete}
        onSkip={handleSkip}
        problemDescription={problemDescription}
      />
    </div>
  );
}
