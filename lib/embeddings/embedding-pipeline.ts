/**
 * ICF-ISO 매핑 임베딩 생성 파이프라인
 * 
 * 기존 규칙 기반 매핑 데이터를 벡터 DB에 저장하기 위한 배치 처리 스크립트
 */

import { getIsoMatches } from "@/core/matching/iso-mapping";
import { findIcfCode } from "@/core/assessment/icf-codes";
import { saveIcfIsoEmbedding } from "./vector-store";
import { logEvent } from "@/lib/logging";

/**
 * 모든 ICF-ISO 매핑 조합에 대한 임베딩 생성 및 저장
 * 
 * @param icfCodes ICF 코드 배열
 * @returns 저장된 임베딩 수
 */
export async function generateEmbeddingsForIcfCodes(
  icfCodes: string[]
): Promise<number> {
  let savedCount = 0;

  try {
    // 1. 규칙 기반 매칭으로 ISO 코드 찾기
    const isoMatches = getIsoMatches(icfCodes);

    // 2. 각 매칭에 대해 임베딩 생성 및 저장
    for (const match of isoMatches) {
      try {
        // ICF 코드 설명 텍스트 생성
        const icfDescriptions = icfCodes
          .map((code) => {
            const meta = findIcfCode(code);
            return meta ? `${code}: ${meta.description}` : code;
          })
          .join("; ");

        // 임베딩 저장
        await saveIcfIsoEmbedding(
          icfCodes,
          icfDescriptions,
          match.isoCode,
          match.label,
          match.description,
          match.score
        );

        savedCount++;

        logEvent({
          category: "matching",
          action: "embedding_generated",
          payload: {
            icfCodes,
            isoCode: match.isoCode,
          },
        });
      } catch (error) {
        console.error(
          `[embedding-pipeline] Failed to save embedding for ${match.isoCode}:`,
          error
        );
        logEvent({
          category: "matching",
          action: "embedding_generation_error",
          payload: {
            error: String(error),
            icfCodes,
            isoCode: match.isoCode,
          },
          level: "error",
        });
      }
    }
  } catch (error) {
    console.error("[embedding-pipeline] Failed to generate embeddings:", error);
    logEvent({
      category: "matching",
      action: "embedding_pipeline_error",
      payload: { error: String(error), icfCodes },
      level: "error",
    });
  }

  return savedCount;
}

/**
 * 모든 규칙 기반 매핑에 대한 임베딩 생성 (초기 데이터 구축용)
 * 
 * @param icfCodeSets ICF 코드 조합 배열
 * @returns 저장된 임베딩 수
 */
export async function generateAllEmbeddings(
  icfCodeSets: string[][]
): Promise<number> {
  let totalSaved = 0;

  for (const icfCodes of icfCodeSets) {
    const saved = await generateEmbeddingsForIcfCodes(icfCodes);
    totalSaved += saved;

    // Rate limit 방지를 위한 지연
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  logEvent({
    category: "matching",
    action: "all_embeddings_generated",
    payload: {
      totalIcfCodeSets: icfCodeSets.length,
      totalSaved,
    },
  });

  return totalSaved;
}

