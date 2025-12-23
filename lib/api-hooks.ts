/**
 * SWR을 사용한 API 호출 hooks
 * 
 * 클라이언트 컴포넌트에서 반복 호출되는 API들을 캐싱하여
 * 성능을 개선합니다.
 */

import useSWR from "swr"
import type { RecommendationProduct } from "@/components/recommendations/recommendations-view-with-filters"
import type { UserCoupon } from "@/lib/incentives"

export interface RealtimeStatsData {
  activeUsers: number
  recentEvents: number
  chatSessions: number
  clicks: number
  trend: { time: string; count: number }[]
}

export interface AiQualityData {
  icfExtraction: {
    timestamp: string
    overallAccuracy: {
      precision: number
      recall: number
      f1: number
    }
    categoryBreakdown: Record<
      string,
      { count: number; accuracy: { precision: number; recall: number; f1: number } }
    >
    totalTests: number
    passedTests: number
    failedTests: number
  } | null
  isoMatching: {
    timestamp: string
    overallAccuracy: {
      precision: number
      recall: number
      f1: number
      top1Accuracy: number
      top3Accuracy: number
      top5Accuracy: number
    }
    categoryBreakdown: Record<
      string,
      {
        count: number
        accuracy: {
          precision: number
          recall: number
          f1: number
          top1Accuracy: number
          top3Accuracy: number
          top5Accuracy: number
        }
      }
    >
    matchingMethodComparison: {
      ruleBased: { precision: number; recall: number; f1: number }
      keywordBased: { precision: number; recall: number; f1: number }
      graphBased: { precision: number; recall: number; f1: number }
      hybrid: { precision: number; recall: number; f1: number }
    }
    totalTests: number
    passedTests: number
    failedTests: number
  } | null
}

export interface ConversionRatesData {
  summary: {
    recommendationClickRate: number
    expertInquiryRate: number
    supportProgramClickRate: number
    purchaseConversionRate: number
  }
  metrics: {
    recommendations: { total: number; clicked: number; clickRate: number }
    expertInquiries: { total: number; inquiryRate: number }
    supportProgram: { total: number; clickRate: number }
    purchases: {
      total: number
      conversionRate: number
      totalAmount: number
      averageAmount: number
      totalCommission: number
      averageCommission: number
      bySource: Record<string, number>
    }
  }
  funnel: {
    consultations: number
    recommendations: number
    clicks: number
    expertInquiries: number
    supportClicks: number
    purchases: number
    rates: {
      consultationToRecommendation: number
      recommendationToClick: number
      clickToExpertInquiry: number
      clickToSupport: number
      clickToPurchase: number
      overallConversion: number
    }
  }
  goals: {
    recommendationClickRate: { target: number; current: number; achieved: boolean; gap: number }
    expertInquiryRate: { target: number; current: number; achieved: boolean; gap: number }
    purchaseConversionRate: { target: number; current: number; achieved: boolean; gap: number }
  }
  dailyStats: Array<{
    date: string
    recommendations: number
    clicks: number
    expertInquiries: number
    purchases: number
    clickRate: number
    purchaseRate: number
  }>
  dateRange: string
  timestamp: string
}

export interface FeedbackAnalysisData {
  summary: {
    overallMatchingQuality: number
    averageFeedbackRating: number
    averageEffectivenessScore: number
    clickThroughRate: number
    purchaseConversionRate: number
  }
  metrics: {
    consultationFeedback: {
      total: number
      average: number
      distribution: { 1: number; 2: number; 3: number; 4: number; 5: number }
    }
    ippaEvaluation: {
      total: number
      average: number
      distribution: {
        negative: number
        low: number
        medium: number
        high: number
      }
    }
    recommendations: { total: number; clicked: number; clickRate: number }
    purchases: { total: number; conversionRate: number; totalAmount: number }
  }
  icfCodeFeedback: Array<{
    code: string
    name: string
    category: string
    averageRating: number
    feedbackCount: number
  }>
  isoCodeFeedback: Array<{
    code: string
    averageFeedbackRating: number
    feedbackCount: number
    clickRate: number
    purchaseRate: number
    recommendationCount: number
  }>
  dailyStats: Array<{
    date: string
    feedbackRating: number
    effectivenessScore: number
    clickRate: number
    purchaseRate: number
  }>
  dateRange: string
  timestamp: string
}

export interface EnhancedAnalyticsData {
  metrics: {
    userGrowth: {
      totalUsers: number
      newUsersLast30Days: number
      userGrowthRate: number
      activeUsers: number
      activeUserRate: number
    }
    conversionFunnel: {
      consultationToRecommendationRate: number
      recommendationToClickRate: number
      clickToEvaluationRate: number
      overallConversionRate: number
      totalConsultations: number
      totalRecommendations: number
      clickedRecommendations: number
      totalEvaluations: number
    }
    effectivenessDistribution: {
      min: number
      max: number
      median: number
      p25: number
      p75: number
      p90: number
      totalScores: number
    }
    retention: {
      repeatUsers: number
      retentionRate: number
      activeUsers: number
    }
  } | null
  icfStats: Array<{
    code: string
    category: "b" | "d" | "e"
    totalRecommendations: number
    clickedRecommendations: number
    totalEvaluations: number
    avgEffectivenessScore: number
    clickThroughRate: number
  }>
  isoStats: Array<{
    isoCode: string
    totalRecommendations: number
    clickedRecommendations: number
    totalEvaluations: number
    avgEffectivenessScore: number
    clickThroughRate: number
    productCount: number
  }>
}

export interface AdminLogEntry {
  id: string
  timestamp: string
  level: "info" | "warn" | "error"
  category: string
  action: string
  message: string
  details?: Record<string, unknown>
}

/**
 * 포인트 조회 hook
 */
export function usePoints() {
  const { data, error, isLoading, mutate } = useSWR<{ points: number }>(
    "/api/incentives/points",
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5초 내 중복 요청 제거
    }
  )

  return {
    points: data?.points ?? 0,
    isLoading,
    isError: error,
    mutate, // 수동 재검증용
  }
}

/**
 * 사용자 쿠폰 조회 hook
 */
export function useUserCoupons() {
  const { data, error, isLoading, mutate } = useSWR<{ coupons: UserCoupon[] }>(
    "/api/incentives/coupons?type=user",
    {
      revalidateOnFocus: false, // 쿠폰은 자주 변경되지 않으므로 포커스 시 재검증 비활성화
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // 10초 내 중복 요청 제거
    }
  )

  return {
    coupons: data?.coupons ?? [],
    isLoading,
    isError: error,
    mutate,
  }
}

/**
 * 사용 가능한 쿠폰 조회 hook
 */
export function useAvailableCoupons() {
  const { data, error, isLoading, mutate } = useSWR<{ coupons: UserCoupon[] }>(
    "/api/incentives/coupons?type=available",
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
    }
  )

  return {
    coupons: data?.coupons ?? [],
    isLoading,
    isError: error,
    mutate,
  }
}

/**
 * 상품 추천 조회 hook
 */
export function useRecommendations(consultationId?: string, limit?: number) {
  const key = consultationId
    ? `/api/products?consultationId=${consultationId}${limit ? `&limit=${limit}` : ""}`
    : null

  const { data, error, isLoading, mutate } = useSWR<{ products: RecommendationProduct[] }>(
    key,
    {
      revalidateOnFocus: false, // 추천은 자주 변경되지 않으므로 포커스 시 재검증 비활성화
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30초 내 중복 요청 제거
    }
  )

  return {
    products: data?.products ?? [],
    isLoading,
    isError: error,
    mutate,
  }
}

/**
 * 상담 데이터 조회 hook
 */
export function useConsultation(consultationId: string) {
  const { data, error, isLoading, mutate } = useSWR<{
    consultation: {
      id: string
      title: string
      status: string
      created_at: string
      updated_at: string
    }
    analysis: {
      summary: string | null
      icf_codes: any
      identified_problems: string | null
      env_factors: string | null
    } | null
  }>(
    consultationId ? `/api/consultations/${consultationId}` : null,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  )

  return {
    consultation: data?.consultation,
    analysis: data?.analysis,
    isLoading,
    isError: error,
    mutate,
  }
}

/**
 * CTA A/B 테스트 설정 조회 hook
 */
export function useCtaAbTestConfig() {
  const { data, error, isLoading, mutate } = useSWR<{ config: any }>(
    "/api/cta-ab-test/config",
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1분 내 중복 요청 제거 (A/B 테스트 설정은 자주 변경되지 않음)
    }
  )

  return {
    config: data?.config ?? null,
    isLoading,
    isError: error,
    mutate,
  }
}

/**
 * 관리자 분석 데이터 조회 hook
 */
export function useAdminAnalytics(dateRange?: string, userGroup?: string) {
  const params = new URLSearchParams()
  if (dateRange) params.set("dateRange", dateRange)
  if (userGroup) params.set("userGroup", userGroup)
  
  const key = `/api/admin/analytics?${params.toString()}`

  const { data, error, isLoading, mutate } = useSWR(key, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 10000, // 10초 내 중복 요청 제거
  })

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useRealtimeStats() {
  const { data, error, isLoading, mutate } = useSWR<RealtimeStatsData>(
    "/api/admin/analytics/realtime",
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 10000,
    }
  )

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useAiQualityMetrics() {
  const { data, error, isLoading, mutate } = useSWR<AiQualityData>(
    "/api/admin/analytics/ai-quality",
    {
      revalidateOnFocus: true,
      dedupingInterval: 30000,
    }
  )

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useConversionRates(dateRange: string) {
  const key = dateRange ? `/api/admin/analytics/conversion-rates?dateRange=${dateRange}` : null
  const { data, error, isLoading, mutate } = useSWR<ConversionRatesData>(key, {
    revalidateOnFocus: false,
    dedupingInterval: 15000,
  })

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useFeedbackAnalysis(dateRange: string) {
  const key = dateRange ? `/api/admin/analytics/feedback-analysis?dateRange=${dateRange}` : null
  const { data, error, isLoading, mutate } = useSWR<FeedbackAnalysisData>(key, {
    revalidateOnFocus: false,
    dedupingInterval: 15000,
  })

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function useAdminLogs(filterLevel: "all" | "info" | "warn" | "error") {
  const query = filterLevel === "all" ? "" : `?level=${filterLevel}`
  const key = `/api/admin/logs?limit=50${query}`
  const { data, error, isLoading, mutate } = useSWR<{ logs: AdminLogEntry[] }>(key, {
    revalidateOnFocus: true,
    dedupingInterval: 10000,
  })

  return {
    logs: data?.logs ?? [],
    isLoading,
    isError: error,
    mutate,
  }
}

export function useEnhancedAnalytics() {
  const fetcher = async (): Promise<EnhancedAnalyticsData> => {
    const [metricsRes, icfRes, isoRes] = await Promise.all([
      fetch("/api/admin/analytics?daily=true"),
      fetch("/api/admin/analytics/icf-stats"),
      fetch("/api/admin/analytics/iso-stats"),
    ])

    if (!metricsRes.ok) {
      throw new Error("관리자 메트릭을 불러오지 못했습니다.")
    }
    const metricsData = await metricsRes.json()

    if (!icfRes.ok) {
      throw new Error("ICF 통계를 불러오지 못했습니다.")
    }
    const icfData = await icfRes.json()

    if (!isoRes.ok) {
      throw new Error("ISO 통계를 불러오지 못했습니다.")
    }
    const isoData = await isoRes.json()

    return {
      metrics: metricsData.metrics ?? null,
      icfStats: icfData.stats ?? [],
      isoStats: isoData.stats ?? [],
    }
  }

  const { data, error, isLoading, mutate } = useSWR<EnhancedAnalyticsData>(
    "admin-enhanced-analytics",
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 20000,
    }
  )

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  }
}

