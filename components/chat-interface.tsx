"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useAuth, SignInButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DisclaimerModal } from "@/components/disclaimer-modal"
import { IppaConsultationForm } from "@/components/ippa-consultation-form"
import { Sparkles, Send, Mic, Paperclip, ArrowLeft } from "lucide-react"
import Link from "next/link"
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
  const [consultationId, setConsultationId] = useState<string | null>(null)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  const [showIppaForm, setShowIppaForm] = useState(false)
  const [ippaData, setIppaData] = useState<{ importance: number; currentDifficulty: number } | null>(null)
  const [problemDescription, setProblemDescription] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    if (!trimmed) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsTyping(true)
    setSuggestedQuestions([])

    // 첫 메시지인 경우 chat_started 이벤트 추적
    if (messages.length === 1) {
      trackEvent("chat_started")
    }

    // 메시지 전송 이벤트 추적
    trackEvent("chat_message_sent", {
      message_length: trimmed.length,
      ...(consultationId && { consultation_id: consultationId }),
    })

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          consultationId,
          history: messages.map(({ role, content }) => ({ role, content })),
        }),
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      const data = await response.json()
      if (!consultationId && data.consultationId) {
        setConsultationId(data.consultationId)
      }

      // ICF 분석이 완료되고 추천이 있을 경우 consultation_completed 이벤트 추적
      if (data.icfAnalysis && data.consultationId) {
        trackEvent("consultation_completed", {
          consultation_id: data.consultationId,
          has_recommendations: Boolean(data.icfAnalysis),
        })
        
        // ICF 분석 완료 시 K-IPPA 폼 표시 (아직 입력하지 않은 경우)
        if (!ippaData && !showIppaForm) {
          setShowIppaForm(true)
          // 문제 설명 추출 (ICF 분석 요약 또는 첫 메시지)
          const summary = data.icfAnalysis?.summary || trimmed.slice(0, 100)
          setProblemDescription(summary)
        }
      }

      if (Array.isArray(data.followUpQuestions)) {
        setSuggestedQuestions(data.followUpQuestions.filter(Boolean))
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.message?.content || t("chat.genericReply"),
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("chat_error", error)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: t("chat.errorResponse"),
          timestamp: new Date(),
        },
      ])
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
    setIsRecording(!isRecording)
    // Implement STT functionality here
    if (!isRecording) {
      // Start recording
      console.log("[v0] Voice recording started")
    } else {
      // Stop recording and process
      console.log("[v0] Voice recording stopped")
    }
  }

  const handlePhotoAttach = () => {
    console.log("[v0] Photo attachment requested")
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

            {isTyping && (
              <div className="flex gap-3" role="status" aria-live="polite" aria-label={t("chat.typing")}>
                <div
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-accent"
                  aria-hidden="true"
                >
                  <Sparkles className="size-5 text-white" />
                </div>
                <div className="max-w-[75%] rounded-2xl bg-blue-50 px-5 py-4 dark:bg-blue-950">
                  <div className="flex gap-1">
                    <span
                      className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]"
                      aria-hidden="true"
                    ></span>
                    <span
                      className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]"
                      aria-hidden="true"
                    ></span>
                    <span className="size-2 animate-bounce rounded-full bg-muted-foreground" aria-hidden="true"></span>
                  </div>
                  <span className="sr-only">{t("chat.typing")}</span>
                </div>
              </div>
            )}

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

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-card p-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex gap-2">
              {/* Photo Attachment Button */}
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="size-14 shrink-0 bg-transparent"
                onClick={handlePhotoAttach}
                aria-label={t("chat.attachPhoto")}
                disabled={requiresLogin}
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
