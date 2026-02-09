/**
 * RAG 지식 문서 수집·청킹·임베딩 파이프라인
 *
 * docs/ 내 ICF, ISO, 가이드라인 문서를 청크로 분할하고
 * 벡터 임베딩을 생성하여 icf_iso_rag_documents 테이블에 저장합니다.
 *
 * 사용법: pnpm tsx scripts/rag/ingest-knowledge-docs.ts
 *         pnpm ingest:rag (package.json에 스크립트 추가 시)
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { createEmbedding } from "@/lib/embeddings/gemini-embedding";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const CHUNK_MIN_CHARS = 400;
const CHUNK_MAX_CHARS = 1200; // 800→1200: 청크 수 감소로 처리 속도 향상
const CHUNK_OVERLAP = 80;
const DELAY_MS = 100; // Rate limit 방지 (150→100)

const DOCS_DIR = path.resolve(process.cwd(), "docs");

/** RAG 문서 소스 정의 (Markdown/TXT 우선, PDF는 별도 처리) */
const RAG_SOURCES: Array<{
  file: string;
  docType: "icf" | "iso" | "definition" | "classification";
}> = [
  { file: "icf-full-catalog.md", docType: "icf" },
  { file: "KS_P_ISO_9999_2022.md", docType: "iso" },
  { file: "보조기기 품목 분류체계.txt", docType: "classification" },
  { file: "ICF_ISO_definition.md", docType: "definition" },
];

interface RagChunk {
  content: string;
  metadata: {
    source: string;
    doc_type: string;
    icf_codes: string[];
    iso_codes: string[];
  };
}

/** ICF 코드 패턴 (b110, d450, e120 등) */
const ICF_PATTERN = /\b([bde]\d{3}(?:\.\d+)?)\b/gi;

/** ISO 코드 패턴 (12 22, 15 09, 04 03 03 등) */
const ISO_PATTERN = /\b(\d{2}\s?\d{2}(?:\s?\d{2})?)\b/g;

function extractIcfCodes(text: string): string[] {
  const matches = text.match(ICF_PATTERN) || [];
  return [...new Set(matches.map((m) => m.toLowerCase().replace(/\s/g, "")))];
}

function extractIsoCodes(text: string): string[] {
  const matches = text.match(ISO_PATTERN) || [];
  return [...new Set(matches.map((m) => m.replace(/\s/g, " ").trim()))];
}

/**
 * 마크다운/텍스트를 섹션별 또는 크기별로 청킹
 */
function chunkDocument(
  content: string,
  source: string,
  docType: string,
): RagChunk[] {
  const chunks: RagChunk[] = [];

  // 헤더(###, ####) 기준으로 우선 분할
  const sections = content.split(/(?=^#{2,4}\s)/m).filter((s) => s.trim());

  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed.length < 50) continue;

    if (trimmed.length <= CHUNK_MAX_CHARS) {
      chunks.push({
        content: trimmed,
        metadata: {
          source,
          doc_type: docType,
          icf_codes: extractIcfCodes(trimmed),
          iso_codes: extractIsoCodes(trimmed),
        },
      });
      continue;
    }

    // 긴 섹션은 고정 크기로 재분할 (오버랩 포함)
    let pos = 0;
    while (pos < trimmed.length) {
      const end = Math.min(pos + CHUNK_MAX_CHARS, trimmed.length);
      let sliceEnd = end;

      // 문장/단락 경계에서 끊기
      if (end < trimmed.length) {
        const lastNewline = trimmed.lastIndexOf("\n", end);
        const lastPeriod = trimmed.lastIndexOf(".", end);
        const boundary = Math.max(lastNewline, lastPeriod);
        if (boundary > pos + CHUNK_MIN_CHARS) {
          sliceEnd = boundary + 1;
        }
      }

      const chunkText = trimmed.slice(pos, sliceEnd).trim();
      if (chunkText.length >= CHUNK_MIN_CHARS) {
        chunks.push({
          content: chunkText,
          metadata: {
            source,
            doc_type: docType,
            icf_codes: extractIcfCodes(chunkText),
            iso_codes: extractIsoCodes(chunkText),
          },
        });
      }

      pos = sliceEnd - CHUNK_OVERLAP;
      if (pos <= 0 || pos >= trimmed.length) break;
    }
  }

  return chunks;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log("[ingest-rag] RAG 지식 문서 수집·청킹·임베딩 시작\n");

  let totalChunks = 0;
  let totalInserted = 0;

  for (const { file, docType } of RAG_SOURCES) {
    const filePath = path.join(DOCS_DIR, file);

    if (!fs.existsSync(filePath)) {
      console.warn(`[ingest-rag] 파일 없음, 건너뜀: ${file}`);
      continue;
    }

    console.log(`[ingest-rag] 처리 중: ${file} (${docType})`);

    const raw = fs.readFileSync(filePath, "utf-8");
    const chunks = chunkDocument(raw, file, docType);

    const estMinutes = Math.ceil((chunks.length * (2 + DELAY_MS / 1000)) / 60);
    console.log(
      `  → ${chunks.length}개 청크 생성 (예상 소요: 약 ${estMinutes}분)`,
    );

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        const embedding = await createEmbedding(chunk.content, true);

        if (!embedding || embedding.length === 0) {
          console.warn(`  [${i + 1}/${chunks.length}] 임베딩 실패, 건너뜀`);
          continue;
        }

        const { error } = await supabase.from("icf_iso_rag_documents").insert({
          content: chunk.content,
          embedding,
          metadata: chunk.metadata,
        });

        if (error) {
          console.error(
            `  [${i + 1}/${chunks.length}] DB 삽입 실패:`,
            error.message,
          );
          continue;
        }

        totalInserted++;
      } catch (err) {
        console.error(
          `  [${i + 1}/${chunks.length}] 오류:`,
          err instanceof Error ? err.message : err,
        );
      }

      totalChunks++;

      // 매 청크마다 진행 표시 (대용량 파일에서 멈춘 것처럼 보이는 것 방지)
      if ((i + 1) % 10 === 0 || i === 0 || i === chunks.length - 1) {
        console.log(`  → ${i + 1}/${chunks.length} 처리 완료`);
      }

      await delay(DELAY_MS);
    }

    console.log(`  완료: ${file}\n`);
  }

  console.log(
    `[ingest-rag] 완료. 총 ${totalChunks}개 청크 처리, ${totalInserted}개 DB 저장`,
  );
}

main().catch((err) => {
  console.error("[ingest-rag] Fatal error:", err);
  process.exit(1);
});
