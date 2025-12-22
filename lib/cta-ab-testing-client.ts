/**
 * CTA A/B 테스트 시스템 - 클라이언트 전용 래퍼
 * 
 * 클라이언트 컴포넌트에서 사용하는 CTA A/B 테스트 함수들
 * 서버 사이드 함수는 API route를 통해 호출합니다.
 */

"use client";

import type { CtaVariant, CtaAbTestConfig } from "./cta-ab-testing";

/**
 * 활성화된 CTA A/B 테스트 설정 조회 (클라이언트)
 */
export async function getActiveCtaAbTestConfig(): Promise<CtaAbTestConfig | null> {
  try {
    const response = await fetch("/api/cta-ab-test/config");
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.config || null;
  } catch (error) {
    console.error("[CTA AB Test] Config load failed:", error);
    return null;
  }
}

/**
 * CTA 변형 할당 (클라이언트)
 */
export async function assignCtaVariant(
  testConfigId: string,
  userId?: string,
  consultationId?: string
): Promise<CtaVariant | null> {
  try {
    const response = await fetch("/api/cta-ab-test/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        testConfigId,
        userId,
        consultationId,
      }),
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.variant || null;
  } catch (error) {
    console.error("[CTA AB Test] Variant assignment failed:", error);
    return null;
  }
}

/**
 * CTA 성능 로그 기록 (클라이언트)
 */
export async function logCtaPerformance(
  variantId: string,
  eventType: "impression" | "primary_click" | "secondary_click" | "tertiary_click" | "purchase",
  options?: {
    userId?: string;
    consultationId?: string;
    recommendationId?: string;
    timeToClickMs?: number;
    scrollPosition?: number;
    viewportPosition?: "top" | "middle" | "bottom";
    userAgent?: string;
    screenSize?: "mobile" | "tablet" | "desktop";
  }
): Promise<void> {
  try {
    await fetch("/api/cta-ab-test/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variantId,
        eventType,
        ...options,
      }),
    });
  } catch (error) {
    console.error("[CTA AB Test] Performance logging failed:", error);
    // 실패해도 메인 플로우에 영향 없음
  }
}

