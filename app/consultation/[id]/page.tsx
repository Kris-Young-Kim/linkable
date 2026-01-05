import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { ArrowLeft, CalendarClock, MessageSquareText } from "lucide-react";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import type { IcfAnalysisBuckets } from "@/components/features/analysis/icf-visualization";

// 클라이언트 컴포넌트들을 동적 import로 분리
const IcfVisualization = dynamic(
  () =>
    import("@/components/features/analysis/icf-visualization").then((mod) => ({
      default: mod.IcfVisualization,
    })),
  {
    loading: () => (
      <div className="h-64 bg-muted/50 animate-pulse rounded-lg" />
    ),
  }
);

const ProductRecommendationCard = dynamic(
  () =>
    import("@/components/product-recommendation-card").then((mod) => ({
      default: mod.ProductRecommendationCard,
    })),
  {
    loading: () => (
      <div className="h-96 bg-muted/50 animate-pulse rounded-lg border border-border" />
    ),
  }
);

const ConsultationRating = dynamic(
  () =>
    import("@/components/consultation-rating").then((mod) => ({
      default: mod.ConsultationRating,
    })),
  {
    loading: () => (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted animate-pulse rounded w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    ),
  }
);

const ChatHistoryCollapsible = dynamic(
  () =>
    import("@/components/consultation/chat-history-collapsible").then(
      (mod) => ({ default: mod.ChatHistoryCollapsible })
    ),
  {
    loading: () => (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted animate-pulse rounded w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    ),
  }
);

const AutoGenerateRecommendations = dynamic(() =>
  import("@/components/consultation/auto-generate-recommendations").then(
    (mod) => ({ default: mod.AutoGenerateRecommendations })
  )
);

// 플로팅 액션 메뉴 (클라이언트 컴포넌트)
const FloatingActionMenu = dynamic(() =>
  import("@/components/floating-action-menu").then((mod) => ({
    default: mod.FloatingActionMenu,
  }))
);

type MessageRow = {
  id: string;
  sender: "user" | "ai" | "system";
  message_text: string;
  created_at: string;
};

type RecommendationRow = {
  id: string;
  match_reason: string | null;
  rank: number | null;
  product: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    iso_code: string | null;
    price: number | null;
    purchase_link: string | null;
    rating: number | null;
    review_count: number | null;
  } | null;
};

const statusBadgeMap: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  in_progress: { label: "진행 중", className: "bg-amber-100 text-amber-900" },
  completed: { label: "완료", className: "bg-emerald-100 text-emerald-900" },
  archived: { label: "보관됨", className: "bg-slate-200 text-slate-800" },
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { userId } = await auth();

  // 기본 메타데이터 (인증되지 않은 경우 또는 데이터 조회 실패 시)
  const defaultMetadata: Metadata = {
    title: "상담 상세 — LinkAble",
    description: "상담 내역과 분석 결과를 확인하세요.",
    robots: {
      index: false,
      follow: false,
    },
  };

  if (!userId) {
    return defaultMetadata;
  }

  try {
    // 메타데이터 생성을 위한 경량 조회
    const supabase = getSupabaseServerClient();
    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    if (!userRow?.id) {
      return defaultMetadata;
    }

    const { data: consultationData } = await supabase
      .from("consultations")
      .select("id, title, status")
      .eq("id", id)
      .eq("user_id", userRow.id)
      .maybeSingle();

    if (!consultationData) {
      return defaultMetadata;
    }

    // 상담 제목을 사용하여 동적 메타데이터 생성
    const title = consultationData.title
      ? `${consultationData.title} — 상담 상세 | LinkAble`
      : "상담 상세 — LinkAble";
    const description = consultationData.title
      ? `${consultationData.title} 상담의 내역과 분석 결과를 확인하세요.`
      : "상담 내역과 분석 결과를 확인하세요.";

    return {
      title,
      description,
      robots: {
        index: false,
        follow: false,
      },
    };
  } catch (error) {
    console.error("[generateMetadata] consultation error:", error);
    return defaultMetadata;
  }
}

async function fetchUserRowId(clerkUserId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  return data.id;
}

export default async function ConsultationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) {
    redirect(`/sign-in?redirect_url=/consultation/${id}`);
  }

  const userRowId = await fetchUserRowId(userId);
  if (!userRowId) {
    // 리다이렉트 대신 에러 페이지 표시 (301 리다이렉트 방지)
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-10 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>접근 권한이 없습니다</CardTitle>
              <CardDescription>
                사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard">대시보드로 돌아가기</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const supabase = getSupabaseServerClient();

  // 먼저 기본 상담 정보만 조회
  const { data: consultationData, error: consultationError } = await supabase
    .from("consultations")
    .select("id, title, status, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", userRowId)
    .maybeSingle();

  if (consultationError) {
    console.error("[consultation detail] 상담 조회 오류:", {
      error: consultationError,
      code: consultationError.code,
      message: consultationError.message,
      details: consultationError.details,
      hint: consultationError.hint,
      consultationId: id,
      userRowId,
    });
  }

  if (!consultationData) {
    console.error("[consultation detail] 상담 데이터 없음:", {
      consultationId: id,
      userRowId,
    });
  }

  // 상담이 없으면 404 Not Found 반환 (SEO를 위한 올바른 HTTP 상태 코드)
  if (consultationError || !consultationData) {
    console.error("[consultation detail] 상담을 찾을 수 없음 - 404 반환:", {
      consultationId: id,
      userRowId,
      error: consultationError,
    });
    notFound();
  }

  // 관련 데이터를 별도로 조회
  const [
    analysisResult,
    recommendationsResult,
    messagesResult,
    feedbackResult,
  ] = await Promise.all([
    // 분석 결과
    supabase
      .from("analysis_results")
      .select("summary, icf_codes, identified_problems")
      .eq("consultation_id", id)
      .maybeSingle(),

    // 추천 목록
    supabase
      .from("recommendations")
      .select(
        `
        id,
        match_reason,
        rank,
        product_id,
        product:product_id(
          id,
          name,
          description,
          image_url,
          purchase_link,
          price,
          iso_code,
          rating,
          review_count
        )
      `
      )
      .eq("consultation_id", id)
      .order("rank", { ascending: true }),

    // 메시지
    supabase
      .from("chat_messages")
      .select("id, sender, message_text, created_at")
      .eq("consultation_id", id)
      .order("created_at", { ascending: true }),

    // 피드백
    supabase
      .from("consultation_feedback")
      .select("accuracy_rating, feedback_comment")
      .eq("consultation_id", id)
      .maybeSingle(),
  ]);

  // 에러 로깅 (피드백은 선택적이므로 에러가 있어도 무시)
  if (analysisResult.error && analysisResult.error.code !== "PGRST116") {
    console.error("[consultation detail] 분석 결과 조회 오류:", {
      error: analysisResult.error,
      code: analysisResult.error.code,
      message: analysisResult.error.message,
    });
  }
  if (recommendationsResult.error) {
    console.error("[consultation detail] 추천 조회 오류:", {
      error: recommendationsResult.error,
      code: recommendationsResult.error.code,
      message: recommendationsResult.error.message,
    });
  }
  if (messagesResult.error) {
    console.error("[consultation detail] 메시지 조회 오류:", {
      error: messagesResult.error,
      code: messagesResult.error.code,
      message: messagesResult.error.message,
    });
  }
  // 피드백은 선택적이므로 에러가 있어도 경고만 표시
  if (feedbackResult.error && feedbackResult.error.code !== "PGRST116") {
    console.warn("[consultation detail] 피드백 조회 경고 (무시됨):", {
      error: feedbackResult.error,
      code: feedbackResult.error.code,
      message: feedbackResult.error.message,
    });
  }

  // 데이터 정리 (에러가 있어도 사용 가능한 데이터는 사용)
  const data = {
    ...consultationData,
    analysis: analysisResult.error ? null : analysisResult.data,
    recommendations: recommendationsResult.error
      ? []
      : recommendationsResult.data ?? [],
    messages: messagesResult.error ? [] : messagesResult.data ?? [],
    feedback: feedbackResult.error ? null : feedbackResult.data,
  };

  const analysisData = data.analysis;
  const icfBuckets =
    analysisData &&
    analysisData.icf_codes &&
    typeof analysisData.icf_codes === "object"
      ? (analysisData.icf_codes as IcfAnalysisBuckets)
      : null;

  const recommendations: RecommendationRow[] =
    data.recommendations?.map((rec) => ({
      ...rec,
      product: Array.isArray(rec.product)
        ? rec.product[0] ?? null
        : rec.product,
    })) ?? [];

  const messages: MessageRow[] = Array.isArray(data.messages)
    ? data.messages
    : [];

  // K-IPPA 평가 요약 (추천 보조기기 기준)
  let ippaSummary: {
    total: number;
    averageEffectiveness: number | null;
    lastEvaluatedAt: string | null;
  } | null = null;

  if (recommendations.length > 0) {
    const recommendationIds = recommendations.map((rec) => rec.id);

    const { data: ippaRows, error: ippaError } = await supabase
      .from("ippa_evaluations")
      .select("recommendation_id, effectiveness_score, evaluated_at")
      .in("recommendation_id", recommendationIds);

    if (ippaError) {
      console.error("[consultation detail] K-IPPA 조회 오류:", ippaError);
    } else if (ippaRows && ippaRows.length > 0) {
      const total = ippaRows.length;
      const avg =
        ippaRows.reduce((sum, row) => sum + (row.effectiveness_score ?? 0), 0) /
        total;
      const lastEvaluatedAt = ippaRows
        .map((row) => row.evaluated_at)
        .filter(Boolean)
        .sort()
        .at(-1);

      ippaSummary = {
        total,
        averageEffectiveness: Number.isFinite(avg) ? Number(avg) : null,
        lastEvaluatedAt: lastEvaluatedAt ?? null,
      };
    }
  }

  const statusMeta = statusBadgeMap[data.status] ?? statusBadgeMap.in_progress;
  const title = data.title || "제목 없는 상담";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-10 space-y-8">
        <Breadcrumbs
          className="text-xs text-muted-foreground"
          items={[
            { translationKey: "breadcrumbs.dashboard", href: "/dashboard" },
            { label: title },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              asChild
              aria-label="대시보드로 돌아가기"
            >
              <Link href="/dashboard">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <p className="text-sm text-muted-foreground">
                Consultation Detail
              </p>
              <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1">
              <CalendarClock className="size-4" />
              {formatDateTime(data.created_at)}
            </div>
            <Badge variant="outline" className={statusMeta.className}>
              {statusMeta.label}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* 사이드 내비게이션 */}
          <div className="lg:sticky lg:top-24">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">바로가기</CardTitle>
                <CardDescription>상담 상세 메뉴</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { href: "#summary", label: "상담 내역" },
                  { href: "#recommendations", label: "추천 보조기기" },
                  { href: "#icf", label: "ICF 분석" },
                  { href: "#kippa", label: "K-IPPA" },
                  { href: "#chat", label: "채팅 기록" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="space-y-6">
            {/* 상담 내역 정리 */}
            <Card id="summary">
              <CardHeader>
                <CardTitle>상담 내역 정리</CardTitle>
                <CardDescription>
                  AI가 상담 내용을 분석하여 정리한 핵심 정보입니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">
                    상담 요약
                  </p>
                  <p className="text-base leading-relaxed text-foreground">
                    {analysisData?.summary ??
                      "요약 정보가 준비되지 않았습니다."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 추천 보조기기 목록 */}
            <Card id="recommendations">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquareText
                    className="size-5 text-primary"
                    aria-hidden="true"
                  />
                  추천 보조기기 ({recommendations.length}개)
                </CardTitle>
                <CardDescription>
                  상담 내용을 바탕으로 추천된 보조기기 목록입니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recommendations.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {recommendations.map((rec) =>
                      rec.product ? (
                        <ProductRecommendationCard
                          key={rec.id}
                          recommendationId={rec.id}
                          productName={rec.product.name}
                          description={
                            rec.product.description ??
                            "상세 설명 준비 중입니다."
                          }
                          functionalSupport={rec.product.description ?? ""}
                          imageUrl={rec.product.image_url ?? undefined}
                          matchReason={rec.match_reason ?? undefined}
                          matchScore={
                            rec.rank
                              ? 1 - Math.min(rec.rank / 10, 0.9)
                              : undefined
                          }
                          isoCode={rec.product.iso_code ?? undefined}
                          price={rec.product.price}
                          purchaseLink={rec.product.purchase_link}
                          rating={rec.product.rating ?? undefined}
                          reviewCount={rec.product.review_count ?? undefined}
                        />
                      ) : null
                    )}
                  </div>
                ) : (
                  <AutoGenerateRecommendations
                    consultationId={id}
                    hasRecommendations={recommendations.length > 0}
                    hasIcfCodes={
                      !!icfBuckets &&
                      (icfBuckets.b?.length ?? 0) +
                        (icfBuckets.d?.length ?? 0) +
                        (icfBuckets.e?.length ?? 0) >
                        0
                    }
                  />
                )}
              </CardContent>
            </Card>

            {/* K-IPPA 요약 카드 */}
            <Card id="kippa">
              <CardHeader>
                <CardTitle>K-IPPA 평가</CardTitle>
                <CardDescription>
                  추천 보조기기에 대한 효과성 평가 결과를 확인하고 사후 평가로
                  이동합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ippaSummary ? (
                  <>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-muted-foreground">
                          평균 효과성
                        </span>
                        <span className="text-2xl font-bold">
                          {ippaSummary.averageEffectiveness?.toFixed(1) ?? "-"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>평가 수</span>
                        <Badge variant="secondary">{ippaSummary.total}</Badge>
                      </div>
                      {ippaSummary.lastEvaluatedAt && (
                        <div className="text-sm text-muted-foreground">
                          최근 평가:{" "}
                          {formatDateTime(ippaSummary.lastEvaluatedAt)}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      {recommendations[0] ? (
                        <Button asChild>
                          <Link
                            href={`/dashboard/ippa/${recommendations[0].id}`}
                          >
                            평가하기
                          </Link>
                        </Button>
                      ) : (
                        <Button disabled>
                          추천이 있어야 평가할 수 있습니다
                        </Button>
                      )}
                      <Button asChild variant="outline">
                        <Link href="/dashboard/ippa">내 K-IPPA 내역</Link>
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground">
                      아직 K-IPPA 평가가 없습니다. 추천 보조기기 사용 후
                      효과성을 평가해 주세요.
                    </p>
                    <div className="flex gap-3">
                      {recommendations[0] ? (
                        <Button asChild>
                          <Link
                            href={`/dashboard/ippa/${recommendations[0].id}`}
                          >
                            첫 평가 진행하기
                          </Link>
                        </Button>
                      ) : (
                        <Button disabled>
                          추천이 있어야 평가할 수 있습니다
                        </Button>
                      )}
                      <Button asChild variant="outline">
                        <Link href="/dashboard/ippa">내 K-IPPA 내역</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 상담 평가 (추천 보조기기 만족도) */}
            <ConsultationRating
              consultationId={data.id}
              existingRating={
                Array.isArray(data.feedback)
                  ? data.feedback[0]?.accuracy_rating
                  : data.feedback?.accuracy_rating
              }
              existingComment={
                Array.isArray(data.feedback)
                  ? data.feedback[0]?.feedback_comment
                  : data.feedback?.feedback_comment
              }
            />

            {/* ICF 분석 결과 */}
            <Card id="icf">
              <CardHeader>
                <CardTitle>ICF 분석 결과</CardTitle>
                <CardDescription>
                  채팅 중 추출된 ICF 코드를 시각화하여 표시합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {icfBuckets ? (
                  <IcfVisualization data={icfBuckets} />
                ) : (
                  <p className="text-sm text-muted-foreground py-4">
                    ICF 분석 데이터가 없습니다.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 채팅 기록 (접을 수 있게) */}
            <div id="chat">
              <ChatHistoryCollapsible messages={messages} />
            </div>
          </div>
        </div>
      </div>

      {/* 플로팅 액션 메뉴 */}
      <FloatingActionMenu />
    </div>
  );
}
