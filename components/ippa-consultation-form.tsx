"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { useLanguage } from "@/components/language-provider"
import { CheckCircle2 } from "lucide-react"

interface IppaConsultationFormProps {
  onComplete: (data: { importance: number; currentDifficulty: number }) => void
  onSkip?: () => void
  problemDescription?: string
}

export function IppaConsultationForm({
  onComplete,
  onSkip,
  problemDescription,
}: IppaConsultationFormProps) {
  const { t } = useLanguage()
  const [importance, setImportance] = useState([3])
  const [currentDifficulty, setCurrentDifficulty] = useState([3])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = () => {
    setIsSubmitting(true)
    onComplete({
      importance: importance[0],
      currentDifficulty: currentDifficulty[0],
    })
  }

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
          {t("ippa.consultation.title")}
        </CardTitle>
        <CardDescription className="text-sm">
          {t("ippa.consultation.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 문제 설명 (있는 경우) */}
        {problemDescription && (
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium mb-1">{t("ippa.problemDescription")}</p>
            <p className="text-sm text-muted-foreground">{problemDescription}</p>
          </div>
        )}

        {/* 중요도 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="importance-slider" className="text-sm font-medium">
              {t("ippa.importance")}
            </label>
            <span className="text-sm font-semibold text-primary">{importance[0]}/5</span>
          </div>
          <Slider
            id="importance-slider"
            min={1}
            max={5}
            step={1}
            value={importance}
            onValueChange={setImportance}
            className="w-full"
            aria-label={t("ippa.importance")}
          />
          <p className="text-xs text-muted-foreground">
            {t("ippa.consultation.importanceHelp")}
          </p>
        </div>

        {/* 현재 난이도 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="difficulty-slider" className="text-sm font-medium">
              {t("ippa.consultation.currentDifficulty")}
            </label>
            <span className="text-sm font-semibold text-primary">{currentDifficulty[0]}/5</span>
          </div>
          <Slider
            id="difficulty-slider"
            min={1}
            max={5}
            step={1}
            value={currentDifficulty}
            onValueChange={setCurrentDifficulty}
            className="w-full"
            aria-label={t("ippa.consultation.currentDifficulty")}
          />
          <p className="text-xs text-muted-foreground">
            {t("ippa.consultation.difficultyHelp")}
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="lg"
            className="flex-1 min-h-[48px]"
          >
            {isSubmitting ? t("ippa.submitting") : t("ippa.consultation.submit")}
          </Button>
          {onSkip && (
            <Button
              onClick={onSkip}
              variant="outline"
              size="lg"
              className="min-h-[48px]"
              disabled={isSubmitting}
            >
              {t("ippa.consultation.skip")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

