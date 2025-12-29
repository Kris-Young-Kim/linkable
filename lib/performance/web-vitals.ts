/**
 * Core Web Vitals 추적 유틸리티
 * 
 * LCP, FID, CLS, TTFB 등의 Core Web Vitals 지표를 측정하고
 * Supabase에 저장하여 성능 모니터링을 수행합니다.
 */

export interface WebVitalsMetric {
  id: string;
  name: string;
  value: number;
  delta: number;
  rating: "good" | "needs-improvement" | "poor";
  navigationType?: string;
  url?: string;
  timestamp?: number;
}

export interface PerformanceLog {
  metric_name: string;
  metric_value: number;
  metric_rating: "good" | "needs-improvement" | "poor";
  page_path: string;
  page_url: string;
  user_agent?: string;
  connection_type?: string;
  device_memory?: number;
  hardware_concurrency?: number;
  timestamp: string;
}

/**
 * Core Web Vitals 지표를 평가합니다.
 */
export function getRating(
  name: string,
  value: number
): "good" | "needs-improvement" | "poor" {
  const thresholds: Record<
    string,
    { good: number; poor: number }
  > = {
    LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
    FID: { good: 100, poor: 300 }, // First Input Delay
    CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
    FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
    TTFB: { good: 800, poor: 1800 }, // Time to First Byte
    INP: { good: 200, poor: 500 }, // Interaction to Next Paint
  };

  const threshold = thresholds[name];
  if (!threshold) {
    return "good";
  }

  if (value <= threshold.good) {
    return "good";
  } else if (value <= threshold.poor) {
    return "needs-improvement";
  } else {
    return "poor";
  }
}

/**
 * Web Vitals 지표를 Supabase에 저장합니다.
 */
export async function logWebVitals(metric: WebVitalsMetric): Promise<void> {
  try {
    const rating = getRating(metric.name, metric.value);
    
    const logData: PerformanceLog = {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_rating: rating,
      page_path: metric.url
        ? new URL(metric.url).pathname
        : window.location.pathname,
      page_url: metric.url || window.location.href,
      user_agent: navigator.userAgent,
      connection_type: (navigator as any).connection?.effectiveType,
      device_memory: (navigator as any).deviceMemory,
      hardware_concurrency: navigator.hardwareConcurrency,
      timestamp: new Date().toISOString(),
    };

    // API 엔드포인트로 전송
    await fetch("/api/performance/web-vitals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(logData),
    });
  } catch (error) {
    // 로깅 실패는 조용히 무시 (메인 플로우에 영향 없음)
    console.error("[Web Vitals] Logging failed:", error);
  }
}

/**
 * Web Vitals를 추적하기 위한 초기화 함수
 */
export function reportWebVitals(
  onPerfEntry?: (metric: WebVitalsMetric) => void
): void {
  if (typeof window === "undefined") {
    return;
  }

  // web-vitals 라이브러리를 동적으로 로드
  // 참고: web-vitals 5.x에서는 onFID가 제거되고 onINP로 대체됨
  import("web-vitals").then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
    onCLS((metric) => {
      const webVitalsMetric: WebVitalsMetric = {
        id: metric.id,
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        rating: getRating(metric.name, metric.value),
        navigationType: metric.navigationType,
        url: window.location.href,
        timestamp: Date.now(),
      };
      logWebVitals(webVitalsMetric);
      onPerfEntry?.(webVitalsMetric);
    });

    onFCP((metric) => {
      const webVitalsMetric: WebVitalsMetric = {
        id: metric.id,
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        rating: getRating(metric.name, metric.value),
        navigationType: metric.navigationType,
        url: window.location.href,
        timestamp: Date.now(),
      };
      logWebVitals(webVitalsMetric);
      onPerfEntry?.(webVitalsMetric);
    });

    onLCP((metric) => {
      const webVitalsMetric: WebVitalsMetric = {
        id: metric.id,
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        rating: getRating(metric.name, metric.value),
        navigationType: metric.navigationType,
        url: window.location.href,
        timestamp: Date.now(),
      };
      logWebVitals(webVitalsMetric);
      onPerfEntry?.(webVitalsMetric);
    });

    onTTFB((metric) => {
      const webVitalsMetric: WebVitalsMetric = {
        id: metric.id,
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        rating: getRating(metric.name, metric.value),
        navigationType: metric.navigationType,
        url: window.location.href,
        timestamp: Date.now(),
      };
      logWebVitals(webVitalsMetric);
      onPerfEntry?.(webVitalsMetric);
    });

    onINP((metric) => {
      const webVitalsMetric: WebVitalsMetric = {
        id: metric.id,
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        rating: getRating(metric.name, metric.value),
        navigationType: metric.navigationType,
        url: window.location.href,
        timestamp: Date.now(),
      };
      logWebVitals(webVitalsMetric);
      onPerfEntry?.(webVitalsMetric);
    });
  }).catch((error) => {
    console.error("[Web Vitals] Failed to load web-vitals library:", error);
  });
}
