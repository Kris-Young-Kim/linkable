"use client"

import { Sparkles } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export function TypingIndicator() {
  const { t } = useLanguage()

  return (
    <div className="flex gap-3" role="status" aria-live="polite" aria-label={t("chat.typing")}>
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-accent shadow-lg animate-pulse"
        aria-hidden="true"
      >
        <Sparkles className="size-5 text-white animate-pulse" />
      </div>
      <div className="max-w-[75%] rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 px-5 py-4 dark:from-blue-950 dark:to-blue-900/30 border border-blue-200/50 dark:border-blue-800/50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span
              className="size-2.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]"
              aria-hidden="true"
            ></span>
            <span
              className="size-2.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]"
              aria-hidden="true"
            ></span>
            <span
              className="size-2.5 animate-bounce rounded-full bg-primary"
              aria-hidden="true"
            ></span>
          </div>
          <p className="text-sm font-medium text-foreground animate-pulse">
            {t("chat.thinking")}
          </p>
        </div>
        <span className="sr-only">{t("chat.typing")}</span>
      </div>
    </div>
  )
}

