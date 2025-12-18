/**
 * ICF 카탈로그에서 중복된 한국어 챕터명 제거 스크립트
 */

import * as fs from "fs";
import * as path from "path";

const mdPath = path.join(process.cwd(), "docs", "icf-full-catalog.md");

console.log("📝 Removing duplicate chapter names...");

let content = fs.readFileSync(mdPath, "utf-8");
const lines = content.split("\n");
const cleanedLines: string[] = [];
let lastChapterName = "";
let removedCount = 0;
let lastLineWasEmpty = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const isEmpty = line.trim() === "";
  
  // 한국어 챕터명 라인인지 확인
  if (line.includes("**한국어 챕터명**")) {
    const chapterName = line.replace("**한국어 챕터명**:", "").trim();
    
    // 이전 라인과 동일하면 스킵
    if (chapterName === lastChapterName) {
      removedCount++;
      continue;
    }
    
    lastChapterName = chapterName;
    cleanedLines.push(line);
    lastLineWasEmpty = false;
  } else {
    // 다른 라인이면 lastChapterName 초기화
    if (line.startsWith("###")) {
      lastChapterName = "";
    }
    
    // 연속된 빈 줄 제거
    if (isEmpty && lastLineWasEmpty) {
      continue;
    }
    
    cleanedLines.push(line);
    lastLineWasEmpty = isEmpty;
  }
}

fs.writeFileSync(mdPath, cleanedLines.join("\n"), "utf-8");
console.log(`✅ Removed ${removedCount} duplicate chapter names`);
console.log(`✅ Done!`);

