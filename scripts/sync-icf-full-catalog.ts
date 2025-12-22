/**
 * ICF 전체 카탈로그 동기화 스크립트
 * 
 * docs/icf-full-catalog.md 파일을 읽어서 데이터베이스의 icf_codes 테이블에
 * 전체 ICF 코드를 동기화합니다.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { getSupabaseServerClient } from "../lib/supabase/server";
import { logEvent } from "../lib/logging";

interface IcfCodeEntry {
  code: string;
  category: "b" | "d" | "e" | "s" | "p";
  name?: string;
  nameEn?: string;
  description?: string;
}

/**
 * ICF 카탈로그 마크다운 파일 파싱
 */
function parseIcfCatalog(content: string): IcfCodeEntry[] {
  const codes: IcfCodeEntry[] = [];
  const lines = content.split("\n");
  
  let currentCategory: "b" | "d" | "e" | "s" | "p" | null = null;
  const seenCodes = new Set<string>(); // 중복 방지
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 카테고리 섹션 감지
    if (line.startsWith("## B. 신체 기능") || line.includes("B. 신체 기능")) {
      currentCategory = "b";
      continue;
    } else if (line.startsWith("## S. 신체 구조") || line.includes("S. 신체 구조")) {
      currentCategory = "s";
      continue;
    } else if (line.startsWith("## D. 활동과 참여") || line.includes("D. 활동과 참여")) {
      currentCategory = "d";
      continue;
    } else if (line.startsWith("## E. 환경 요인") || line.includes("E. 환경 요인")) {
      currentCategory = "e";
      continue;
    } else if (line.startsWith("## P.") || line.includes("P. 참여")) {
      currentCategory = "p";
      continue;
    }
    
    // ICF 코드 라인 감지 (### B110: b110 ... 형식)
    // 예: ### B110: b110 Consciousness functions
    // 예: ### B1100: b1100 State of consciousness
    const codeMatch = line.match(/^###\s+([BDSESP]\d+[A-Z0-9]*):\s+([a-z]\d+[a-z0-9]*)\s*(.*)$/i);
    if (codeMatch && currentCategory) {
      const [, upperCode, lowerCode, description] = codeMatch;
      const normalizedCode = lowerCode.toLowerCase().trim();
      
      // 중복 방지
      if (seenCodes.has(normalizedCode)) {
        continue;
      }
      seenCodes.add(normalizedCode);
      
      // 설명 정리 (영문 이름 추출)
      const cleanDescription = description.trim();
      
      codes.push({
        code: normalizedCode,
        category: currentCategory,
        name: cleanDescription || undefined,
        nameEn: cleanDescription || undefined,
      });
    }
  }
  
  return codes;
}

/**
 * ICF 코드 동기화 실행
 */
async function syncIcfCatalog() {
  try {
    console.log("[ICF Catalog Sync] 시작...");
    
    // 마크다운 파일 읽기
    const catalogPath = join(process.cwd(), "docs", "icf-full-catalog.md");
    const content = readFileSync(catalogPath, "utf-8");
    
    // 파싱
    const codes = parseIcfCatalog(content);
    console.log(`[ICF Catalog Sync] 파싱된 코드 수: ${codes.length}`);
    
    if (codes.length === 0) {
      console.error("[ICF Catalog Sync] 파싱된 코드가 없습니다.");
      return;
    }
    
    // Supabase 클라이언트
    const supabase = getSupabaseServerClient();
    
    // 배치로 삽입/업데이트 (100개씩)
    const batchSize = 100;
    let processed = 0;
    let inserted = 0;
    let updated = 0;
    
    for (let i = 0; i < codes.length; i += batchSize) {
      const batch = codes.slice(i, i + batchSize);
      
      // upsert 실행
      const { data, error } = await supabase
        .from("icf_codes")
        .upsert(
          batch.map((code) => ({
            code: code.code,
            category: code.category,
            name: code.name || null,
            name_en: code.nameEn || null,
            description: code.description || null,
            is_in_core_set: false, // 기본값은 false, 자동 확장으로 추가됨
            is_active: true,
            updated_at: new Date().toISOString(),
          })),
          {
            onConflict: "code",
            ignoreDuplicates: false,
          }
        )
        .select();
      
      if (error) {
        console.error(`[ICF Catalog Sync] 배치 ${i / batchSize + 1} 오류:`, error);
        continue;
      }
      
      processed += batch.length;
      const newCount = data?.filter((d) => d.created_at === d.updated_at).length || 0;
      const updateCount = batch.length - newCount;
      
      inserted += newCount;
      updated += updateCount;
      
      console.log(
        `[ICF Catalog Sync] 진행: ${processed}/${codes.length} (신규: ${newCount}, 업데이트: ${updateCount})`
      );
    }
    
    console.log("[ICF Catalog Sync] 완료!");
    console.log(`[ICF Catalog Sync] 총 처리: ${processed}개`);
    console.log(`[ICF Catalog Sync] 신규 삽입: ${inserted}개`);
    console.log(`[ICF Catalog Sync] 업데이트: ${updated}개`);
    
    // 통계 로깅
    logEvent({
      category: "system",
      action: "icf_catalog_synced",
      payload: {
        total_codes: codes.length,
        inserted,
        updated,
      },
    });
  } catch (error) {
    console.error("[ICF Catalog Sync] 실패:", error);
    throw error;
  }
}

// 스크립트 실행
if (require.main === module) {
  syncIcfCatalog()
    .then(() => {
      console.log("[ICF Catalog Sync] 성공적으로 완료되었습니다.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("[ICF Catalog Sync] 오류:", error);
      process.exit(1);
    });
}

export { syncIcfCatalog, parseIcfCatalog };

