"use client"

import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/**
 * 제휴 마케팅 안내 컴포넌트
 * 제품 추천 필드 아래에 표시됩니다.
 */
export function PartnershipNotice() {
  return (
    <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
      <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-500" />
      <AlertTitle className="text-base font-semibold text-blue-900 dark:text-blue-100 mb-2">
        안내 사항
      </AlertTitle>
      <AlertDescription className="space-y-4 text-sm text-blue-800 dark:text-blue-200">
        <div className="space-y-2">
          <p className="font-medium">1. 서비스 이용 안내</p>
          <p className="text-xs">
            LinkAble은 공공 및 민간 쇼핑몰의 상품 정보를 수집하여 제공합니다. 제공되는 정보는 수집 시점에 따라 실제와 다를 수 있으므로 구매 전 반드시 판매 사이트의 정보를 확인해 주시기 바랍니다.
          </p>
          <p className="text-xs">
            본 서비스의 추천 결과는 AI 분석에 기반한 참고용이며, 중대한 보조기기 선택 시에는 반드시 전문가의 자문을 받으시기 바랍니다.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  )
}
