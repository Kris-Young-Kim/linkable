/**
 * API 성능 측정 유틸리티
 * 
 * API 요청/응답 시간, 에러율 등을 측정하고 로깅합니다.
 */

export interface ApiPerformanceLog {
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  request_size_bytes?: number;
  response_size_bytes?: number;
  user_id?: string;
  error_message?: string;
  timestamp: string;
}

/**
 * API 성능 로그를 Supabase에 저장합니다.
 */
export async function logApiPerformance(
  log: ApiPerformanceLog
): Promise<void> {
  try {
    await fetch("/api/performance/api-logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(log),
    });
  } catch (error) {
    // 로깅 실패는 조용히 무시
    console.error("[API Performance] Logging failed:", error);
  }
}

/**
 * API 요청 시간을 측정하는 래퍼 함수
 */
export async function measureApiPerformance<T>(
  endpoint: string,
  method: string,
  requestFn: () => Promise<Response>,
  userId?: string
): Promise<Response> {
  const startTime = performance.now();
  let statusCode = 500;
  let errorMessage: string | undefined;
  let responseSize = 0;

  try {
    const response = await requestFn();
    statusCode = response.status;
    
    // 응답 크기 측정 (가능한 경우)
    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      responseSize = parseInt(contentLength, 10);
    } else {
      // 응답 본문을 복제하여 크기 측정 (주의: 스트림인 경우 실패할 수 있음)
      try {
        const clonedResponse = response.clone();
        const blob = await clonedResponse.blob();
        responseSize = blob.size;
      } catch {
        // 측정 실패 시 무시
      }
    }

    const endTime = performance.now();
    const responseTime = endTime - startTime;

    // 성능 로그 기록 (비동기, 실패해도 메인 플로우에 영향 없음)
    logApiPerformance({
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: Math.round(responseTime),
      response_size_bytes: responseSize,
      user_id: userId,
      timestamp: new Date().toISOString(),
    }).catch(() => {
      // 로깅 실패는 무시
    });

    return response;
  } catch (error) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    errorMessage = error instanceof Error ? error.message : String(error);

    // 에러 로그 기록
    logApiPerformance({
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: Math.round(responseTime),
      user_id: userId,
      error_message: errorMessage,
      timestamp: new Date().toISOString(),
    }).catch(() => {
      // 로깅 실패는 무시
    });

    throw error;
  }
}
