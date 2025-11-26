"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"

// Web Speech API 타입 정의
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}
import { useAuth, SignInButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DisclaimerModal } from "@/components/disclaimer-modal"
import { IppaConsultationForm } from "@/components/ippa-consultation-form"
import { ProductRecommendationCard } from "@/components/product-recommendation-card"
import { IcfVisualization, type IcfAnalysisBuckets } from "@/components/features/analysis/icf-visualization"
import { TypingIndicator } from "@/components/chat/typing-indicator"
import { Sparkles, Send, Mic, Paperclip, ArrowLeft, ShoppingBag, Package } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/components/language-provider"
import { trackEvent } from "@/lib/analytics"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export function ChatInterface() {
  const { t } = useLanguage()
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()

  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: t("chat.initialMessage"),
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const [consultationId, setConsultationId] = useState<string | null>(null)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [showIppaForm, setShowIppaForm] = useState(false)
  const [ippaData, setIppaData] = useState<{ importance: number; currentDifficulty: number } | null>(null)
  const [problemDescription, setProblemDescription] = useState<string>("")
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [hasRecommendations, setHasRecommendations] = useState(false)
  const [showRecommendationCTA, setShowRecommendationCTA] = useState(false)
  const [previewRecommendations, setPreviewRecommendations] = useState<any[]>([])
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [icfAnalysis, setIcfAnalysis] = useState<IcfAnalysisBuckets | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const preloadRecommendations = useCallback(async (currentConsultationId: string) => {
    setShowRecommendationCTA(true)
    setIsLoadingRecommendations(true)

    try {
      const recommendationsResponse = await fetch(
        `/api/products?consultationId=${currentConsultationId}&limit=3`,
      )
      if (recommendationsResponse.ok) {
        const recommendationsData = await recommendationsResponse.json()
        if (recommendationsData.products && recommendationsData.products.length > 0) {
          setHasRecommendations(true)
          setPreviewRecommendations(recommendationsData.products.slice(0, 3))
        }
      }
    } catch (error) {
      console.error("[chat] Failed to preload recommendations:", error)
    } finally {
      setIsLoadingRecommendations(false)
    }
  }, [])

  const isAuthResolved = isLoaded
  const requiresLogin = isAuthResolved && !isSignedIn
  const shouldShowDisclaimer = Boolean(isSignedIn && !hasAcceptedDisclaimer)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!isSignedIn) {
      return
    }

    const trimmed = input.trim()
    if (!trimmed && !selectedImage) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed || "이미지를 첨부했습니다.",
      timestamp: new Date(),
    }

    const assistantMessageId = crypto.randomUUID()

    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      },
    ])
    setInput("")
    setIsTyping(true)
    setSuggestedQuestions([])
    setIcfAnalysis(null)

    setShowRecommendationCTA(false)
    setPreviewRecommendations([])
    setHasRecommendations(false)

    // 첫 메시지인 경우 chat_started 이벤트 추적
    if (messages.length === 1) {
      trackEvent("chat_started")
    }

    // 메시지 전송 이벤트 추적 (텍스트가 없으면 0으로 기록)
    trackEvent("chat_message_sent", {
      message_length: trimmed.length,
      ...(consultationId && { consultation_id: consultationId }),
    })

    try {
      // 이미지가 있으면 base64로 변환
      let imagePayload: { base64: string; mimeType: string } | undefined = undefined
      if (selectedImage) {
        setIsUploadingImage(true)
        try {
          imagePayload = await convertImageToBase64(selectedImage)
          trackEvent("image_uploaded", { file_size: selectedImage.size })
        } catch (error) {
          console.error("[chat] Failed to convert image to base64:", error)
          alert(t("chat.imageConversionError"))
          setIsUploadingImage(false)
          return
        } finally {
          setIsUploadingImage(false)
        }
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          consultationId,
          history: messages.map(({ role, content }) => ({ role, content })),
          image: imagePayload,
        }),
      })

      if (selectedImage) {
        handleRemoveImage()
      }

      if (!response.ok || !response.body) {
        throw new Error(await response.text())
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder("utf-8")
      let buffer = ""

      const processEvent = async (eventType: string, data?: string) => {
        if (!data) return
        switch (eventType) {
          case "text": {
            try {
              const payload = JSON.parse(data) as { delta?: string }
              if (payload?.delta) {
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === assistantMessageId
                      ? { ...message, content: `${message.content}${payload.delta}` }
                      : message,
                  ),
                )
              }
            } catch (error) {
              console.error("[chat] Failed to parse stream delta:", error)
            }
            break
          }
          case "analysis": {
            try {
              const payload = JSON.parse(data) as {
                consultationId?: string
                followUpQuestions?: string[]
                icfAnalysis?: IcfAnalysisBuckets | null
                problemDescription?: string
              }

              if (!consultationId && payload.consultationId) {
                setConsultationId(payload.consultationId)
              }

              if (payload.followUpQuestions) {
                setSuggestedQuestions(payload.followUpQuestions.filter(Boolean))
              }

              if (payload.icfAnalysis) {
                console.log("[chat] Received ICF analysis:", payload.icfAnalysis)
                setIcfAnalysis(payload.icfAnalysis)
              }

              if (payload.icfAnalysis && payload.consultationId) {
                trackEvent("consultation_completed", {
                  consultation_id: payload.consultationId,
                  has_recommendations: true,
                })

                if (!ippaData && !showIppaForm) {
                  setShowIppaForm(true)
                  setProblemDescription(
                    payload.problemDescription || trimmed.slice(0, 100) || "상담 내용을 요약해 주세요.",
                  )
                }

                if (payload.consultationId) {
                  await preloadRecommendations(payload.consultationId)
                }
              }
            } catch (error) {
              console.error("[chat] Failed to parse analysis payload:", error)
            }
            break
          }
          case "error": {
            try {
              const payload = JSON.parse(data) as { message?: string }
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantMessageId
                    ? {
                        ...message,
                        content: payload.message || t("chat.errorResponse"),
                      }
                    : message,
                ),
              )
            } catch {
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantMessageId
                    ? {
                        ...message,
                        content: t("chat.errorResponse"),
                      }
                    : message,
                ),
              )
            }
            break
          }
          default:
            break
        }
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let boundary = buffer.indexOf("\n\n")
        while (boundary !== -1) {
          const eventChunk = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)

          const lines = eventChunk.split("\n")
          let eventType = "message"
          let dataPayload = ""

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventType = line.slice(6).trim()
            } else if (line.startsWith("data:")) {
              dataPayload += line.slice(5).trim()
            }
          }

          await processEvent(eventType, dataPayload)
          boundary = buffer.indexOf("\n\n")
        }
      }
    } catch (error) {
      console.error("chat_error", error)
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: t("chat.errorResponse"),
              }
            : message,
        ),
      )
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleVoiceRecording = () => {
    if (!isSpeechSupported) {
      // 브라우저가 음성 인식을 지원하지 않는 경우
      alert(t("chat.sttNotSupported"))
      return
    }

    if (!recognition) {
      console.error("[STT] Speech recognition not initialized")
      return
    }

    if (!isRecording) {
      // 음성 인식 시작
      try {
        recognition.start()
        setIsRecording(true)
        trackEvent("stt_started", {})
      } catch (error) {
        console.error("[STT] Failed to start recognition:", error)
        setIsRecording(false)
      }
    } else {
      // 음성 인식 중지
      recognition.stop()
      setIsRecording(false)
    }
  }

  const handlePhotoAttach = () => {
    fileInputRef.current?.click()
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 파일 타입 검증
    if (!file.type.startsWith("image/")) {
      alert(t("chat.imageInvalidType"))
      return
    }

    // 파일 크기 제한 (5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      alert(t("chat.imageTooLarge"))
      return
    }

    setSelectedImage(file)

    // 미리보기 생성
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    trackEvent("image_selected", { file_size: file.size, file_type: file.type })
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const convertImageToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const [meta, data] = result.split(",")
        const mimeMatch = meta.match(/data:(.*);base64/)
        resolve({
          base64: data,
          mimeType: mimeMatch?.[1] ?? file.type ?? "image/jpeg",
        })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
  const handleSuggestionClick = (question: string) => {
    if (requiresLogin) return
    setInput(question)
    textareaRef.current?.focus()
  }

  const handleAcceptDisclaimer = () => {
    setHasAcceptedDisclaimer(true)
    textareaRef.current?.focus()
  }

  const handleIppaComplete = async (data: { importance: number; currentDifficulty: number }) => {
    setIppaData(data)
    setShowIppaForm(false)

    // K-IPPA 데이터를 서버에 저장
    if (consultationId) {
      try {
        await fetch("/api/consultations/ippa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consultationId,
            importance: data.importance,
            currentDifficulty: data.currentDifficulty,
          }),
        })
        console.log("[Chat] K-IPPA data saved")
      } catch (error) {
        console.error("[Chat] Failed to save K-IPPA data:", error)
      }
    }
  }

  const handleIppaSkip = () => {
    setShowIppaForm(false)
  }

  return (
    <>
      <DisclaimerModal open={shouldShowDisclaimer} onAccept={handleAcceptDisclaimer} />

      {requiresLogin && (
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-8">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-2xl font-semibold">{t("chat.loginRequiredTitle")}</h2>
            <p className="text-muted-foreground">{t("chat.loginRequiredDescription")}</p>
            <SignInButton mode="modal">
              <Button size="lg" className="w-full cursor-pointer">
                {t("chat.loginRequiredAction")}
              </Button>
            </SignInButton>
          </div>
        </div>
      )}

      {!requiresLogin && (
      <div className="flex h-screen flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="flex items-center gap-4 p-4">
            <Link
              href="/"
              className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={t("chat.backToHome")}
            >
              <ArrowLeft className="size-6" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-accent">
                <Sparkles className="size-6 text-white" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">{t("chat.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("chat.subtitle")}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <p className="text-center text-sm text-muted-foreground max-w-3xl mx-auto">{t("chat.disclaimer")}</p>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-accent"
                    aria-hidden="true"
                  >
                    <Sparkles className="size-5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-5 py-4 text-lg leading-relaxed ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-blue-50 text-foreground dark:bg-blue-950"
                  }`}
                  role="article"
                  aria-label={message.role === "user" ? t("chat.yourMessage") : t("chat.coordinatorMessage")}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {isTyping && <TypingIndicator />}

            {suggestedQuestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <p className="w-full text-sm text-muted-foreground">{t("chat.followUpPrompt")}</p>
                {suggestedQuestions.map((question) => (
                  <Button
                    key={question}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSuggestionClick(question)}
                    disabled={requiresLogin}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            )}

            {/* K-IPPA Consultation Form */}
            {showIppaForm && (
              <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                  <IppaConsultationForm
                    onComplete={handleIppaComplete}
                    onSkip={handleIppaSkip}
                    problemDescription={problemDescription}
                  />
                </div>
              </div>
            )}

            {/* ICF Visualization */}
            {icfAnalysis && (
              <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                  <IcfVisualization data={icfAnalysis} />
                </div>
              </div>
            )}

            {/* Recommendation Preview Cards */}
            {showRecommendationCTA && consultationId && previewRecommendations.length > 0 && !isLoadingRecommendations && (
              <div className="flex justify-center px-4 py-6">
                <div className="w-full max-w-4xl">
                  <div className="mb-4 text-center">
                    <p className="text-lg font-semibold text-foreground">{t("chat.recommendationPreview")}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {previewRecommendations.map((product, index) => (
                      <div key={product.id || index} className="flex flex-col">
                        <div className="relative h-48 w-full overflow-hidden rounded-t-lg bg-muted">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name || t("recommendations.defaultCategory")}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted">
                              <Package className="size-12 text-muted-foreground/50" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 rounded-b-lg border border-t-0 border-border bg-card p-4">
                          <h3 className="mb-2 line-clamp-2 text-base font-semibold text-foreground">
                            {product.name || t("recommendations.defaultCategory")}
                          </h3>
                          {product.match_reason && (
                            <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{product.match_reason}</p>
                          )}
                          {product.price && (
                            <p className="text-sm font-medium text-foreground">
                              {typeof product.price === "number"
                                ? new Intl.NumberFormat("ko-KR", {
                                    style: "currency",
                                    currency: "KRW",
                                    maximumFractionDigits: 0,
                                  }).format(product.price)
                                : product.price}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 text-center">
                    <Button
                      size="lg"
                      className="min-h-[44px] px-8"
                      onClick={() => {
                        router.push(`/recommendations/${consultationId}`)
                      }}
                    >
                      <ShoppingBag className="mr-2 size-5" aria-hidden="true" />
                      {t("chat.viewMoreRecommendations")}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendation CTA (Fallback when no preview) */}
            {showRecommendationCTA && consultationId && previewRecommendations.length === 0 && (
              <div className="flex justify-center px-4 py-6">
                <div className="w-full max-w-2xl">
                  <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-6 text-center">
                    {isLoadingRecommendations ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <p className="text-sm text-muted-foreground">{t("chat.loadingRecommendations")}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <p className="text-base font-medium text-foreground">{t("chat.recommendationsReady")}</p>
                        <Button
                          size="lg"
                          className="min-h-[44px] px-8"
                          onClick={() => {
                            router.push(`/recommendations/${consultationId}`)
                          }}
                        >
                          <ShoppingBag className="mr-2 size-5" aria-hidden="true" />
                          {t("chat.viewRecommendations")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-card p-4">
          <div className="mx-auto max-w-3xl">
            {/* Image Preview */}
            {imagePreview && selectedImage && (
              <div className="mb-3 flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-md">
                  <Image
                    src={imagePreview}
                    alt={selectedImage.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{selectedImage.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedImage.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleRemoveImage}
                  aria-label={t("chat.removeImage")}
                >
                  ×
                </Button>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              aria-label={t("chat.attachPhoto")}
            />

            <div className="flex gap-2">
              {/* Photo Attachment Button */}
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="size-14 shrink-0 bg-transparent"
                onClick={handlePhotoAttach}
                aria-label={t("chat.attachPhoto")}
                disabled={requiresLogin || isUploadingImage}
              >
                <Paperclip className="size-6" aria-hidden="true" />
              </Button>

              {/* Text Input */}
              <div className="relative flex-1">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={t("chat.placeholder")}
                  className="min-h-14 resize-none pr-32 text-lg leading-relaxed"
                  rows={1}
                  aria-label="Message input"
                  disabled={requiresLogin}
                />
                <div className="absolute bottom-2 right-2 flex gap-2">
                  {/* Voice Input Button */}
                  <Button
                    type="button"
                    size="lg"
                    variant={isRecording ? "destructive" : "ghost"}
                    className="size-11"
                    onClick={toggleVoiceRecording}
                    aria-label={isRecording ? t("chat.stopVoiceRecording") : t("chat.startVoiceRecording")}
                    aria-pressed={isRecording}
                    disabled={requiresLogin}
                  >
                    <Mic className="size-6" aria-hidden="true" />
                  </Button>

                  {/* Send Button */}
                  <Button
                    type="button"
                    size="lg"
                    className="size-11"
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping || requiresLogin}
                    aria-label={t("chat.sendMessage")}
                    >
                    <Send className="size-5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Accessibility Info */}
            <p className="mt-3 text-center text-sm text-muted-foreground">{t("chat.keyboardShortcuts")}</p>
          </div>
        </div>
      </div>
      )}
    </>
  )
}
