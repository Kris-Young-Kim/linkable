"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface AutoGenerateRecommendationsProps {
  consultationId: string
  hasRecommendations: boolean
  hasIcfCodes: boolean
}

/**
 * 추천이 없고 ICF 코드가 있을 때 자동으로 추천을 생성하는 컴포넌트
 */
export function AutoGenerateRecommendations({
  consultationId,
  hasRecommendations,
  hasIcfCodes,
}: AutoGenerateRecommendationsProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasTried, setHasTried] = useState(false)

  useEffect(() => {
    // 추천이 없고 ICF 코드가 있고, 아직 시도하지 않았으면 자동 생성 시도
    if (!hasRecommendations && hasIcfCodes && !hasTried && !isGenerating) {
      generateRecommendations()
    }
  }, [hasRecommendations, hasIcfCodes, hasTried, isGenerating, consultationId])

  const generateRecommendations = async () => {
    setIsGenerating(true)
    setHasTried(true)

    try {
      const response = await fetch(`/api/products?consultationId=${consultationId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[Auto Generate Recommendations] Response:", {
          productCount: data.products?.length ?? 0,
          icfCodes: data.icfCodes,
          debug: data._debug,
        })
        
        if (data.products && data.products.length > 0) {
          // 추천이 생성되었으면 페이지 새로고침
          setTimeout(() => {
            router.refresh()
          }, 1000) // 1초 후 새로고침 (추천 저장 시간 확보)
        } else {
          // 추천이 생성되지 않은 경우 디버깅 정보 표시
          console.warn("[Auto Generate Recommendations] No products found:", {
            icfCodes: data.icfCodes,
            debug: data._debug,
          })
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("[Auto Generate Recommendations] API Error:", {
          status: response.status,
          error: errorData,
        })
      }
    } catch (error) {
      console.error("[Auto Generate Recommendations] Failed:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  // 추천이 있으면 아무것도 표시하지 않음
  if (hasRecommendations) {
    return null
  }

  // ICF 코드가 없으면 아무것도 표시하지 않음
  if (!hasIcfCodes) {
    return null
  }

  return (
    <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
      {isGenerating ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm">추천 보조기기를 생성하는 중...</p>
        </div>
      ) : (
        <>
          <p className="text-sm">추천된 보조기기가 없습니다.</p>
          <p className="text-xs mt-1 mb-4">
            상담 내용을 바탕으로 추천을 생성할 수 있습니다.
          </p>
          <Button
            onClick={generateRecommendations}
            disabled={isGenerating}
            size="sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : (
              "추천 생성하기"
            )}
          </Button>
        </>
      )}
    </div>
  )
}
