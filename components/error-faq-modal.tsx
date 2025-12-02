"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HelpCircle, AlertCircle, RefreshCw, Mail, ExternalLink } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { cn } from "@/lib/utils"

interface ErrorFaqModalProps {
  error?: Error | string | null
  onRetry?: () => void
  className?: string
}

/**
 * 에러 대응 가이드 및 FAQ 모달
 * 
 * 사용자가 에러를 만났을 때 도움을 받을 수 있는 가이드와 FAQ를 제공합니다.
 */
export function ErrorFaqModal({
  error,
  onRetry,
  className,
}: ErrorFaqModalProps) {
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)

  const errorMessage = error instanceof Error ? error.message : error || "알 수 없는 오류"

  const faqItems = [
    {
      question: t("errorFaq.q1") || "페이지가 로드되지 않아요",
      answer: t("errorFaq.a1") || "브라우저를 새로고침하거나 캐시를 삭제해보세요. 문제가 계속되면 다른 브라우저에서 시도해보세요.",
      solution: "refresh",
    },
    {
      question: t("errorFaq.q2") || "상담이 중단되었어요",
      answer: t("errorFaq.a2") || "네트워크 연결을 확인하고 페이지를 새로고침하세요. 상담 내용은 자동으로 저장되므로 이전 대화를 이어서 진행할 수 있습니다.",
      solution: "refresh",
    },
    {
      question: t("errorFaq.q3") || "추천이 표시되지 않아요",
      answer: t("errorFaq.a3") || "상담을 완료했는지 확인하세요. 상담이 완료되지 않았다면 채팅을 계속 진행하여 ICF 분석을 완료해야 합니다.",
      solution: "consultation",
    },
    {
      question: t("errorFaq.q4") || "로그인이 안 돼요",
      answer: t("errorFaq.a4") || "브라우저 쿠키를 확인하고, 다른 브라우저나 시크릿 모드에서 시도해보세요. 문제가 계속되면 비밀번호를 재설정하세요.",
      solution: "auth",
    },
    {
      question: t("errorFaq.q5") || "이미지가 업로드되지 않아요",
      answer: t("errorFaq.a5") || "이미지 파일 크기가 5MB 이하인지 확인하세요. 지원 형식: JPG, PNG, GIF. 문제가 계속되면 다른 이미지로 시도해보세요.",
      solution: "upload",
    },
    {
      question: t("errorFaq.q6") || "K-IPPA 평가가 제출되지 않아요",
      answer: t("errorFaq.a6") || "모든 필수 항목을 입력했는지 확인하세요. 네트워크 연결을 확인하고 다시 시도해보세요.",
      solution: "refresh",
    },
  ]

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      window.location.reload()
    }
  }

  const handleContactSupport = () => {
    const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@linkable.ai"
    const subject = encodeURIComponent(`[LinkAble 에러 리포트] ${errorMessage}`)
    const body = encodeURIComponent(
      `안녕하세요.\n\n다음 오류가 발생했습니다:\n\n${errorMessage}\n\n발생 시간: ${new Date().toLocaleString("ko-KR")}\n브라우저: ${navigator.userAgent}\n\n문제 설명:\n`
    )
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("gap-2", className)}
          aria-label={t("errorFaq.openGuide") || "에러 가이드 열기"}
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          {t("errorFaq.help") || "도움말"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
            {t("errorFaq.title") || "에러 대응 가이드"}
          </DialogTitle>
          <DialogDescription>
            {t("errorFaq.description") ||
              "문제가 발생했나요? 아래 가이드를 참고하거나 고객 지원팀에 문의하세요."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 현재 에러 표시 */}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm font-semibold text-destructive mb-2">
                {t("errorFaq.currentError") || "현재 발생한 오류"}
              </p>
              <p className="text-sm text-foreground font-mono break-words">
                {errorMessage}
              </p>
            </div>
          )}

          {/* 빠른 해결 방법 */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">
              {t("errorFaq.quickSolutions") || "빠른 해결 방법"}
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t("errorFaq.retry") || "다시 시도"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t("errorFaq.reload") || "페이지 새로고침"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleContactSupport}
                className="gap-2"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {t("errorFaq.contactSupport") || "고객 지원 문의"}
              </Button>
            </div>
          </div>

          {/* FAQ 섹션 */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-foreground">
              {t("errorFaq.faqTitle") || "자주 묻는 질문 (FAQ)"}
            </h3>
            <div className="space-y-3">
              {faqItems.map((item, index) => (
                <details
                  key={index}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <summary className="cursor-pointer font-medium text-foreground hover:text-primary transition-colors">
                    {item.question}
                  </summary>
                  <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    <p>{item.answer}</p>
                    {item.solution === "refresh" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.location.reload()}
                        className="mt-2 gap-2"
                      >
                        <RefreshCw className="h-3 w-3" aria-hidden="true" />
                        {t("errorFaq.reloadPage") || "페이지 새로고침"}
                      </Button>
                    )}
                    {item.solution === "consultation" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          window.location.href = "/chat"
                          setIsOpen(false)
                        }}
                        className="mt-2 gap-2"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        {t("errorFaq.goToChat") || "채팅으로 이동"}
                      </Button>
                    )}
                    {item.solution === "auth" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          window.location.href = "/sign-in"
                          setIsOpen(false)
                        }}
                        className="mt-2 gap-2"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        {t("errorFaq.goToSignIn") || "로그인 페이지로 이동"}
                      </Button>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* 추가 도움말 */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              {t("errorFaq.needMoreHelp") || "추가 도움이 필요하신가요?"}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {t("errorFaq.contactDescription") ||
                "문제가 해결되지 않으면 고객 지원팀에 문의해주세요. 빠르게 도와드리겠습니다."}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleContactSupport}
                className="gap-2"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                {t("errorFaq.emailSupport") || "이메일로 문의"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(
                    process.env.NEXT_PUBLIC_SUPPORT_URL || "https://linkable.ai/support",
                    "_blank",
                    "noopener,noreferrer"
                  )
                }}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {t("errorFaq.supportCenter") || "지원 센터"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

