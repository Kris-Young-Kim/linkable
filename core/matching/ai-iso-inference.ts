/**
 * AI 기반 ISO 코드 추론
 * 
 * Gemini API를 활용하여 상품명, 설명, 이미지 등을 분석하여
 * ISO 9999 코드를 추론합니다.
 */

import { callGemini } from "@/lib/gemini";
import { logEvent } from "@/lib/logging";

interface ProductInfo {
  name: string;
  description?: string;
  imageBase64?: string;
  mimeType?: string;
}

interface IsoInferenceResult {
  isoCode: string;
  confidence: number;
  reasoning: string;
  alternativeCodes?: Array<{
    isoCode: string;
    confidence: number;
  }>;
}

/**
 * ISO 9999:2022 주요 분류 참조
 */
const ISO_CATEGORIES = `
ISO 9999:2022 주요 분류:
- 12 06: 보행 보조기기 (워커, 지팡이, 목발)
- 12 22: 수동 휠체어
- 12 23: 전동 휠체어 및 전동 이동 보조기기
- 12 31: 체위 변경 보조기기 (리프트, 전동 의자)
- 15 03: 목욕 및 샤워 보조기기
- 15 04: 착의 보조기기
- 15 05: 청소 보조기기
- 15 06: 요리 및 조리 보조기기
- 15 09: 식사 및 음주 보조기기
- 18 30: 수직 접근성 보조기기 (경사로, 승강기)
- 21 06: 청각 보조기기 (보청기)
- 22 03: 시각 보조기기 (확대경, 돋보기)
- 22 30: 의사소통 보조기기 (AAC)
`;

/**
 * AI를 사용하여 상품 정보에서 ISO 코드 추론
 */
export async function inferIsoCodeFromProduct(
  product: ProductInfo
): Promise<IsoInferenceResult | null> {
  try {
    const prompt = buildIsoInferencePrompt(product);
    
    // 이미지가 있으면 Vision API 사용, 없으면 텍스트만
    const { rawText, json } = await callGemini(
      prompt,
      product.imageBase64,
      product.mimeType
    );

    if (json) {
      const result = parseIsoInferenceResult(json);
      if (result) {
        logEvent({
          category: "matching",
          action: "ai_iso_inference",
          payload: {
            productName: product.name,
            inferredIso: result.isoCode,
            confidence: result.confidence,
          },
        });
        return result;
      }
    }

    // JSON 파싱 실패 시 텍스트에서 추출 시도
    const fallbackResult = extractIsoFromText(rawText || "");
    if (fallbackResult) {
      return fallbackResult;
    }

    return null;
  } catch (error) {
    console.error("[AI ISO Inference] Error:", error);
    logEvent({
      category: "matching",
      action: "ai_iso_inference_error",
      payload: { error: String(error), productName: product.name },
      level: "error",
    });
    return null;
  }
}

/**
 * ISO 추론을 위한 프롬프트 생성
 */
function buildIsoInferencePrompt(product: ProductInfo): string {
  const imageHint = product.imageBase64
    ? "\n이미지를 분석하여 보조기기의 종류를 파악하세요."
    : "";

  return `
너는 보조공학 전문가입니다. 상품 정보를 분석하여 ISO 9999:2022 코드를 추론하세요.

${ISO_CATEGORIES}

상품 정보:
- 이름: ${product.name}
${product.description ? `- 설명: ${product.description}` : ""}
${imageHint}

다음 JSON 형식으로 응답하세요:
{
  "isoCode": "12 22",  // ISO 9999 코드 (4자리, 공백 포함)
  "confidence": 0.85,  // 신뢰도 (0.0-1.0)
  "reasoning": "이 상품은 수동 휠체어로 보입니다. 휠체어의 특징인 바퀴와 의자 구조가 명확합니다.",
  "alternativeCodes": [  // 대안 코드 (선택적)
    {"isoCode": "12 23", "confidence": 0.15}
  ]
}

중요:
- ISO 코드는 반드시 "XX XX" 형식 (4자리, 공백 포함)
- confidence는 0.0-1.0 사이 값
- reasoning은 한국어로 작성
- 확실하지 않으면 confidence를 낮게 설정
- JSON만 반환하고 다른 설명은 포함하지 마세요
`;
}

/**
 * JSON 응답 파싱
 */
function parseIsoInferenceResult(json: unknown): IsoInferenceResult | null {
  try {
    if (typeof json !== "object" || json === null) {
      return null;
    }

    const data = json as any;

    // 필수 필드 검증
    if (!data.isoCode || typeof data.isoCode !== "string") {
      return null;
    }

    // ISO 코드 형식 검증 (XX XX 형식)
    const isoCodePattern = /^\d{2}\s\d{2}$/;
    if (!isoCodePattern.test(data.isoCode)) {
      return null;
    }

    const confidence = Math.max(0, Math.min(1, Number(data.confidence) || 0.5));
    const reasoning = data.reasoning || "AI 분석 결과";

    const result: IsoInferenceResult = {
      isoCode: data.isoCode,
      confidence,
      reasoning,
    };

    // 대안 코드 파싱
    if (Array.isArray(data.alternativeCodes)) {
      result.alternativeCodes = data.alternativeCodes
        .filter((alt: any) => alt.isoCode && isoCodePattern.test(alt.isoCode))
        .map((alt: any) => ({
          isoCode: alt.isoCode,
          confidence: Math.max(0, Math.min(1, Number(alt.confidence) || 0)),
        }))
        .slice(0, 3); // 최대 3개
    }

    return result;
  } catch (error) {
    console.error("[AI ISO Inference] Parse error:", error);
    return null;
  }
}

/**
 * 텍스트에서 ISO 코드 추출 (폴백)
 */
function extractIsoFromText(text: string): IsoInferenceResult | null {
  // ISO 코드 패턴 찾기 (XX XX 형식)
  const isoPattern = /(\d{2}\s\d{2})/g;
  const matches = text.match(isoPattern);

  if (matches && matches.length > 0) {
    return {
      isoCode: matches[0],
      confidence: 0.6, // 낮은 신뢰도
      reasoning: "텍스트에서 ISO 코드를 추출했습니다.",
    };
  }

  return null;
}

/**
 * 여러 상품에 대해 일괄 ISO 추론
 */
export async function inferIsoCodesBatch(
  products: ProductInfo[],
  options: {
    maxConcurrent?: number;
    minConfidence?: number;
  } = {}
): Promise<Map<string, IsoInferenceResult>> {
  const { maxConcurrent = 3, minConfidence = 0.5 } = options;
  const results = new Map<string, IsoInferenceResult>();

  // 배치 처리로 동시 요청 수 제한
  for (let i = 0; i < products.length; i += maxConcurrent) {
    const batch = products.slice(i, i + maxConcurrent);
    const batchPromises = batch.map(async (product) => {
      const result = await inferIsoCodeFromProduct(product);
      if (result && result.confidence >= minConfidence) {
        results.set(product.name, result);
      }
      return result;
    });

    await Promise.all(batchPromises);

    // Rate limit 방지
    if (i + maxConcurrent < products.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

