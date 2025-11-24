"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertCircle } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

interface DisclaimerModalProps {
  open: boolean
  onAccept: () => void
}

export function DisclaimerModal({ open, onAccept }: DisclaimerModalProps) {
  const { t } = useLanguage()

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl" aria-describedby="disclaimer-description">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertCircle className="size-6 text-amber-600 dark:text-amber-500" aria-hidden="true" />
            </div>
            <DialogTitle className="text-2xl">{t("modal.disclaimer.title")}</DialogTitle>
          </div>
          <DialogDescription id="disclaimer-description" className="text-base leading-relaxed pt-4">
            {t("modal.disclaimer.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-border bg-muted/30 p-6 space-y-4">
            <h3 className="font-semibold text-lg text-foreground">{t("modal.disclaimer.heading")}</h3>
            <p className="text-base leading-relaxed text-foreground">{t("modal.disclaimer.content1")}</p>
            <p className="text-base leading-relaxed text-foreground">{t("modal.disclaimer.content2")}</p>
            <p className="text-base leading-relaxed text-foreground">{t("modal.disclaimer.content3")}</p>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4">
            <AlertCircle className="size-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-100">{t("modal.disclaimer.notice")}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={onAccept}
            size="lg"
            className="w-full sm:w-auto min-w-[200px] text-base h-12"
            aria-label="Accept terms and start consultation"
          >
            {t("modal.disclaimer.accept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
