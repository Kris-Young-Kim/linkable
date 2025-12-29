#!/usr/bin/env tsx
/**
 * ISO 9999:2022 풀텍스트 문서를 파싱하여 iso_codes 테이블에 업데이트하는 스크립트
 * 
 * 사용법:
 *   pnpm tsx scripts/sync-iso-9999-fulltext.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

// 환경 변수 로드
const envLocalPath = resolve(process.cwd(), '.env.local');
const envPath = resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  config({ path: envPath });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('   SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY (필수)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface IsoCode {
  code: string;
  name: string;
  description: string;
  parent_code: string | null;
  level: number;
  display_order: number;
}

/**
 * 설명 텍스트를 추출하는 헬퍼 함수
 */
function extractDescription(lines: string[], startIndex: number, maxLines: number = 10): string {
  let description = '';
  let emptyLineCount = 0;
  
  for (let j = startIndex + 1; j < Math.min(startIndex + maxLines, lines.length); j++) {
    const nextLine = lines[j].trim();
    
    // 다음 섹션이 시작되면 중단
    if (nextLine.startsWith('###') || nextLine.startsWith('####') || nextLine.startsWith('**')) {
      break;
    }
    
    // 빈 줄이 2개 연속이면 중단
    if (!nextLine) {
      emptyLineCount++;
      if (emptyLineCount >= 2) {
        break;
      }
      continue;
    }
    
    emptyLineCount = 0;
    
    // 설명에 추가
    if (nextLine) {
      description += (description ? ' ' : '') + nextLine;
      
      // 문장이 끝나는 경우 중단 (한국어/영어 모두)
      if (nextLine.endsWith('.') || nextLine.endsWith('다.') || nextLine.endsWith('등이 있다.') || 
          nextLine.endsWith('다') || nextLine.endsWith('장치') || nextLine.endsWith('기구')) {
        // 다음 줄도 확인해서 더 긴 설명이 있는지 체크
        if (j + 1 < lines.length) {
          const nextNextLine = lines[j + 1].trim();
          if (nextNextLine && !nextNextLine.startsWith('###') && !nextNextLine.startsWith('####') && 
              !nextNextLine.startsWith('**') && !nextNextLine.match(/^\d{2}\s+\d{2}\s+참조/)) {
            // 더 긴 설명이 있으면 계속
            continue;
          }
        }
        break;
      }
    }
  }
  
  return description.trim();
}

/**
 * ISO 9999 문서를 파싱하여 코드 정보를 추출합니다.
 */
function parseIso9999Document(filePath: string): IsoCode[] {
  console.log(`📖 ISO 9999 문서 읽는 중: ${filePath}`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const codes: Map<string, IsoCode> = new Map();
  let currentLevel1: IsoCode | null = null;
  let currentLevel2: IsoCode | null = null;
  let displayOrder1 = 0;
  let displayOrder2 = 0;
  let displayOrder3 = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 대분류: ### 04 생리적, 심리적 기능을 측정, 자극 또는 훈련하기 위한 보조기구
    const level1Match = line.match(/^### (\d{2})\s+(.+)$/);
    if (level1Match) {
      const code = level1Match[1];
      const name = level1Match[2].trim();
      
      // 설명 찾기
      const description = extractDescription(lines, i, 15) || name;
      
      displayOrder1++;
      displayOrder2 = 0;
      displayOrder3 = 0;
      
      currentLevel1 = {
        code,
        name,
        description,
        parent_code: null,
        level: 1,
        display_order: displayOrder1
      };
      
      codes.set(code, currentLevel1);
      currentLevel2 = null;
      continue;
    }
    
    // 중분류: #### 04 03 호흡용 보조기구
    const level2Match = line.match(/^#### (\d{2})\s+(\d{2})\s+(.+)$/);
    if (level2Match) {
      const code = `${level2Match[1]} ${level2Match[2]}`;
      const name = level2Match[3].trim();
      
      // 설명 찾기
      const description = extractDescription(lines, i, 15) || name;
      
      displayOrder2++;
      displayOrder3 = 0;
      
      const parentCode = level2Match[1];
      
      currentLevel2 = {
        code,
        name,
        description,
        parent_code: parentCode,
        level: 2,
        display_order: displayOrder2
      };
      
      codes.set(code, currentLevel2);
      continue;
    }
    
    // 소분류: **04 03 03 흡입 공기 전처리 장치**
    const level3Match = line.match(/^\*\*(\d{2})\s+(\d{2})\s+(\d{2})\s+(.+?)\*\*$/);
    if (level3Match) {
      const code = `${level3Match[1]} ${level3Match[2]} ${level3Match[3]}`;
      const name = level3Match[4].trim();
      
      // 설명 찾기
      const description = extractDescription(lines, i, 8) || name;
      
      displayOrder3++;
      
      const parentCode = `${level3Match[1]} ${level3Match[2]}`;
      
      const level3Code: IsoCode = {
        code,
        name,
        description,
        parent_code: parentCode,
        level: 3,
        display_order: displayOrder3
      };
      
      codes.set(code, level3Code);
      continue;
    }
  }
  
  console.log(`✅ 파싱 완료: 총 ${codes.size}개의 코드 추출`);
  console.log(`   - 대분류: ${Array.from(codes.values()).filter(c => c.level === 1).length}개`);
  console.log(`   - 중분류: ${Array.from(codes.values()).filter(c => c.level === 2).length}개`);
  console.log(`   - 소분류: ${Array.from(codes.values()).filter(c => c.level === 3).length}개\n`);
  
  return Array.from(codes.values());
}

/**
 * ISO 코드를 Supabase에 업데이트합니다.
 */
async function syncIsoCodesToDatabase(codes: IsoCode[]) {
  console.log('🔄 Supabase에 데이터 업데이트 중...\n');
  
  try {
    // 1. 기존 데이터 확인
    const { data: existingCodes, error: existingError } = await supabase
      .from('iso_codes')
      .select('code');
    
    if (existingError) {
      throw existingError;
    }
    
    const existingCodeSet = new Set(existingCodes?.map(c => c.code) || []);
    console.log(`📋 기존 iso_codes 테이블 데이터: ${existingCodeSet.size}개\n`);
    
    // 2. 레벨별로 정렬하여 순서대로 삽입 (부모가 먼저 삽입되어야 함)
    const sortedCodes = codes.sort((a, b) => {
      // 레벨 순서: 1 -> 2 -> 3
      if (a.level !== b.level) {
        return a.level - b.level;
      }
      // 같은 레벨 내에서는 display_order 순서
      return a.display_order - b.display_order;
    });
    
    // 3. 대분류부터 삽입
    const level1Codes = sortedCodes.filter(c => c.level === 1);
    const level2Codes = sortedCodes.filter(c => c.level === 2);
    const level3Codes = sortedCodes.filter(c => c.level === 3);
    
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    // 대분류 삽입/업데이트
    console.log('📝 대분류 처리 중...');
    for (const code of level1Codes) {
      if (existingCodeSet.has(code.code)) {
        // 업데이트
        const { error: updateError } = await supabase
          .from('iso_codes')
          .update({
            name: code.name,
            description: code.description,
            level: code.level,
            display_order: code.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('code', code.code);
        
        if (updateError) {
          console.error(`   ⚠️  ${code.code} 업데이트 실패:`, updateError.message);
        } else {
          updatedCount++;
        }
      } else {
        // 삽입
        const { error: insertError } = await supabase
          .from('iso_codes')
          .insert({
            code: code.code,
            name: code.name,
            description: code.description,
            parent_code: null,
            level: code.level,
            is_active: true,
            display_order: code.display_order
          });
        
        if (insertError) {
          console.error(`   ⚠️  ${code.code} 삽입 실패:`, insertError.message);
        } else {
          insertedCount++;
        }
      }
    }
    
    // 중분류 삽입/업데이트
    console.log('📝 중분류 처리 중...');
    for (const code of level2Codes) {
      // parent_code가 존재하는지 확인
      if (code.parent_code && !existingCodeSet.has(code.parent_code)) {
        // 부모 코드가 아직 삽입되지 않았으면 스킵 (이미 삽입되었을 수도 있음)
        const { data: parentCheck } = await supabase
          .from('iso_codes')
          .select('code')
          .eq('code', code.parent_code)
          .single();
        
        if (!parentCheck) {
          console.warn(`   ⚠️  ${code.code}의 부모 코드 ${code.parent_code}가 없어 스킵합니다.`);
          skippedCount++;
          continue;
        }
      }
      
      if (existingCodeSet.has(code.code)) {
        // 업데이트
        const { error: updateError } = await supabase
          .from('iso_codes')
          .update({
            name: code.name,
            description: code.description,
            parent_code: code.parent_code,
            level: code.level,
            display_order: code.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('code', code.code);
        
        if (updateError) {
          console.error(`   ⚠️  ${code.code} 업데이트 실패:`, updateError.message);
        } else {
          updatedCount++;
        }
      } else {
        // 삽입
        const { error: insertError } = await supabase
          .from('iso_codes')
          .insert({
            code: code.code,
            name: code.name,
            description: code.description,
            parent_code: code.parent_code,
            level: code.level,
            is_active: true,
            display_order: code.display_order
          });
        
        if (insertError) {
          console.error(`   ⚠️  ${code.code} 삽입 실패:`, insertError.message);
        } else {
          insertedCount++;
          existingCodeSet.add(code.code); // 다음 반복을 위해 추가
        }
      }
    }
    
    // 소분류 삽입/업데이트
    console.log('📝 소분류 처리 중...');
    for (const code of level3Codes) {
      // parent_code가 존재하는지 확인
      if (code.parent_code) {
        const { data: parentCheck } = await supabase
          .from('iso_codes')
          .select('code')
          .eq('code', code.parent_code)
          .single();
        
        if (!parentCheck) {
          console.warn(`   ⚠️  ${code.code}의 부모 코드 ${code.parent_code}가 없어 스킵합니다.`);
          skippedCount++;
          continue;
        }
      }
      
      if (existingCodeSet.has(code.code)) {
        // 업데이트
        const { error: updateError } = await supabase
          .from('iso_codes')
          .update({
            name: code.name,
            description: code.description,
            parent_code: code.parent_code,
            level: code.level,
            display_order: code.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('code', code.code);
        
        if (updateError) {
          console.error(`   ⚠️  ${code.code} 업데이트 실패:`, updateError.message);
        } else {
          updatedCount++;
        }
      } else {
        // 삽입
        const { error: insertError } = await supabase
          .from('iso_codes')
          .insert({
            code: code.code,
            name: code.name,
            description: code.description,
            parent_code: code.parent_code,
            level: code.level,
            is_active: true,
            display_order: code.display_order
          });
        
        if (insertError) {
          console.error(`   ⚠️  ${code.code} 삽입 실패:`, insertError.message);
        } else {
          insertedCount++;
          existingCodeSet.add(code.code); // 다음 반복을 위해 추가
        }
      }
    }
    
    console.log('\n📊 업데이트 결과:');
    console.log(`   ✅ 삽입: ${insertedCount}개`);
    console.log(`   🔄 업데이트: ${updatedCount}개`);
    console.log(`   ⏭️  스킵: ${skippedCount}개\n`);
    
    // 최종 결과 확인
    const { count: finalCount, error: finalError } = await supabase
      .from('iso_codes')
      .select('*', { count: 'exact', head: true });
    
    if (finalError) {
      throw finalError;
    }
    
    console.log(`📊 최종 결과: iso_codes 테이블 총 ${finalCount}개\n`);
    
  } catch (error) {
    console.error('❌ 에러 발생:', error);
    throw error;
  }
}

/**
 * 메인 함수
 */
async function main() {
  console.log('🚀 ISO 9999:2022 풀텍스트 동기화 시작\n');
  
  const docPath = resolve(process.cwd(), 'docs/KS_P_ISO_9999_2022.md');
  
  if (!fs.existsSync(docPath)) {
    console.error(`❌ 문서 파일을 찾을 수 없습니다: ${docPath}`);
    process.exit(1);
  }
  
  try {
    // 1. 문서 파싱
    const codes = parseIso9999Document(docPath);
    
    if (codes.length === 0) {
      console.error('❌ 파싱된 코드가 없습니다.');
      process.exit(1);
    }
    
    // 2. 데이터베이스에 동기화
    await syncIsoCodesToDatabase(codes);
    
    console.log('🎉 작업 완료!');
    
  } catch (error) {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  }
}

main().catch(console.error);
