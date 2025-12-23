/**
 * API 호출 및 재시도 관련 유틸리티
 */

import { logEvent } from "./logging";

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  factor?: number;
  retryCondition?: (error: any) => boolean;
}

/**
 * 지수 백오프(Exponential Backoff)를 적용한 fetch 재시도 함수
 * 
 * @param url 요청할 URL
 * @param init Fetch 옵션
 * @param options 재시도 옵션
 */
export async function fetchWithRetry(
  url: string | URL,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    retryCondition = (res: Response) => res.status >= 500 || res.status === 429,
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);

      if (!retryCondition(response) || attempt === maxRetries) {
        return response;
      }

      // 재시도가 필요한 상태 (5xx 에러 등)
      logEvent({
        category: "system",
        action: `api_retry_attempt_${attempt + 1}`,
        level: "warn",
        payload: {
          url: url.toString(),
          status: response.status,
          nextDelay: delay
        }
      });

    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        logEvent({
          category: "system",
          action: "api_retry_failed_all",
          level: "error",
          payload: {
            url: url.toString(),
            error: error instanceof Error ? error.message : String(error)
          }
        });
        throw error;
      }

      logEvent({
        category: "system",
        action: `api_retry_error_attempt_${attempt + 1}`,
        level: "warn",
        payload: {
          url: url.toString(),
          error: error instanceof Error ? error.message : String(error),
          nextDelay: delay
        }
      });
    }

    // 다음 재시도 전 대기
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * factor, maxDelay);
  }

  throw lastError || new Error("최대 재시도 횟수를 초과했습니다.");
}

/**
 * 일반 함수를 재시도 가능하게 래핑하는 헬퍼
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Omit<RetryOptions, 'retryCondition'> & { retryCondition?: (error: any) => boolean } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    retryCondition = () => true, // 기본적으로 모든 에러에 대해 재시도
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!retryCondition(error) || attempt === maxRetries) {
        throw error;
      }

      console.warn(`[Retry] Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`, error);

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw lastError;
}

