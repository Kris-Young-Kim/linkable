"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, Sparkles, Star } from "lucide-react"

type MessageRow = {
  id: string
  sender: "user" | "ai" | "system"
  message_text: string
  created_at: string
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))

export function ChatHistoryCollapsible({ messages }: { messages: MessageRow[] }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>채팅 기록</CardTitle>
                <CardDescription>AI와 나눈 전체 대화 내용입니다. ({messages.length}개 메시지)</CardDescription>
              </div>
              <ChevronDown
                className={`size-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {messages.length > 0 ? (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                          message.sender === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-foreground border"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/90 mb-1">
                          {message.sender === "user" ? (
                            <>
                              <Star className="size-3" aria-hidden="true" />
                              <span>사용자</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="size-3 text-primary" aria-hidden="true" />
                              <span>링커</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{formatDateTime(message.created_at)}</span>
                        </div>
                        <p className="whitespace-pre-line">{message.message_text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="py-8 text-center text-muted-foreground">아직 대화 기록이 없습니다.</div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

