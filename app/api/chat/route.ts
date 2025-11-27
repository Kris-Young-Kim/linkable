import { NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { streamText } from "ai"
import { google } from "@ai-sdk/google"

import { getSupabaseServerClient } from "@/lib/supabase/server"
import { logEvent } from "@/lib/logging"
import { buildPrompt, buildStreamingPrompt } from "@/core/assessment/prompt-engineering"
import { parseAnalysis } from "@/core/assessment/parser"
import { enforceIcfConsistency } from "@/core/assessment/icf-validator"
import { callGemini } from "@/lib/gemini"

type ChatHistoryItem = {
  role: "user" | "assistant"
  content: string
}

type ChatRequestBody = {
  message?: string
  history?: ChatHistoryItem[]
  consultationId?: string
  persona?: string
  mediaDescription?: string
  image?: {
    base64: string
    mimeType?: string
  }
}

const supabase = getSupabaseServerClient()

const ensureUserRecord = async (clerkUserId: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .single()

  if (data?.id) {
    return data.id
  }

  if (error && error.code !== "PGRST116") {
    throw error
  }

  const user = await currentUser()
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    `${clerkUserId}@linkable.local`
  const name = user?.fullName ?? user?.username ?? "LinkAble User"
  
  // Clerk 메타데이터에서 role 가져오기 (있으면)
  const role = (user?.publicMetadata?.role as string) || "user"

  const { data: insertData, error: insertError } = await supabase
    .from("users")
    .insert({
      clerk_id: clerkUserId,
      email,
      name,
      role,
    })
    .select("id")
    .single()

  if (insertError) {
    throw insertError
  }

  logEvent({ category: "system", action: "user_created", payload: { clerkUserId } })

  return insertData.id
}

const createConsultationIfNeeded = async (existingId: string | undefined, userId: string, titleSeed: string) => {
  if (existingId) {
    return existingId
  }

  const title = titleSeed.slice(0, 80) || "AI Consultation"
  const { data, error } = await supabase
    .from("consultations")
    .insert({
      user_id: userId,
      status: "in_progress",
      title,
    })
    .select("id")
    .single()

  if (error) {
    throw error
  }

  logEvent({ category: "consultation", action: "created_from_chat", payload: { consultationId: data.id } })

  return data.id
}

const insertChatMessage = async (consultationId: string, sender: "user" | "ai", message_text: string) => {
  const { error } = await supabase.from("chat_messages").insert({
    consultation_id: consultationId,
    sender,
    message_text,
  })

  if (error) {
    logEvent({
      category: "consultation",
      action: "chat_message_insert_error",
      payload: { error, sender },
      level: "error",
    })
  }
}

const upsertAnalysis = async (
  consultationId: string,
  parsedAnalysis: ReturnType<typeof parseAnalysis> | null,
  mediaDescription?: string,
) => {
  if (!parsedAnalysis) return

  const { error } = await supabase
    .from("analysis_results")
    .upsert(
      {
        consultation_id: consultationId,
        summary: parsedAnalysis.needs ?? null,
        icf_codes: parsedAnalysis.icf_analysis,
        identified_problems: parsedAnalysis.needs ?? null,
        env_factors: mediaDescription ?? null,
      },
      { onConflict: "consultation_id" },
    )

  if (error) {
    logEvent({
      category: "consultation",
      action: "analysis_upsert_error",
      payload: { error },
      level: "error",
    })
  }
}

const FALLBACK_RESPONSE =
  "알려주셔서 감사합니다. 추가로 불편한 활동이나 사용 중인 보조기기가 있다면 말씀해 주세요. 더 정확한 추천을 위해 도움이 됩니다."

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as ChatRequestBody
  const trimmedMessage = body.message?.trim()

  if (!trimmedMessage && !body.image?.base64) {
    return NextResponse.json({ error: "message or image is required" }, { status: 400 })
  }

  try {
    const supabaseUserId = await ensureUserRecord(userId)
    const consultationId = await createConsultationIfNeeded(
      body.consultationId,
      supabaseUserId,
      trimmedMessage || "이미지 첨부",
    )

    await insertChatMessage(consultationId, "user", trimmedMessage || "이미지 첨부")

    const history = (body.history ?? []).slice(-6)
    const streamingPrompt = buildStreamingPrompt({
      persona: body.persona,
      history: [...history, { role: "user", content: trimmedMessage || "이미지를 첨부했습니다." }],
      latestUserMessage: trimmedMessage || "이미지를 첨부했습니다. 환경을 분석해 주세요.",
      mediaDescription: body.mediaDescription,
    })

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event:${event}\ndata:${JSON.stringify(data ?? {})}\n\n`),
          )
        }

        try {
          let streamedAssistantReply = ""

          const result = await streamText({
            model: google("gemini-flash-lite-latest"),
            prompt: streamingPrompt,
            temperature: 0.4,
            topP: 0.8,
            onFinish: ({ text }) => {
              streamedAssistantReply = text ?? streamedAssistantReply
            },
            onError: (error) => {
              logEvent({
                category: "consultation",
                action: "chat_stream_error",
                payload: { error: String(error) },
                level: "error",
              })
            },
          })

          for await (const delta of result.textStream) {
            sendEvent("text", { delta })
          }

          const structuredPrompt = buildPrompt({
            persona: body.persona,
            history: [...history, { role: "user", content: trimmedMessage || "이미지를 첨부했습니다." }],
            latestUserMessage: trimmedMessage || "이미지를 첨부했습니다. 환경을 분석해 주세요.",
            mediaDescription: body.mediaDescription,
          })

          const { rawText, json } = await callGemini(
            structuredPrompt,
            body.image?.base64,
            body.image?.mimeType,
          )

          let parsedAnalysis = null
          let assistantReplyForStorage = streamedAssistantReply || rawText || FALLBACK_RESPONSE

          if (json) {
            try {
              parsedAnalysis = parseAnalysis(json)
              if (!assistantReplyForStorage && parsedAnalysis.assistant_reply) {
                assistantReplyForStorage = parsedAnalysis.assistant_reply
              }

              const validationInput = trimmedMessage || body.mediaDescription || ""
              const { analysis: adjustedAnalysis, updated, appliedRules } = enforceIcfConsistency(
                validationInput,
                parsedAnalysis,
              )

              parsedAnalysis = adjustedAnalysis

              if (updated) {
                logEvent({
                  category: "consultation",
                  action: "icf_codes_adjusted",
                  payload: { consultationId, appliedRules },
                  level: "info",
                })
              }
            } catch (error) {
              logEvent({
                category: "consultation",
                action: "analysis_parse_error",
                payload: { error, rawText },
                level: "warn",
              })
            }
          }

          if (!assistantReplyForStorage) {
            assistantReplyForStorage = FALLBACK_RESPONSE
          }

          await insertChatMessage(consultationId, "ai", assistantReplyForStorage)
          await upsertAnalysis(consultationId, parsedAnalysis, body.mediaDescription)

          logEvent({
            category: "consultation",
            action: "chat_exchange",
            payload: { consultationId },
          })

          sendEvent("analysis", {
            consultationId,
            followUpQuestions: parsedAnalysis?.questions ?? [],
            icfAnalysis: parsedAnalysis?.icf_analysis ?? null,
            problemDescription:
              parsedAnalysis?.needs || trimmedMessage?.slice(0, 120) || "상담 내용을 요약해 주세요.",
          })

          sendEvent("done", { consultationId })
          controller.close()
        } catch (error) {
          logEvent({
            category: "consultation",
            action: "chat_api_error",
            payload: { error },
            level: "error",
          })

          sendEvent("error", { message: "Failed to process request. 잠시 후 다시 시도해 주세요." })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    logEvent({
      category: "consultation",
      action: "chat_api_error",
      payload: { error },
      level: "error",
    })
    return NextResponse.json(
      { error: "Failed to process request. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    )
  }
}

