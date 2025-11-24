"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DisclaimerModal } from "@/components/disclaimer-modal"
import { Sparkles, Send, Mic, Paperclip, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/components/language-provider"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export function ChatInterface() {
  const { t } = useLanguage()

  const [showDisclaimer, setShowDisclaimer] = useState(true)
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    // Simulate AI response (replace with actual AI SDK integration)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Thank you for sharing that information. Based on what you've told me, I can help identify suitable assistive technologies. Could you tell me more about your daily activities that are affected?",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsTyping(false)
    }, 1500)
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
    // Implement photo attachment functionality
    console.log("[v0] Photo attachment requested")
  }

  const handleAcceptDisclaimer = () => {
    setShowDisclaimer(false)
    textareaRef.current?.focus()
  }

  return (
    <>
      <DisclaimerModal open={showDisclaimer} onAccept={handleAcceptDisclaimer} />

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
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
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
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent"
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
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent"
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
                  >
                    <Mic className="size-6" aria-hidden="true" />
                  </Button>

                  {/* Send Button */}
                  <Button
                    type="button"
                    size="lg"
                    className="size-11"
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
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
    </>
  )
}
