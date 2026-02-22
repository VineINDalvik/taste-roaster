import { NextRequest, NextResponse } from "next/server";
import {
  generatePremiumReport,
  generateTimeline,
  generateRecommendations,
  generateGraph,
} from "@/lib/analyzer";
import type { TasteReport } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const report = body as TasteReport;

    if (!report?.input || !report?.label) {
      return NextResponse.json(
        { error: "报告数据不完整，请重新生成基础报告" },
        { status: 400 }
      );
    }

    const [premium, timeline, recommendations, graph] = await Promise.all([
      generatePremiumReport(report),
      generateTimeline(report),
      generateRecommendations(report),
      generateGraph(report),
    ]);

    return NextResponse.json({
      bookAnalysis: premium.bookAnalysis,
      movieAnalysis: premium.movieAnalysis,
      musicAnalysis: premium.musicAnalysis,
      timelineMonths: timeline.months,
      timelineText: `${timeline.trend}\n\n${timeline.prediction}`,
      crossDomain: premium.crossDomain,
      personality: premium.personality,
      blindSpots: premium.blindSpots,
      recommendations,
      graph,
    });
  } catch (error) {
    console.error("Premium generation error:", error);
    const message =
      error instanceof Error ? error.message : "深度分析失败，请重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
