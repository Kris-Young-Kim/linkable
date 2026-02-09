/**
 * Google Gemini Embedding API 연동
 *
 * gemini-embedding-001 모델을 사용하여 텍스트를 벡터 임베딩으로 변환합니다.
 * (text-embedding-004 deprecated, 2025년부터 gemini-embedding-001 사용)
 */

const GEMINI_EMBEDDING_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

// 설정
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000; // 30초 타임아웃 (동시 요청 시 충분한 시간 확보)

// LRU 캐시 설정 (동일 텍스트 중복 API 호출 방지)
const CACHE_MAX_SIZE = 500;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10분

interface CacheEntry {
  embedding: number[];
  timestamp: number;
}

const embeddingCache = new Map<string, CacheEntry>();

function getCachedEmbedding(text: string): number[] | null {
  const cached = embeddingCache.get(text);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.embedding;
  }
  // 만료된 캐시 삭제
  if (cached) {
    embeddingCache.delete(text);
  }
  return null;
}

function setCachedEmbedding(text: string, embedding: number[]): void {
  // LRU: 캐시가 가득 차면 가장 오래된 항목 삭제
  if (embeddingCache.size >= CACHE_MAX_SIZE) {
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey) embeddingCache.delete(firstKey);
  }
  embeddingCache.set(text, { embedding, timestamp: Date.now() });
}

// 동시성 제한 (Gemini API 과부하 방지)
const MAX_CONCURRENT_REQUESTS = 3;
let currentRequests = 0;
const requestQueue: Array<() => void> = [];

async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  // 대기 큐에 추가
  if (currentRequests >= MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>((resolve) => requestQueue.push(resolve));
  }

  currentRequests++;
  try {
    return await fn();
  } finally {
    currentRequests--;
    // 다음 대기자 깨우기
    const next = requestQueue.shift();
    if (next) next();
  }
}

export interface EmbeddingResponse {
  embedding: {
    values: number[];
  };
}

/**
 * 지연 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 재시도 가능한 에러인지 확인
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const cause = (error as { cause?: { code?: string } }).cause;

    // 네트워크 에러 (ECONNRESET, ETIMEDOUT 등)
    if (cause?.code === "ECONNRESET" || cause?.code === "ETIMEDOUT") {
      return true;
    }

    // fetch 실패
    if (message.includes("fetch failed")) {
      return true;
    }

    // 타임아웃
    if (message.includes("timeout") || message.includes("aborted")) {
      return true;
    }

    // 5xx 서버 에러
    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * 텍스트를 벡터 임베딩으로 변환 (내부 함수)
 */
async function createEmbeddingInternal(
  text: string,
  apiKey: string,
): Promise<number[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_EMBEDDING_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: {
          parts: [
            {
              text: text,
            },
          ],
        },
        output_dimensionality: 768, // 기존 DB 스키마 호환 (vector 768)
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gemini Embedding API error: ${response.status} ${errorText}`,
      );
    }

    const data = (await response.json()) as EmbeddingResponse;
    return data.embedding.values;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 텍스트를 벡터 임베딩으로 변환 (캐시 + 동시성 제한 + 재시도 로직 포함)
 *
 * @param text 임베딩할 텍스트
 * @param throwOnError 에러 발생 시 throw 할지 여부 (기본: false, 빈 배열 반환)
 * @returns 768차원 벡터 배열
 */
export async function createEmbedding(
  text: string,
  throwOnError: boolean = false,
): Promise<number[]> {
  // 1. 캐시 확인
  const cached = getCachedEmbedding(text);
  if (cached) {
    return cached;
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    if (throwOnError) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
    }
    console.warn(
      "[gemini-embedding] API key not configured, returning empty embedding",
    );
    return [];
  }

  // 2. 동시성 제한 적용하여 API 호출
  return withConcurrencyLimit(async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const embedding = await createEmbeddingInternal(text, apiKey);
        // 3. 성공 시 캐시에 저장
        setCachedEmbedding(text, embedding);
        return embedding;
      } catch (error) {
        lastError = error;

        // 재시도 가능한 에러인지 확인
        if (isRetryableError(error) && attempt < MAX_RETRIES - 1) {
          const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.warn(
            `[gemini-embedding] Retry ${attempt + 1}/${MAX_RETRIES} after ${delayMs}ms:`,
            error instanceof Error ? error.message : error,
          );
          await delay(delayMs);
          continue;
        }

        // 재시도 불가능한 에러이거나 마지막 시도
        break;
      }
    }

    // 모든 재시도 실패
    console.error("[gemini-embedding] All retries failed:", lastError);

    if (throwOnError) {
      throw lastError;
    }

    // graceful fallback: 빈 배열 반환 (다른 매칭 방식으로 폴백 가능)
    return [];
  });
}

/**
 * 여러 텍스트를 배치로 임베딩 생성
 *
 * @param texts 임베딩할 텍스트 배열
 * @returns 벡터 배열
 */
export async function createEmbeddingsBatch(
  texts: string[],
): Promise<number[][]> {
  // Gemini API는 배치 요청을 지원하지 않으므로 순차적으로 처리
  // Rate limit을 고려하여 지연 시간 추가
  const embeddings: number[][] = [];
  const delay = 100; // 100ms 지연

  for (let i = 0; i < texts.length; i++) {
    try {
      const embedding = await createEmbedding(texts[i]);
      embeddings.push(embedding);

      // 마지막 항목이 아니면 지연
      if (i < texts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(
        `[gemini-embedding] Failed to create embedding for text ${i}:`,
        error,
      );
      // 에러 발생 시 빈 벡터 추가 (나중에 재시도 가능하도록)
      embeddings.push([]);
    }
  }

  return embeddings;
}
