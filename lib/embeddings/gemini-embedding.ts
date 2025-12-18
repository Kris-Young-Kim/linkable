/**
 * Google Gemini Embedding API 연동
 * 
 * text-embedding-004 모델을 사용하여 텍스트를 벡터 임베딩으로 변환합니다.
 */

const GEMINI_EMBEDDING_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

export interface EmbeddingResponse {
  embedding: {
    values: number[];
  };
}

/**
 * 텍스트를 벡터 임베딩으로 변환
 * 
 * @param text 임베딩할 텍스트
 * @returns 768차원 벡터 배열
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not configured");
  }

  try {
    const response = await fetch(`${GEMINI_EMBEDDING_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: {
          parts: [
            {
              text: text,
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gemini Embedding API error: ${response.status} ${errorText}`
      );
    }

    const data = (await response.json()) as EmbeddingResponse;
    return data.embedding.values;
  } catch (error) {
    console.error("[gemini-embedding] Failed to create embedding:", error);
    throw error;
  }
}

/**
 * 여러 텍스트를 배치로 임베딩 생성
 * 
 * @param texts 임베딩할 텍스트 배열
 * @returns 벡터 배열
 */
export async function createEmbeddingsBatch(
  texts: string[]
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
        error
      );
      // 에러 발생 시 빈 벡터 추가 (나중에 재시도 가능하도록)
      embeddings.push([]);
    }
  }

  return embeddings;
}

