"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import { User, Users } from "lucide-react"

type UserRole = "user" | "manager"

export default function OnboardingPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
    setError(null)
  }

  const handleSubmit = async () => {
    if (!selectedRole) {
      setError("역할을 선택해주세요")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/user/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: selectedRole }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "역할 저장에 실패했습니다")
      }

      // 성공 시 홈으로 리다이렉트
      router.push("/")
      router.refresh()
    } catch (err) {
      console.error("[Onboarding] Role save error:", err)
      setError(err instanceof Error ? err.message : t("onboarding.error"))
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <Card className="border-2">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl md:text-3xl">
              {t("onboarding.title")}
            </CardTitle>
            <CardDescription className="text-base">
              {t("onboarding.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 역할 선택 카드들 */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* 사용자 (당사자) */}
              <button
                type="button"
                onClick={() => handleRoleSelect("user")}
                className={`group relative rounded-lg border-2 p-6 text-left transition-all hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  selectedRole === "user"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent/50"
                }`}
                aria-pressed={selectedRole === "user"}
                aria-label={t("onboarding.role.user.title")}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                      selectedRole === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <User className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">
                      {t("onboarding.role.user.title")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("onboarding.role.user.description")}
                    </p>
                  </div>
                  {selectedRole === "user" && (
                    <div className="absolute right-4 top-4 h-5 w-5 rounded-full bg-primary" aria-hidden="true">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              </button>

              {/* 보호자/전문가 */}
              <button
                type="button"
                onClick={() => handleRoleSelect("manager")}
                className={`group relative rounded-lg border-2 p-6 text-left transition-all hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  selectedRole === "manager"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent/50"
                }`}
                aria-pressed={selectedRole === "manager"}
                aria-label={t("onboarding.role.manager.title")}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                      selectedRole === "manager"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Users className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">
                      {t("onboarding.role.manager.title")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("onboarding.role.manager.description")}
                    </p>
                  </div>
                  {selectedRole === "manager" && (
                    <div className="absolute right-4 top-4 h-5 w-5 rounded-full bg-primary" aria-hidden="true">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* 제출 버튼 */}
            <Button
              onClick={handleSubmit}
              disabled={!selectedRole || isSubmitting}
              size="lg"
              className="w-full min-h-[48px] text-base font-semibold"
            >
              {isSubmitting ? t("onboarding.selecting") : t("onboarding.continue")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

