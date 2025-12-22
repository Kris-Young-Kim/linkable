import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * AI 매칭 품질 측정 결과 조회 API
 * GET /api/admin/analytics/ai-quality
 */
export async function GET() {
  try {
    // 관리자 권한 확인
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: 실제로는 데이터베이스에서 사용자 role 확인
    // 여기서는 간단히 파일 시스템에서 결과 읽기

    const resultsDir = join(process.cwd(), "scripts/tests/results");

    // ICF 추출 정확도 결과
    let icfExtractionResult = null;
    try {
      const icfPath = join(resultsDir, "icf-extraction-accuracy-latest.json");
      const icfData = readFileSync(icfPath, "utf-8");
      icfExtractionResult = JSON.parse(icfData);
    } catch (error) {
      console.warn("ICF 추출 정확도 결과 파일을 찾을 수 없습니다:", error);
    }

    // ISO 매칭 정확도 결과
    let isoMatchingResult = null;
    try {
      const isoPath = join(resultsDir, "iso-matching-accuracy-latest.json");
      const isoData = readFileSync(isoPath, "utf-8");
      isoMatchingResult = JSON.parse(isoData);
    } catch (error) {
      console.warn("ISO 매칭 정확도 결과 파일을 찾을 수 없습니다:", error);
    }

    return NextResponse.json({
      icfExtraction: icfExtractionResult
        ? {
            timestamp: icfExtractionResult.timestamp,
            overallAccuracy: icfExtractionResult.overallAccuracy,
            categoryBreakdown: icfExtractionResult.categoryBreakdown,
            totalTests: icfExtractionResult.totalTests,
            passedTests: icfExtractionResult.passedTests,
            failedTests: icfExtractionResult.failedTests,
          }
        : null,
      isoMatching: isoMatchingResult
        ? {
            timestamp: isoMatchingResult.timestamp,
            overallAccuracy: isoMatchingResult.overallAccuracy,
            categoryBreakdown: isoMatchingResult.categoryBreakdown,
            matchingMethodComparison: isoMatchingResult.matchingMethodComparison,
            totalTests: isoMatchingResult.totalTests,
            passedTests: isoMatchingResult.passedTests,
            failedTests: isoMatchingResult.failedTests,
          }
        : null,
    });
  } catch (error) {
    console.error("AI 품질 측정 결과 조회 오류:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

