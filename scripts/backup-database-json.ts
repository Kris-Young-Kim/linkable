#!/usr/bin/env tsx
/**
 * 데이터베이스 JSON 백업 스크립트
 * 
 * 사용법:
 *   tsx scripts/backup-database-json.ts
 * 
 * 이 스크립트는 Supabase API를 사용하여 모든 테이블 데이터를 JSON 파일로 백업합니다.
 * CLI 없이 동작합니다.
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

// 환경 변수 로드 (.env.local 우선, 없으면 .env)
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

// 환경 변수 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ 환경 변수가 설정되지 않았습니다.");
  console.error("   NEXT_PUBLIC_SUPABASE_URL와 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// 백업할 테이블 목록 (중요한 테이블 우선)
const TABLES_TO_BACKUP = [
  // 핵심 테이블
  "users",
  "consultations",
  "chat_messages",
  "analysis_results",
  "recommendations",
  "ippa_evaluations",
  "products",
  
  // 운영 테이블
  "conversion_events",
  "point_transactions",
  "user_coupons",
  "coupons",
  "consultation_feedback",
  "notifications",
  
  // ICF 관련
  "icf_codes",
  "consultation_icf_codes",
  "icf_code_usage_logs",
  "icf_code_statistics",
  "icf_code_expansions",
  "icf_auto_expand_config",
  
  // 정규화 테이블
  "iso_codes",
  "manufacturers",
  "categories",
  
  // 매칭 관련
  "icf_iso_embeddings",
  "matching_weight_configs",
  "realtime_learning_configs",
  
  // 기타
  "cta_ab_test_configs",
  "cta_variants",
];

// 백업 디렉터리 설정
const BACKUP_DIR = resolve(process.cwd(), "backups");
const DATE = new Date().toISOString().split("T")[0].replace(/-/g, "");
const BACKUP_FILE = resolve(BACKUP_DIR, `backup-${DATE}.json`);

// 테이블별 정렬 컬럼 매핑 (created_at이 없는 테이블 처리)
const TABLE_ORDER_COLUMNS: Record<string, string> = {
  ippa_evaluations: "evaluated_at",
  icf_code_statistics: "updated_at",
  icf_code_expansions: "expanded_at",
  icf_auto_expand_config: "updated_at",
};

async function backupTable(tableName: string): Promise<{ table: string; count: number; data: any[] }> {
  console.log(`  📦 ${tableName} 백업 중...`);
  
  try {
    // 전체 데이터 가져오기 (페이지네이션 처리)
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    // 정렬 컬럼 결정 (기본값: created_at, 없으면 테이블별 매핑 사용)
    const orderColumn = TABLE_ORDER_COLUMNS[tableName] || "created_at";

    while (hasMore) {
      let query = supabase
        .from(tableName)
        .select("*")
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // 정렬 컬럼이 있으면 정렬 적용 (없으면 정렬 없이)
      try {
        query = query.order(orderColumn, { ascending: false });
      } catch (e) {
        // 정렬 실패 시 정렬 없이 진행
        console.log(`    ⚠️  ${tableName}: ${orderColumn} 컬럼으로 정렬 실패, 정렬 없이 진행`);
      }

      const { data, error } = await query;

      if (error) {
        // 테이블이 존재하지 않는 경우
        if (error.message.includes("Could not find the table") || 
            error.message.includes("does not exist")) {
          console.log(`    ⚠️  ${tableName}: 테이블이 존재하지 않음 (건너뜀)`);
          return { table: tableName, count: 0, data: [] };
        }
        // 컬럼이 없는 경우
        if (error.message.includes("does not exist") || 
            error.message.includes("column")) {
          // 정렬 없이 다시 시도
          const { data: dataWithoutOrder, error: errorWithoutOrder } = await supabase
            .from(tableName)
            .select("*")
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (errorWithoutOrder) {
            console.error(`    ❌ ${tableName} 백업 실패: ${errorWithoutOrder.message}`);
            return { table: tableName, count: 0, data: [] };
          }

          if (dataWithoutOrder && dataWithoutOrder.length > 0) {
            allData = allData.concat(dataWithoutOrder);
            hasMore = dataWithoutOrder.length === pageSize;
            page++;
          } else {
            hasMore = false;
          }
        } else {
          console.error(`    ❌ ${tableName} 백업 실패: ${error.message}`);
          return { table: tableName, count: 0, data: [] };
        }
      } else {
        if (data && data.length > 0) {
          allData = allData.concat(data);
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }
    }

    console.log(`    ✅ ${tableName}: ${allData.length}개 레코드`);
    return { table: tableName, count: allData.length, data: allData };
  } catch (error: any) {
    // 테이블이 존재하지 않는 경우 무시
    if (error?.message?.includes("Could not find the table") || 
        error?.message?.includes("does not exist")) {
      console.log(`    ⚠️  ${tableName}: 테이블이 존재하지 않음 (건너뜀)`);
      return { table: tableName, count: 0, data: [] };
    }
    console.error(`    ❌ ${tableName} 백업 오류:`, error?.message || error);
    return { table: tableName, count: 0, data: [] };
  }
}

async function main() {
  console.log("🔄 데이터베이스 백업 시작...");
  console.log(`📁 백업 위치: ${BACKUP_DIR}`);
  console.log(`📄 백업 파일: backup-${DATE}.json\n`);

  // 백업 디렉터리 생성
  try {
    mkdirSync(BACKUP_DIR, { recursive: true });
  } catch (error) {
    // 이미 존재하면 무시
  }

  const backup: {
    metadata: {
      timestamp: string;
      date: string;
      version: string;
    };
    tables: Record<string, any[]>;
    summary: {
      totalTables: number;
      totalRecords: number;
      tableCounts: Record<string, number>;
    };
  } = {
    metadata: {
      timestamp: new Date().toISOString(),
      date: DATE,
      version: "1.0",
    },
    tables: {},
    summary: {
      totalTables: 0,
      totalRecords: 0,
      tableCounts: {},
    },
  };

  // 각 테이블 백업
  for (const tableName of TABLES_TO_BACKUP) {
    const result = await backupTable(tableName);
    backup.tables[tableName] = result.data;
    backup.summary.tableCounts[tableName] = result.count;
    backup.summary.totalRecords += result.count;
  }

  backup.summary.totalTables = Object.keys(backup.tables).length;

  // JSON 파일로 저장
  console.log(`\n💾 백업 파일 저장 중...`);
  writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2), "utf-8");

  // 메타데이터 파일도 별도 저장
  const metadataFile = resolve(BACKUP_DIR, `backup-${DATE}.metadata.json`);
  writeFileSync(
    metadataFile,
    JSON.stringify(
      {
        ...backup.metadata,
        summary: backup.summary,
      },
      null,
      2
    ),
    "utf-8"
  );

  // 요약 출력
  console.log("\n" + "=".repeat(50));
  console.log("✅ 백업 완료!");
  console.log("=".repeat(50));
  console.log(`📊 총 테이블: ${backup.summary.totalTables}개`);
  console.log(`📊 총 레코드: ${backup.summary.totalRecords.toLocaleString()}개`);
  console.log(`📁 백업 파일: ${BACKUP_FILE}`);
  console.log(`📄 메타데이터: ${metadataFile}`);
  console.log("\n주요 테이블별 레코드 수:");
  Object.entries(backup.summary.tableCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .forEach(([table, count]) => {
      console.log(`  - ${table}: ${count.toLocaleString()}개`);
    });
  console.log("=".repeat(50));
}

main().catch((error) => {
  console.error("❌ 백업 실패:", error);
  process.exit(1);
});

