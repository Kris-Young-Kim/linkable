/**
 * ICF 카탈로그에 한국어 번역 추가 스크립트
 * 
 * CSV 파일에서 한국어 번역을 읽어서 icf-full-catalog.md에 추가합니다.
 */

import * as fs from "fs";
import * as path from "path";

interface IcfCsvRow {
  Component: string;
  Component_KO: string;
  Chapter_Code: string;
  Chapter_Name_EN: string;
  Chapter_Name_KO: string;
  Item_Number: string;
  Total_in_Chapter: string;
  Full_Code: string;
  English_Term: string;
  Korean_Term: string;
  Definition_EN: string;
  Definition_KO: string;
  Status: string;
  Translator: string;
  Reviewer: string;
  Date_Started: string;
  Date_Completed: string;
  Priority: string;
  Notes: string;
}

interface IcfCodeInfo {
  code: string;
  englishTerm: string;
  koreanTerm: string;
  definitionEN: string;
  definitionKO: string;
  chapterNameKO: string;
}

function parseCsv(csvPath: string): Map<string, IcfCodeInfo> {
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n");
  const headers = lines[0].split(",");
  
  const codeMap = new Map<string, IcfCodeInfo>();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // CSV 파싱 (쉼표로 구분, 따옴표 처리)
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current);
    
    if (values.length < headers.length) continue;
    
    const row: any = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() || "";
    });
    
    const fullCode = (row.Full_Code || "").toLowerCase();
    if (!fullCode) continue;
    
    // 한국어 번역이 있거나 챕터 이름이 있는 경우만 저장
    const koreanTerm = row.Korean_Term || "";
    const definitionKO = row.Definition_KO || "";
    const chapterNameKO = row.Chapter_Name_KO || "";
    
    if (koreanTerm || definitionKO || chapterNameKO) {
      codeMap.set(fullCode, {
        code: fullCode,
        englishTerm: row.English_Term || "",
        koreanTerm: koreanTerm,
        definitionEN: row.Definition_EN || "",
        definitionKO: definitionKO,
        chapterNameKO: chapterNameKO,
      });
    }
  }
  
  return codeMap;
}

function enhanceMarkdown(mdPath: string, codeMap: Map<string, IcfCodeInfo>): void {
  let content = fs.readFileSync(mdPath, "utf-8");
  const lines = content.split("\n");
  const enhancedLines: string[] = [];
  let addedTranslations = 0;
  let skippedChapters = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    enhancedLines.push(line);
    
    // 코드 섹션 패턴 매칭: ### B110: b110 Consciousness functions
    const codeMatch = line.match(/^### ([BbSsDdEe]\d+):\s*([a-z]\d+)\s+(.+)$/i);
    if (codeMatch) {
      const [, displayCode, fullCode, englishTerm] = codeMatch;
      const codeInfo = codeMap.get(fullCode.toLowerCase());
      
      if (codeInfo) {
        // 한국어 정보 추가 (이미 추가된 경우 스킵)
        const nextLine = i + 1 < lines.length ? lines[i + 1] : "";
        const hasKorean = nextLine.includes("**한국어**") || nextLine.includes("**정의**");
        
        if (!hasKorean) {
          const koreanInfo: string[] = [];
          
          if (codeInfo.koreanTerm && codeInfo.koreanTerm.trim()) {
            koreanInfo.push(`**한국어**: ${codeInfo.koreanTerm}`);
          }
          
          if (codeInfo.definitionKO && codeInfo.definitionKO.trim()) {
            koreanInfo.push(`**정의**: ${codeInfo.definitionKO}`);
          }
          
          if (koreanInfo.length > 0) {
            enhancedLines.push("");
            enhancedLines.push(koreanInfo.join("  \n"));
            addedTranslations++;
          }
        }
      }
    }
    
    // 챕터 섹션 패턴 매칭: ### B1: b1 CHAPTER 1 MENTAL FUNCTIONS
    const chapterMatch = line.match(/^### ([BbSsDdEe]\d+):\s*([a-z]\d+)\s+CHAPTER\s+\d+\s+(.+)$/i);
    if (chapterMatch) {
      // 이미 한국어 챕터명이 있는지 확인 (다음 3줄까지 확인)
      let hasKoreanChapter = false;
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        if (lines[j].includes("**한국어 챕터명**")) {
          hasKoreanChapter = true;
          break;
        }
        if (lines[j].startsWith("###")) break; // 다음 섹션 시작
      }
      
      if (!hasKoreanChapter) {
        const [, displayCode, chapterCode, chapterNameEN] = chapterMatch;
        // 해당 챕터의 첫 번째 코드를 찾아서 챕터 한국어 이름 가져오기
        for (const [code, info] of codeMap.entries()) {
          if (code.startsWith(chapterCode.toLowerCase())) {
            if (info.chapterNameKO && info.chapterNameKO.trim()) {
              enhancedLines.push("");
              enhancedLines.push(`**한국어 챕터명**: ${info.chapterNameKO}`);
            }
            break;
          }
        }
      } else {
        skippedChapters++;
      }
    }
  }
  
  fs.writeFileSync(mdPath, enhancedLines.join("\n"), "utf-8");
  console.log(`✅ Enhanced ${mdPath}`);
  console.log(`   Total codes in map: ${codeMap.size}`);
  console.log(`   Added translations: ${addedTranslations}`);
  console.log(`   Skipped duplicate chapters: ${skippedChapters}`);
}

// 메인 실행
const csvPath = path.join(process.cwd(), "docs", "ICF_Korean_Translation_Complete_Database.csv");
const mdPath = path.join(process.cwd(), "docs", "icf-full-catalog.md");

if (!fs.existsSync(csvPath)) {
  console.error(`❌ CSV file not found: ${csvPath}`);
  process.exit(1);
}

if (!fs.existsSync(mdPath)) {
  console.error(`❌ Markdown file not found: ${mdPath}`);
  process.exit(1);
}

console.log("📖 Parsing CSV file...");
const codeMap = parseCsv(csvPath);
console.log(`   Found ${codeMap.size} codes with Korean translations`);

// 번역이 있는 코드 수 확인
let codesWithTranslation = 0;
let codesWithTerm = 0;
let codesWithDefinition = 0;
for (const [code, info] of codeMap.entries()) {
  if (info.koreanTerm && info.koreanTerm.trim()) {
    codesWithTerm++;
  }
  if (info.definitionKO && info.definitionKO.trim()) {
    codesWithDefinition++;
  }
  if ((info.koreanTerm && info.koreanTerm.trim()) || (info.definitionKO && info.definitionKO.trim())) {
    codesWithTranslation++;
  }
}
console.log(`   Codes with Korean term: ${codesWithTerm}`);
console.log(`   Codes with Korean definition: ${codesWithDefinition}`);
console.log(`   Codes with any translation: ${codesWithTranslation}`);

console.log("📝 Enhancing Markdown file...");
enhanceMarkdown(mdPath, codeMap);

console.log("✅ Done!");

