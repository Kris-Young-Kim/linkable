"use client";

import { useEffect } from "react";
import { reportWebVitals } from "@/lib/performance/web-vitals";

/**
 * Web Vitals 추적 컴포넌트
 * 
 * 페이지 로드 시 Core Web Vitals를 자동으로 추적합니다.
 */
export function WebVitalsTracker() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Web Vitals 추적 시작
    reportWebVitals((metric) => {
      // 개발 환경에서만 콘솔에 출력
      if (process.env.NODE_ENV === "development") {
        console.log("[Web Vitals]", metric.name, {
          value: metric.value,
          rating: metric.rating,
          delta: metric.delta,
        });
      }
    });
  }, []);

  return null;
}
