"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Web Speech API 타입 정의
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Web Speech API 전역 타입 정의
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

import { useAuth, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { CTAButton } from "@/components/ui/cta-button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DisclaimerModal } from "@/components/disclaimer-modal";
import { ProductRecommendationCard } from "@/components/product-recommendation-card";
import {
  IcfVisualization,
  type IcfAnalysisBuckets,
} from "@/components/features/analysis/icf-visualization";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { ConsultationFlowGuide } from "@/components/consultation-flow-guide";
import { ErrorFaqModal } from "@/components/error-faq-modal";
import {
  Sparkles,
  Send,
  Mic,
  Paperclip,
  ArrowLeft,
  ShoppingBag,
  Package,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/language-provider";
import { trackEvent } from "@/lib/analytics";
import { useRecommendations } from "@/lib/api-hooks";
import { cn } from "@/lib/utils";
import { InlineSpinner, LoadingSpinner } from "@/components/ui/loading-states";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

type IsoMatch = {
  isoCode: string;
  label: string;
  description: string;
  reason: string;
  score: number;
};

export function ChatInterface() {
  const { t } = useLanguage();
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: t("chat.initialMessage"),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(
    null
  );
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [showRecommendationCTA, setShowRecommendationCTA] = useState(false);
  const [showFlowGuide, setShowFlowGuide] = useState(false);
  const [isoMatches, setIsoMatches] = useState<IsoMatch[]>([]);
  const [disabilityType, setDisabilityType] = useState<string>("none");
  const [disabilitySeverity, setDisabilitySeverity] = useState<string>("none");
  const [showIcf, setShowIcf] = useState(false);

  // useCallback으로 onClose 함수 메모이제이션하여 무한 루프 방지
  const handleCloseFlowGuide = useCallback(() => {
    setShowFlowGuide(false);
  }, []);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [icfAnalysis, setIcfAnalysis] = useState<IcfAnalysisBuckets | null>(
    null
  );
  const [errorState, setErrorState] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isUserScrollingRef = useRef(false);

  const shouldFetchRecommendations =
    showRecommendationCTA && Boolean(consultationId) && Boolean(icfAnalysis);

  const {
    products: previewRecommendations,
    isLoading: isLoadingRecommendations,
  } = useRecommendations(
    shouldFetchRecommendations ? consultationId ?? undefined : undefined,
    3
  );

  useEffect(() => {
    if (previewRecommendations.length > 0) {
      setShowFlowGuide(true);
    }
  }, [previewRecommendations.length]);

  const isAuthResolved = isLoaded;
  const requiresLogin = isAuthResolved && !isSignedIn;
  const shouldShowDisclaimer = Boolean(isSignedIn && !hasAcceptedDisclaimer);

  const scrollToBottom = useCallback((force = false) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // 사용자가 수동으로 스크롤 중인지 확인
    if (!force && isUserScrollingRef.current) {
      return;
    }

    // 사용자가 수동으로 스크롤을 올렸는지 확인
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;

    // 사용자가 맨 아래에 있거나 강제 스크롤인 경우에만 스크롤
    if (force || isNearBottom) {
      // requestAnimationFrame을 사용하여 DOM 업데이트 후 스크롤
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    }
  }, []);

  // 음성 인식 초기화
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechCtor =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechCtor) {
      setIsSpeechSupported(false);
      return;
    }

    try {
      const rec = new SpeechCtor();
      rec.lang = "ko-KR";
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript || "")
          .join(" ")
          .trim();
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        // "not-allowed" 에러는 마이크 권한이 거부된 경우로, 조용히 처리
        if (event.error === "not-allowed") {
          console.warn("[STT] Microphone permission denied");
          setIsRecording(false);
          // 사용자에게 권한 요청 안내 (선택적)
          // alert("마이크 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.");
          return;
        }
        
        // "no-speech" 에러는 사용자가 말하지 않은 경우로, 조용히 처리
        if (event.error === "no-speech") {
          console.warn("[STT] No speech detected");
          setIsRecording(false);
          return;
        }
        
        // "aborted" 에러는 사용자가 중단한 경우로, 조용히 처리
        if (event.error === "aborted") {
          console.warn("[STT] Recognition aborted");
          setIsRecording(false);
          return;
        }
        
        // 그 외 에러는 로그에 기록
        console.error("[STT] error", event.error, event.message);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
      setIsSpeechSupported(true);
    } catch (error) {
      console.error("[STT] init failed", error);
      setIsSpeechSupported(false);
    }
  }, []);

  // 메시지가 추가될 때 자동 스크롤 (사용자가 맨 아래에 있을 때만)
  useEffect(() => {
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

  // 스크롤 이벤트 핸들러: 사용자가 수동으로 스크롤하는지 감지
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      // 스크롤 중에는 자동 스크롤 방지
      isUserScrollingRef.current = true;
      clearTimeout(scrollTimeout);

      // 스크롤이 멈춘 후 일정 시간이 지나면 다시 자동 스크롤 허용
      scrollTimeout = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 150);
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  const handleSend = async () => {
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/19d8df64-73bd-42a4-84ca-a4d930766c34", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "components/chat-interface.tsx:handleSend",
        message: "handleSend invoked",
        data: {
          isSignedIn,
          hasInput: !!input.trim(),
          hasImage: !!selectedImage,
          consultationId,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "run2",
        hypothesisId: "C",
      }),
    }).catch(() => {});
    // #endregion
    if (!isSignedIn) {
      return;
    }

    const trimmed = input.trim();
    if (!trimmed && !selectedImage) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed || "이미지를 첨부했습니다.",
      timestamp: new Date(),
    };

    const assistantMessageId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      },
    ]);
    setInput("");
    // 사용자가 메시지를 보낼 때는 강제로 스크롤
    setTimeout(() => scrollToBottom(true), 100);
    setIsTyping(true);
    setSuggestedQuestions([]);
    setIcfAnalysis(null);

    setShowRecommendationCTA(false);

    // 첫 메시지인 경우 chat_started 이벤트 추적
    if (messages.length === 1) {
      trackEvent("chat_started");
    }

    // 메시지 전송 이벤트 추적 (텍스트가 없으면 0으로 기록)
    trackEvent("chat_message_sent", {
      message_length: trimmed.length,
      ...(consultationId && { consultation_id: consultationId }),
    });

    try {
      // 이미지가 있으면 base64로 변환
      let imagePayload: { base64: string; mimeType: string } | undefined =
        undefined;
      if (selectedImage) {
        setIsUploadingImage(true);
        try {
          imagePayload = await convertImageToBase64(selectedImage);
          trackEvent("image_uploaded", { file_size: selectedImage.size });
        } catch (error) {
          console.error("[chat] Failed to convert image to base64:", error);
          setErrorState(
            t("chat.imageConversionError") ||
              "이미지 변환에 실패했습니다. 다른 이미지로 시도해주세요."
          );
          setIsUploadingImage(false);
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      const normalizedType =
        disabilityType === "none" ? undefined : disabilityType;
      const normalizedSeverity =
        disabilitySeverity === "none" ? undefined : disabilitySeverity;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          consultationId,
          history: messages.map(({ role, content }) => ({ role, content })),
          image: imagePayload,
          disabilityType: normalizedType,
          disabilitySeverity: normalizedSeverity,
        }),
      });

      if (selectedImage) {
        handleRemoveImage();
      }

      if (!response.ok || !response.body) {
        // JSON 응답을 파싱해서 에러 메시지 추출
        try {
          const errorText = await response.text();
          let errorMessage = "요청 처리 중 오류가 발생했습니다.";
          
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorMessage;
            
            // 개발 환경에서는 상세 정보도 표시
            if (process.env.NODE_ENV === "development" && errorJson.details) {
              console.error("[Chat] API Error Details:", errorJson.details);
              if (errorJson.errorDetails) {
                console.error("[Chat] Error Details Object:", errorJson.errorDetails);
              }
            }
          } catch {
            // JSON 파싱 실패 시 원본 텍스트 사용
            errorMessage = errorText || errorMessage;
          }
          
          throw new Error(errorMessage);
        } catch (err) {
          // 이미 Error 객체면 그대로 throw
          if (err instanceof Error) {
            throw err;
          }
          throw new Error("요청 처리 중 오류가 발생했습니다.");
        }
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      // 접근성: 동적 콘텐츠 변경 알림을 위한 aria-live 영역
      const announceToScreenReader = (message: string) => {
        const liveRegion = document.getElementById("aria-live-region");
        if (liveRegion) {
          liveRegion.textContent = message;
          // 메시지가 업데이트되도록 잠시 후 초기화
          setTimeout(() => {
            if (liveRegion) {
              liveRegion.textContent = "";
            }
          }, 1000);
        }
      };

      const processEvent = async (eventType: string, data?: string) => {
        if (!data) return;
        switch (eventType) {
          case "text": {
            try {
              const payload = JSON.parse(data) as { delta?: string };
              if (payload?.delta) {
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === assistantMessageId
                      ? {
                          ...message,
                          content: `${message.content}${payload.delta}`,
                        }
                      : message
                  )
                );
              }
            } catch (error) {
              console.error("[chat] Failed to parse stream delta:", error);
            }
            break;
          }
          case "analysis": {
            try {
              const payload = JSON.parse(data) as {
                consultationId?: string;
                followUpQuestions?: string[];
                icfAnalysis?: IcfAnalysisBuckets | null;
                problemDescription?: string;
                isoMatches?: IsoMatch[];
                isGreeting?: boolean;
              };
              // #region agent log
              fetch(
                "http://127.0.0.1:7242/ingest/19d8df64-73bd-42a4-84ca-a4d930766c34",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    location: "components/chat-interface.tsx:analysisEvent",
                    message: "Analysis event received",
                    data: {
                      hasConsultationId: !!payload.consultationId,
                      hasIcfAnalysis: !!payload.icfAnalysis,
                      isGreeting: payload.isGreeting,
                      isoMatchesCount: payload.isoMatches?.length || 0,
                    },
                    timestamp: Date.now(),
                    sessionId: "debug-session",
                    runId: "run2",
                    hypothesisId: "D",
                  }),
                }
              ).catch(() => {});
              // #endregion

              if (!consultationId && payload.consultationId) {
                setConsultationId(payload.consultationId);
              }

              // 인사 메시지인 경우 분석 결과를 표시하지 않음
              if (payload.isGreeting) {
                console.log(
                  "[chat] Greeting message detected, skipping analysis display"
                );
                break;
              }

              if (payload.followUpQuestions) {
                setSuggestedQuestions(
                  payload.followUpQuestions.filter(Boolean)
                );
              }

              if (payload.icfAnalysis) {
                // 접근성: 분석 완료 알림
                announceToScreenReader(
                  "ICF 분석이 완료되었습니다. 추천을 확인할 수 있습니다."
                );
                console.log(
                  "[chat] Received ICF analysis:",
                  payload.icfAnalysis
                );
                setIcfAnalysis(payload.icfAnalysis);
              }

              if (payload.isoMatches) {
                setIsoMatches(payload.isoMatches);
              }

              if (payload.icfAnalysis && payload.consultationId) {
                trackEvent("consultation_completed", {
                  consultation_id: payload.consultationId,
                  has_recommendations: true,
                });

                setShowRecommendationCTA(true);
              }
            } catch (error) {
              console.error("[chat] Failed to parse analysis payload:", error);
            }
            break;
          }
          case "error": {
            try {
              const payload = JSON.parse(data) as { message?: string };
              const errorMessage = payload.message || t("chat.errorResponse");
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantMessageId
                    ? {
                        ...message,
                        content: errorMessage,
                      }
                    : message
                )
              );
              // 에러 발생 시 에러 상태 저장 (ErrorFaqModal에서 사용)
              setErrorState(errorMessage);
            } catch {
              const errorMessage = t("chat.errorResponse");
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantMessageId
                    ? {
                        ...message,
                        content: errorMessage,
                      }
                    : message
                )
              );
              setErrorState(errorMessage);
            }
            break;
          }
          default:
            break;
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const eventChunk = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          const lines = eventChunk.split("\n");
          let eventType = "message";
          let dataPayload = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataPayload += line.slice(5).trim();
            }
          }

          await processEvent(eventType, dataPayload);
          boundary = buffer.indexOf("\n\n");
        }
      }
    } catch (error) {
      console.error("chat_error", error);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: t("chat.errorResponse"),
              }
            : message
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Enter: 전송, Shift+Enter: 줄바꿈
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Escape: 이미지 선택 취소 (있을 경우)
    if (e.key === "Escape" && selectedImage) {
      e.preventDefault();
      handleRemoveImage();
    }
  };

  const toggleVoiceRecording = () => {
    if (!isSpeechSupported) {
      // 브라우저가 음성 인식을 지원하지 않는 경우
      alert(t("chat.sttNotSupported"));
      return;
    }

    if (!recognition) {
      console.error("[STT] Speech recognition not initialized");
      return;
    }

    if (!isRecording) {
      // 음성 인식 시작
      try {
        recognition.start();
        setIsRecording(true);
        trackEvent("stt_started", {});
      } catch (error) {
        console.error("[STT] Failed to start recognition:", error);
        setIsRecording(false);
      }
    } else {
      // 음성 인식 중지
      recognition.stop();
      setIsRecording(false);
    }
  };

  const handlePhotoAttach = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    if (!file.type.startsWith("image/")) {
      alert(t("chat.imageInvalidType"));
      return;
    }

    // 파일 크기 제한 (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert(t("chat.imageTooLarge"));
      return;
    }

    setSelectedImage(file);

    // 미리보기 생성
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    trackEvent("image_selected", {
      file_size: file.size,
      file_type: file.type,
    });
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const convertImageToBase64 = (
    file: File
  ): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const [meta, data] = result.split(",");
        const mimeMatch = meta.match(/data:(.*);base64/);
        resolve({
          base64: data,
          mimeType: mimeMatch?.[1] ?? file.type ?? "image/jpeg",
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  const handleSuggestionClick = (question: string) => {
    if (requiresLogin) return;
    setInput(question);
    textareaRef.current?.focus();
  };

  const handleAcceptDisclaimer = () => {
    setHasAcceptedDisclaimer(true);
    textareaRef.current?.focus();
  };

  return (
    <>
      <DisclaimerModal
        open={shouldShowDisclaimer}
        onAccept={handleAcceptDisclaimer}
      />

      {/* 상담→추천 플로우 안내 */}
      <ConsultationFlowGuide
        isOpen={showFlowGuide}
        onClose={handleCloseFlowGuide}
        consultationId={consultationId}
        recommendationCount={previewRecommendations.length}
        variant="modal"
      />

      {/* 접근성: 동적 콘텐츠 변경 알림 영역 */}
      <div
        id="aria-live-region"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
        aria-label="동적 콘텐츠 변경 알림"
      />

      {/* 에러 FAQ 모달 */}
      {errorState && (
        <div className="fixed bottom-4 right-4 z-50">
          <ErrorFaqModal
            error={errorState}
            onRetry={() => {
              setErrorState(null);
              // 에러가 발생한 경우 마지막 메시지를 다시 전송
              if (input.trim()) {
                handleSend();
              }
            }}
          />
        </div>
      )}

      {requiresLogin && (
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-8">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-2xl font-semibold">
              {t("chat.loginRequiredTitle")}
            </h2>
            <p className="text-muted-foreground">
              {t("chat.loginRequiredDescription")}
            </p>
            <SignInButton mode="modal">
              <Button size="lg" className="w-full cursor-pointer">
                {t("chat.loginRequiredAction")}
              </Button>
            </SignInButton>
          </div>
        </div>
      )}

      {!requiresLogin && (
        <div className="flex h-screen flex-col overflow-hidden">
          {/* Header */}
          <header className="shrink-0 border-b border-border bg-card">
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
                  <h1 className="text-lg font-semibold text-foreground">
                    {t("chat.title")}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {t("chat.subtitle")}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="shrink-0 border-b border-border bg-muted/30 px-4 py-2">
            <p className="text-center text-sm text-muted-foreground max-w-3xl mx-auto">
              {t("chat.disclaimer")}
            </p>
          </div>

          {/* 장애 유형/정도 선택 (선택 입력) */}
          <div className="shrink-0 border-b border-border bg-card/60 px-4 py-3">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-foreground">
                  장애 유형 (선택)
                </span>
                <Select
                  value={disabilityType}
                  onValueChange={(v) => setDisabilityType(v)}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="입력 안 함" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">입력 안 함</SelectItem>
                    <SelectItem value="mobility">
                      지체(절단/관절/지체기능/변형)
                    </SelectItem>
                    <SelectItem value="brain">뇌병변</SelectItem>
                    <SelectItem value="vision">시각</SelectItem>
                    <SelectItem value="hearing">청각/평형</SelectItem>
                    <SelectItem value="speech">언어/음성/구어</SelectItem>
                    <SelectItem value="face">안면</SelectItem>
                    <SelectItem value="internal">
                      내부기관(신장/심장/간/호흡기/장루·요루/뇌전증)
                    </SelectItem>
                    <SelectItem value="mental">
                      정신적(지적/자폐성/정신장애)
                    </SelectItem>
                  </SelectContent>
                </Select>

                <span className="text-sm font-semibold text-foreground">
                  장애 정도 (선택)
                </span>
                <Select
                  value={disabilitySeverity}
                  onValueChange={(v) => setDisabilitySeverity(v)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="선택 안 함" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">선택 안 함</SelectItem>
                    <SelectItem value="mild">경증</SelectItem>
                    <SelectItem value="severe">중증</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                선택 입력입니다. 제공 시 맞춤 추천과 ISO 매칭 정밀도가
                향상됩니다. 입력하지 않아도 상담은 진행됩니다.
              </p>
            </div>
          </div>

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-4 py-6 min-h-0"
          >
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
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
                    aria-label={
                      message.role === "user"
                        ? t("chat.yourMessage")
                        : t("chat.coordinatorMessage")
                    }
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {isTyping && <TypingIndicator />}

              {suggestedQuestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <p className="w-full text-sm text-muted-foreground">
                    {t("chat.followUpPrompt")}
                  </p>
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

              {/* ICF Visualization (선택 시 표시) */}
              {icfAnalysis && (
                <div className="flex justify-center">
                  <div className="w-full max-w-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        ICF 분석 (원할 때만 확인)
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowIcf((prev) => !prev)}
                      >
                        {showIcf ? "닫기" : "ICF 분석 보기"}
                      </Button>
                    </div>
                    {showIcf && <IcfVisualization data={icfAnalysis} />}
                  </div>
                </div>
              )}

              {/* Recommendation Preview Cards */}
              {showRecommendationCTA &&
                consultationId &&
                icfAnalysis && // ICF 분석이 완료된 경우에만 표시
                previewRecommendations.length > 0 &&
                !isLoadingRecommendations && (
                  <div className="flex justify-center px-4 py-6">
                    <div className="w-full max-w-4xl">
                      <div className="mb-4 text-center">
                        <p className="text-lg font-semibold text-foreground">
                          {t("chat.recommendationPreview")}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {previewRecommendations.map((product, index) => (
                          <div
                            key={product.id || index}
                            className="flex flex-col"
                          >
                            <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted/50 group">
                              {product.image_url ? (
                                <Image
                                  src={product.image_url}
                                  alt={
                                    product.name ||
                                    t("recommendations.defaultCategory")
                                  }
                                  fill
                                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                  loading="lazy"
                                  quality={95}
                                  placeholder="blur"
                                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-muted">
                                  <Package
                                    className="size-12 text-muted-foreground/50"
                                    aria-hidden="true"
                                  />
                                </div>
                              )}
                              {/* 이미지 오버레이 그라데이션 */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                            </div>
                            <div className="flex-1 rounded-b-lg border border-t-0 border-border bg-card p-4">
                              <h3 className="mb-2 line-clamp-2 text-base font-semibold text-foreground">
                                {product.name ||
                                  t("recommendations.defaultCategory")}
                              </h3>
                              {product.match_reason && (
                                <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">
                                  {product.match_reason}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 text-center">
                        <Button
                          size="lg"
                          className={cn(
                            "min-h-[44px] px-8",
                            "bg-primary text-primary-foreground hover:bg-primary/90",
                            "shadow-lg shadow-primary/30",
                            "ring-2 ring-primary ring-offset-2",
                            "animate-pulse hover:animate-none",
                            "transition-all duration-300 hover:scale-105",
                            "font-bold"
                          )}
                          onClick={() => {
                            trackEvent("cta_recommendation_from_chat", {
                              consultation_id: consultationId,
                            });
                            router.push(`/recommendations/${consultationId}`);
                          }}
                        >
                          <ShoppingBag
                            className="mr-2 size-5"
                            aria-hidden="true"
                          />
                          {t("chat.viewMoreRecommendations")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

              {/* Recommendation CTA (Fallback when no preview) */}
              {showRecommendationCTA &&
                consultationId &&
                icfAnalysis && // ICF 분석이 완료된 경우에만 표시
                previewRecommendations.length === 0 && (
                  <div className="flex justify-center px-4 py-6">
                    <div className="w-full max-w-2xl">
                      <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-6 text-center">
                        {isoMatches.length > 0 && (
                          <div className="mb-4 text-left space-y-3">
                            <p className="text-sm font-semibold text-primary">
                              ISO 매칭 결과
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {isoMatches.slice(0, 3).map((match, index) => (
                                <div
                                  key={`${match.isoCode}-${match.label}-${index}`}
                                  className="rounded-lg border border-primary/20 bg-background px-3 py-2 text-left"
                                >
                                  <div className="text-xs text-muted-foreground">
                                    ISO {match.isoCode}
                                  </div>
                                  <div className="font-semibold text-foreground">
                                    {match.label}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {match.reason || match.description}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isLoadingRecommendations ? (
                          <LoadingSpinner
                            size="lg"
                            text={t("chat.loadingRecommendations") || "추천을 준비하고 있습니다..."}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-4">
                            <p className="text-base font-medium text-foreground">
                              {t("chat.recommendationsReady")}
                            </p>
                            <CTAButton
                              variant="recommendations"
                              href={`/recommendations/${consultationId}`}
                              size="lg"
                              className={cn(
                                "shadow-lg shadow-primary/30",
                                "ring-2 ring-primary ring-offset-2",
                                "animate-pulse hover:animate-none",
                                "transition-all duration-300 hover:scale-105",
                                "font-bold"
                              )}
                              onClick={() =>
                                trackEvent("cta_recommendation_from_chat", {
                                  consultation_id: consultationId,
                                })
                              }
                            >
                              {t("chat.viewRecommendations")}
                            </CTAButton>
                            <p className="text-xs text-muted-foreground max-w-md">
                              {t("chat.recommendationsHint")}
                            </p>
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
          <div className="shrink-0 border-t border-border bg-card p-4">
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
                      quality={90}
                      unoptimized={imagePreview.startsWith("data:")}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {selectedImage.name}
                    </p>
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
                    disabled={isUploadingImage}
                  >
                    ×
                  </Button>
                </div>
              )}

              {/* Image Upload Progress */}
              {isUploadingImage && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <InlineSpinner size="sm" />
                  <p className="text-sm text-muted-foreground">
                    {t("chat.uploadingImage") || "이미지를 업로드하고 있습니다..."}
                  </p>
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

              <div className="flex gap-2 items-end">
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
                  {isUploadingImage ? (
                    <InlineSpinner size="sm" />
                  ) : (
                    <Paperclip className="size-6" aria-hidden="true" />
                  )}
                </Button>

                {/* Text Input */}
                <div className="relative flex-1">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={t("chat.placeholder")}
                    className="min-h-14 resize-none text-lg leading-relaxed"
                    rows={1}
                    aria-label="Message input"
                    disabled={requiresLogin}
                  />
                </div>

                {/* Textarea 오른쪽: 음성/전송 버튼 */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="lg"
                      variant={isRecording ? "destructive" : "ghost"}
                      className="size-11"
                      onClick={toggleVoiceRecording}
                      aria-label={
                        isRecording
                          ? t("chat.stopVoiceRecording")
                          : t("chat.startVoiceRecording")
                      }
                      aria-pressed={isRecording}
                      disabled={requiresLogin}
                    >
                      <Mic className="size-6" aria-hidden="true" />
                    </Button>
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
              <p className="mt-3 text-center text-sm text-muted-foreground">
                {t("chat.keyboardShortcuts")}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
