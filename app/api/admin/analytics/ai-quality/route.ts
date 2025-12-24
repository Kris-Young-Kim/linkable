import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { readFileSync } from "fs";
import { join } from "path";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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

    const supabase = getSupabaseServerClient();

    // 데이터베이스에서 최신 측정 결과 조회
    const { data: dbResults, error: dbError } = await supabase
      .from('v_latest_ai_quality_measurements')
      .select('*');

    let icfExtractionResult = null;
    let isoMatchingResult = null;

    if (!dbError && dbResults) {
      // ICF 추출 정확도 결과
      const icfData = dbResults.find(r => r.measurement_type === 'icf_extraction');
      if (icfData) {
        icfExtractionResult = {
          timestamp: icfData.created_at,
          overallAccuracy: {
            precision: Number(icfData.overall_precision),
            recall: Number(icfData.overall_recall),
            f1: Number(icfData.overall_f1),
          },
          categoryBreakdown: icfData.category_breakdown || {},
          totalTests: icfData.total_tests,
          passedTests: icfData.passed_tests,
          failedTests: icfData.failed_tests,
          targetAchieved: icfData.target_achieved,
        };
      }

      // ISO 매칭 정확도 결과
      const isoData = dbResults.find(r => r.measurement_type === 'iso_matching');
      if (isoData) {
        isoMatchingResult = {
          timestamp: isoData.created_at,
          overallAccuracy: {
            precision: Number(isoData.overall_precision),
            recall: Number(isoData.overall_recall),
            f1: Number(isoData.overall_f1),
            top1Accuracy: isoData.top1_accuracy ? Number(isoData.top1_accuracy) : null,
            top3Accuracy: isoData.top3_accuracy ? Number(isoData.top3_accuracy) : null,
            top5Accuracy: isoData.top5_accuracy ? Number(isoData.top5_accuracy) : null,
          },
          categoryBreakdown: isoData.category_breakdown || {},
          matchingMethodComparison: isoData.matching_method_comparison || {},
          totalTests: isoData.total_tests,
          passedTests: isoData.passed_tests,
          failedTests: isoData.failed_tests,
          targetAchieved: isoData.target_achieved,
        };
      }
    }

    // DB에 데이터가 없으면 파일 시스템에서 읽기 (하위 호환성)
    if (!icfExtractionResult) {
      try {
        const resultsDir = join(process.cwd(), "scripts/tests/results");
        const icfPath = join(resultsDir, "icf-extraction-accuracy-latest.json");
        const icfData = readFileSync(icfPath, "utf-8");
        const parsed = JSON.parse(icfData);
        icfExtractionResult = {
          timestamp: parsed.timestamp,
          overallAccuracy: parsed.overallAccuracy,
          categoryBreakdown: parsed.categoryBreakdown,
          totalTests: parsed.totalTests,
          passedTests: parsed.passedTests,
          failedTests: parsed.failedTests,
        };
      } catch (error) {
        console.warn("ICF 추출 정확도 결과를 찾을 수 없습니다:", error);
      }
    }

    if (!isoMatchingResult) {
      try {
        const resultsDir = join(process.cwd(), "scripts/tests/results");
        const isoPath = join(resultsDir, "iso-matching-accuracy-latest.json");
        const isoData = readFileSync(isoPath, "utf-8");
        const parsed = JSON.parse(isoData);
        isoMatchingResult = {
          timestamp: parsed.timestamp,
          overallAccuracy: parsed.overallAccuracy,
          categoryBreakdown: parsed.categoryBreakdown,
          matchingMethodComparison: parsed.matchingMethodComparison,
          totalTests: parsed.totalTests,
          passedTests: parsed.passedTests,
          failedTests: parsed.failedTests,
        };
      } catch (error) {
        console.warn("ISO 매칭 정확도 결과를 찾을 수 없습니다:", error);
      }
    }

    // 점수 계산
    let calculatedScore = null;
    if (icfExtractionResult || isoMatchingResult) {
      const { data: scoreData } = await supabase.rpc('update_ai_quality_score');
      if (scoreData && scoreData.length > 0) {
        const icfScore = scoreData.find((s: any) => s.measurement_type === 'icf_extraction');
        if (icfScore) {
          calculatedScore = Number(icfScore.calculated_score);
        }
      }
    }

    return NextResponse.json({
      icfExtraction: icfExtractionResult,
      isoMatching: isoMatchingResult,
      calculatedScore, // 계산된 AI 품질 점수 (5점 만점)
    });
  } catch (error) {
    console.error("AI 품질 측정 결과 조회 오류:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

