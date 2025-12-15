import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { streamText } from "ai";
import { google } from "@ai-sdk/google";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging";
import {
  buildPrompt,
  buildStreamingPrompt,
} from "@/core/assessment/prompt-engineering";
import { parseAnalysis } from "@/core/assessment/parser";
import { enforceIcfConsistency } from "@/core/assessment/icf-validator";
import { callGemini } from "@/lib/gemini";
import { getIsoMatches } from "@/core/matching/iso-mapping";
import { isGreetingMessage } from "@/lib/utils";
import {
  extractScoreFromAnswer,
  isEvaluationAnswer,
  isEvaluationQuestion,
} from "@/core/assessment/ippa-score-parser";

type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequestBody = {
  message?: string;
  history?: ChatHistoryItem[];
  consultationId?: string;
  persona?: string;
  mediaDescription?: string;
  image?: {
    base64: string;
    mimeType?: string;
  };
  disabilityType?: string;
  disabilitySeverity?: string;
};

const supabase = getSupabaseServerClient();

const ensureUserRecord = async (clerkUserId: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .single();

  if (data?.id) {
    return data.id;
  }

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    `${clerkUserId}@linkable.local`;
  const name = user?.fullName ?? user?.username ?? "LinkAble User";

  // Clerk 메타데이터에서 role 가져오기 (있으면)
  const role = (user?.publicMetadata?.role as string) || "user";

  const { data: insertData, error: insertError } = await supabase
    .from("users")
    .insert({
      clerk_id: clerkUserId,
      email,
      name,
      role,
    })
    .select("id")
    .single();

  if (insertError) {
    throw insertError;
  }

  logEvent({
    category: "system",
    action: "user_created",
    payload: { clerkUserId },
  });

  return insertData.id;
};

const createConsultationIfNeeded = async (
  existingId: string | undefined,
  userId: string,
  titleSeed: string,
  disabilityType?: string,
  disabilitySeverity?: string
) => {
  if (existingId) {
    return existingId;
  }

  const title = titleSeed.slice(0, 80) || "AI Consultation";
  const { data, error } = await supabase
    .from("consultations")
    .insert({
      user_id: userId,
      status: "in_progress",
      title,
      disability_type: disabilityType ?? null,
      disability_severity: disabilitySeverity ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  logEvent({
    category: "consultation",
    action: "created_from_chat",
    payload: { consultationId: data.id },
  });

  return data.id;
};

const insertChatMessage = async (
  consultationId: string,
  sender: "user" | "ai",
  message_text: string
) => {
  const { error } = await supabase.from("chat_messages").insert({
    consultation_id: consultationId,
    sender,
    message_text,
  });

  if (error) {
    logEvent({
      category: "consultation",
      action: "chat_message_insert_error",
      payload: { error, sender },
      level: "error",
    });
  }
};

const upsertAnalysis = async (
  consultationId: string,
  parsedAnalysis: ReturnType<typeof parseAnalysis> | null,
  mediaDescription?: string
) => {
  if (!parsedAnalysis) return;

  const { error } = await supabase.from("analysis_results").upsert(
    {
      consultation_id: consultationId,
      summary: parsedAnalysis.needs ?? null,
      icf_codes: parsedAnalysis.icf_analysis,
      identified_problems: parsedAnalysis.needs ?? null,
      env_factors: mediaDescription ?? null,
    },
    { onConflict: "consultation_id" }
  );

  if (error) {
    logEvent({
      category: "consultation",
      action: "analysis_upsert_error",
      payload: { error },
      level: "error",
    });
  } else {
    // ICF 코드 사용 로깅 (비동기, 에러가 발생해도 메인 플로우에 영향 없음)
    const allCodes = [
      ...(parsedAnalysis.icf_analysis.b || []),
      ...(parsedAnalysis.icf_analysis.d || []),
      ...(parsedAnalysis.icf_analysis.e || []),
    ];
    if (allCodes.length > 0) {
      import("@/lib/icf-tracking").then(({ logIcfCodeUsageBatch }) => {
        logIcfCodeUsageBatch(allCodes, "chat_analysis", {
          consultationId,
        }).catch((err) => {
          // 로깅 실패는 조용히 무시 (메인 플로우에 영향 없음)
          console.error("[ICF Tracking] Failed to log ICF codes:", err);
        });
      });
    }
  }
};

/**
 * 채팅에서 수집한 평가 점수를 저장
 */
const saveIppaActivityScore = async (
  consultationId: string,
  icfCode: string,
  importance: number | null,
  difficulty: number | null
) => {
  if (!icfCode || (!importance && !difficulty)) {
    return;
  }

  // 기존 평가 데이터 조회
  const { data: consultation, error: fetchError } = await supabase
    .from("consultations")
    .select("ippa_activities")
    .eq("id", consultationId)
    .single();

  if (fetchError) {
    logEvent({
      category: "consultation",
      action: "ippa_fetch_error",
      payload: { error: fetchError },
      level: "error",
    });
    return;
  }

  const existingActivities =
    (consultation?.ippa_activities as any)?.activities || [];
  const existingActivityIndex = existingActivities.findIndex(
    (a: any) => a.icfCode === icfCode
  );

  let updatedActivity: any;
  if (existingActivityIndex >= 0) {
    // 기존 활동 업데이트
    updatedActivity = {
      ...existingActivities[existingActivityIndex],
      importance: importance ?? existingActivities[existingActivityIndex].importance,
      preDifficulty: difficulty ?? existingActivities[existingActivityIndex].preDifficulty,
      collectedAt: new Date().toISOString(),
    };
    existingActivities[existingActivityIndex] = updatedActivity;
  } else {
    // 새 활동 추가
    updatedActivity = {
      icfCode,
      importance: importance ?? 3,
      preDifficulty: difficulty ?? 3,
      collectedAt: new Date().toISOString(),
    };
    existingActivities.push(updatedActivity);
  }

  const ippaActivitiesData = {
    activities: existingActivities,
    collectedAt: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("consultations")
    .update({
      ippa_activities: ippaActivitiesData,
    })
    .eq("id", consultationId);

  if (updateError) {
    logEvent({
      category: "consultation",
      action: "ippa_save_error",
      payload: { error: updateError },
      level: "error",
    });
  } else {
    logEvent({
      category: "consultation",
      action: "ippa_score_saved",
      payload: {
        consultationId,
        icfCode,
        importance,
        difficulty,
      },
    });
  }
};

/**
 * 채팅 히스토리에서 평가 질문과 답변을 추출하여 점수 저장
 */
const processEvaluationFromChat = async (
  consultationId: string,
  userMessage: string,
  assistantReply: string,
  parsedAnalysis: ReturnType<typeof parseAnalysis> | null
) => {
  // AI 응답이 평가 질문인지 확인
  if (!isEvaluationQuestion(assistantReply)) {
    return;
  }

  // 사용자 답변이 평가 답변인지 확인
  if (!isEvaluationAnswer(userMessage)) {
    return;
  }

  // ICF D-Level 코드 추출
  const dCodes = parsedAnalysis?.icf_analysis?.d || [];
  if (dCodes.length === 0) {
    return;
  }

  // 최근 대화에서 평가 중인 활동 추론
  // AI 응답에서 활동 코드나 활동명 추출 시도
  let targetIcfCode: string | null = null;
  for (const code of dCodes) {
    // 간단한 추론: AI 응답에 활동 코드나 관련 키워드가 있는지 확인
    // 실제로는 더 정교한 추론이 필요할 수 있음
    if (assistantReply.toLowerCase().includes(code.toLowerCase())) {
      targetIcfCode = code;
      break;
    }
  }

  // 활동 코드를 찾지 못했으면 첫 번째 D 코드 사용
  if (!targetIcfCode && dCodes.length > 0) {
    targetIcfCode = dCodes[0];
  }

  if (!targetIcfCode) {
    return;
  }

  // AI 응답에서 질문 유형 추론 (중요도 vs 어려움)
  const isImportanceQuestion = assistantReply.includes("중요");
  const isDifficultyQuestion = assistantReply.includes("어려움") || assistantReply.includes("어려운");

  // 사용자 답변에서 점수 추출
  if (isImportanceQuestion) {
    const importance = extractScoreFromAnswer(userMessage, "importance");
    if (importance) {
      await saveIppaActivityScore(consultationId, targetIcfCode, importance, null);
    }
  } else if (isDifficultyQuestion) {
    const difficulty = extractScoreFromAnswer(userMessage, "difficulty");
    if (difficulty) {
      await saveIppaActivityScore(consultationId, targetIcfCode, null, difficulty);
    }
  }
};

const FALLBACK_RESPONSE =
  "알려주셔서 감사합니다. 추가로 불편한 활동이나 사용 중인 보조기기가 있다면 말씀해 주세요. 더 정확한 추천을 위해 도움이 됩니다.";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as ChatRequestBody;
  const trimmedMessage = body.message?.trim();

  if (!trimmedMessage && !body.image?.base64) {
    return NextResponse.json(
      { error: "message or image is required" },
      { status: 400 }
    );
  }

  try {
    const supabaseUserId = await ensureUserRecord(userId);
    const consultationId = await createConsultationIfNeeded(
      body.consultationId,
      supabaseUserId,
      trimmedMessage || "이미지 첨부",
      body.disabilityType,
      body.disabilitySeverity
    );

    // 기존 상담에 대해 장애 정보가 넘어오면 업데이트
    if (consultationId && (body.disabilityType || body.disabilitySeverity)) {
      await supabase
        .from("consultations")
        .update({
          disability_type: body.disabilityType ?? null,
          disability_severity: body.disabilitySeverity ?? null,
        })
        .eq("id", consultationId);
    }

    await insertChatMessage(
      consultationId,
      "user",
      trimmedMessage || "이미지 첨부"
    );

    const history = (body.history ?? []).slice(-6);
    
    // 기존 평가 데이터 조회 (평가 컨텍스트 구성용)
    let evaluationContext: any = undefined;
    if (body.consultationId) {
      const { data: consultation } = await supabase
        .from("consultations")
        .select("ippa_activities")
        .eq("id", body.consultationId)
        .single();
      
      if (consultation?.ippa_activities) {
        const ippaActivities = consultation.ippa_activities as any;
        const evaluatedActivities = (ippaActivities.activities || []).map((a: any) => ({
          icfCode: a.icfCode,
          importance: a.importance,
          preDifficulty: a.preDifficulty,
        }));
        
        // ICF 코드는 나중에 분석 결과에서 가져옴
        evaluationContext = {
          evaluatedActivities,
        };
      }
    }
    
    const streamingPrompt = buildStreamingPrompt({
      persona: body.persona,
      history: [
        ...history,
        { role: "user", content: trimmedMessage || "이미지를 첨부했습니다." },
      ],
      latestUserMessage:
        trimmedMessage || "이미지를 첨부했습니다. 환경을 분석해 주세요.",
      mediaDescription: body.mediaDescription,
      evaluationContext,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(
              `event:${event}\ndata:${JSON.stringify(data ?? {})}\n\n`
            )
          );
        };

        try {
          let streamedAssistantReply = "";
          let parsedAnalysis: any = null;

          const result = await streamText({
            model: google("gemini-flash-lite-latest"),
            prompt: streamingPrompt,
            temperature: 0.4,
            topP: 0.8,
            onFinish: ({ text }) => {
              streamedAssistantReply = text ?? streamedAssistantReply;
            },
            onError: (error) => {
              logEvent({
                category: "consultation",
                action: "chat_stream_error",
                payload: { error: String(error) },
                level: "error",
              });
            },
          });

          for await (const delta of result.textStream) {
            sendEvent("text", { delta });
          }

          const structuredPrompt = buildPrompt({
            persona: body.persona,
            history: [
              ...history,
              {
                role: "user",
                content: trimmedMessage || "이미지를 첨부했습니다.",
              },
            ],
            latestUserMessage:
              trimmedMessage || "이미지를 첨부했습니다. 환경을 분석해 주세요.",
            mediaDescription: body.mediaDescription,
            evaluationContext,
          });

          const { rawText, json } = await callGemini(
            structuredPrompt,
            body.image?.base64,
            body.image?.mimeType
          );

          let assistantReplyForStorage =
            streamedAssistantReply || rawText || FALLBACK_RESPONSE;

          if (json) {
            try {
              parsedAnalysis = parseAnalysis(json);
              if (!assistantReplyForStorage && parsedAnalysis.assistant_reply) {
                assistantReplyForStorage = parsedAnalysis.assistant_reply;
              }

              const validationInput =
                trimmedMessage || body.mediaDescription || "";
              const {
                analysis: adjustedAnalysis,
                updated,
                appliedRules,
              } = enforceIcfConsistency(validationInput, parsedAnalysis);

              parsedAnalysis = adjustedAnalysis;

              if (updated) {
                logEvent({
                  category: "consultation",
                  action: "icf_codes_adjusted",
                  payload: { consultationId, appliedRules },
                  level: "info",
                });
              }
            } catch (error) {
              logEvent({
                category: "consultation",
                action: "analysis_parse_error",
                payload: { error, rawText },
                level: "warn",
              });
            }
          }

          if (!assistantReplyForStorage) {
            assistantReplyForStorage = FALLBACK_RESPONSE;
          }

          await insertChatMessage(
            consultationId,
            "ai",
            assistantReplyForStorage
          );
          await upsertAnalysis(
            consultationId,
            parsedAnalysis,
            body.mediaDescription
          );

          // 평가 컨텍스트에 ICF 코드 추가 (분석 파싱 후)
          if (evaluationContext && parsedAnalysis?.icf_analysis?.d) {
            evaluationContext.extractedIcfCodes = parsedAnalysis.icf_analysis.d;
            const evaluatedCodes = new Set(
              evaluationContext.evaluatedActivities.map((a: any) => a.icfCode)
            );
            const pendingCodes = evaluationContext.extractedIcfCodes.filter(
              (code: string) => !evaluatedCodes.has(code)
            );
            if (pendingCodes.length > 0) {
              evaluationContext.currentActivityIndex = 0;
            }
          }

          // 채팅에서 평가 데이터 수집 및 저장
          await processEvaluationFromChat(
            consultationId,
            trimmedMessage || "",
            assistantReplyForStorage,
            parsedAnalysis
          );

          logEvent({
            category: "consultation",
            action: "chat_exchange",
            payload: { consultationId },
          });

          // 인사 메시지인지 확인
          const isGreeting = trimmedMessage
            ? isGreetingMessage(trimmedMessage)
            : false;

          const isoMatches =
            parsedAnalysis && !isGreeting
              ? getIsoMatches(parsedAnalysis.normalizedCodes ?? [])
              : [];

          sendEvent("analysis", {
            consultationId,
            followUpQuestions: parsedAnalysis?.questions ?? [],
            icfAnalysis:
              parsedAnalysis?.icf_analysis && !isGreeting
                ? parsedAnalysis.icf_analysis
                : null,
            problemDescription:
              parsedAnalysis?.needs ||
              trimmedMessage?.slice(0, 120) ||
              "상담 내용을 요약해 주세요.",
            isoMatches,
            isGreeting, // 인사 메시지 여부 전달
          });

          sendEvent("done", { consultationId });
          controller.close();
        } catch (error) {
          logEvent({
            category: "consultation",
            action: "chat_api_error",
            payload: { error },
            level: "error",
          });

          sendEvent("error", {
            message: "Failed to process request. 잠시 후 다시 시도해 주세요.",
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logEvent({
      category: "consultation",
      action: "chat_api_error",
      payload: { error },
      level: "error",
    });
    return NextResponse.json(
      { error: "Failed to process request. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
