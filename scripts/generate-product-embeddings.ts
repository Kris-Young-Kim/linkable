/**
 * 제품 임베딩 사전 생성 스크립트
 *
 * 모든 제품에 대해 Gemini Embedding API를 사용하여 벡터 임베딩을 생성하고
 * products 테이블에 저장합니다.
 *
 * 사용법: pnpm tsx scripts/generate-product-embeddings.ts
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// 환경변수 로드
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GEMINI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

const GEMINI_EMBEDDING_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

// 설정
const BATCH_SIZE = 10; // 한 번에 처리할 제품 수
const DELAY_BETWEEN_REQUESTS_MS = 200; // API 요청 간 지연 (rate limit 방지)
const MAX_RETRIES = 3;

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
}

async function createEmbedding(text: string): Promise<number[] | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(
        `${GEMINI_EMBEDDING_API_URL}?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text }] },
            output_dimensionality: 768,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data.embedding.values;
    } catch (error) {
      console.error(`[Attempt ${attempt + 1}/${MAX_RETRIES}] Error:`, error);
      if (attempt < MAX_RETRIES - 1) {
        await delay(1000 * (attempt + 1)); // exponential backoff
      }
    }
  }
  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildProductText(product: Product): string {
  const parts = [product.name];
  if (product.description) {
    parts.push(product.description);
  }
  if (product.category) {
    parts.push(`카테고리: ${product.category}`);
  }
  return parts.join(". ");
}

async function main() {
  console.log("=== 제품 임베딩 생성 스크립트 시작 ===\n");

  // 환경변수 확인
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error(
      "Error: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.",
    );
    process.exit(1);
  }

  if (!GEMINI_API_KEY) {
    console.error("Error: GOOGLE_GENERATIVE_AI_API_KEY가 설정되지 않았습니다.");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 임베딩이 없는 제품 조회
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, description, category")
    .is("embedding", null)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("제품 조회 실패:", error);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log("✅ 모든 제품에 임베딩이 이미 생성되어 있습니다.");
    process.exit(0);
  }

  console.log(`📦 임베딩 생성 대상: ${products.length}개 제품\n`);

  let successCount = 0;
  let failCount = 0;

  // 배치 단위로 처리
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    console.log(
      `\n--- 배치 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)} ---`,
    );

    for (const product of batch) {
      const text = buildProductText(product);
      console.log(
        `[${successCount + failCount + 1}/${products.length}] ${product.name.substring(0, 40)}...`,
      );

      const embedding = await createEmbedding(text);

      if (embedding) {
        // 임베딩을 문자열로 변환 (pgvector 형식)
        const embeddingStr = `[${embedding.join(",")}]`;

        const { error: updateError } = await supabase
          .from("products")
          .update({
            embedding: embeddingStr,
            embedding_updated_at: new Date().toISOString(),
          })
          .eq("id", product.id);

        if (updateError) {
          console.error(`  ❌ 저장 실패: ${updateError.message}`);
          failCount++;
        } else {
          console.log(`  ✅ 완료`);
          successCount++;
        }
      } else {
        console.log(`  ❌ 임베딩 생성 실패`);
        failCount++;
      }

      // Rate limit 방지를 위한 지연
      await delay(DELAY_BETWEEN_REQUESTS_MS);
    }
  }

  console.log("\n=== 완료 ===");
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
}

main().catch(console.error);
