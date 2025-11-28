"use client"

import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/**
 * 쿠팡 파트너스 활동 시 주의사항 컴포넌트
 * 제품 추천 필드 아래에 표시됩니다.
 */
export function PartnershipNotice() {
  return (
    <Alert className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
      <AlertTitle className="text-base font-semibold text-amber-900 dark:text-amber-100 mb-2">
        활동 시 주의 사항
      </AlertTitle>
      <AlertDescription className="space-y-4 text-sm text-amber-800 dark:text-amber-200">
        <div className="space-y-2">
          <p className="font-medium">1. 게시글 작성 시, 아래 문구를 반드시 기재해 주세요.</p>
          <p className="pl-4 border-l-2 border-amber-300 dark:border-amber-700 italic text-amber-900 dark:text-amber-100">
            "이 포스팅은 쿠팡 파트너스 상품이 포함되었으며, 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."
          </p>
          <p className="text-xs">
            쿠팡 파트너스의 활동은 공정거래위원회의 심사지침에 따라 추천, 보증인인 파트너스 회원과 당사의 경제적 이해관계에 대하여 공개하여야 합니다.
          </p>
          <p className="text-xs">
            자세한 내용은 "도움말&gt;자주묻는질문&gt;이용문의&gt;광고 삽입 시 대가성 문구를 써야하나요?"를 참고해 주세요.
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-medium">2. 바로가기 아이콘 이용 시 주의사항</p>
          <p className="text-xs">
            수신자의 사전 동의를 얻지 않은 메신저, SNS 등으로 메시지를 발송하는 행위는 불법 스팸 전송 행위로 간주되어 규제기관의 행정제재(3천만원 이하의 과태료) 또는 형사 처벌(1년 이하의 징역 또는 1천만원 이하의 벌금)의 대상이 될 수 있으니 이 점 유의하시기 바랍니다.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  )
}

