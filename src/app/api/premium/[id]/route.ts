import { NextRequest, NextResponse } from "next/server";
import { scrapeDoubanFull } from "@/lib/douban-scraper";
import {
  generatePremiumReport,
  generateTimeline,
  generateRecommendations,
  generateGraph,
} from "@/lib/analyzer";
import type { TasteReport, TasteInput } from "@/lib/types";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const basicReport = body as Partial<TasteReport> & { input: TasteInput };

    if (!basicReport?.input?.doubanId || !basicReport?.label) {
      return NextResponse.json(
        { error: "报告数据不完整，请重新生成基础报告" },
        { status: 400 }
      );
    }

    // Full scrape for premium (includes reviews, diaries, statuses)
    let fullInput: TasteInput;
    try {
      const fullData = await scrapeDoubanFull(basicReport.input.doubanId);
      fullInput = {
        doubanId: basicReport.input.doubanId,
        doubanName: fullData.profile.name,
        books: fullData.books,
        movies: fullData.movies,
        music: fullData.music,
        reviews: fullData.reviews,
        diaries: fullData.diaries,
        statuses: fullData.statuses,
        source: "douban",
      };
    } catch {
      // If full scrape fails, use the quick data we already have
      fullInput = basicReport.input;
    }

    const fullReport: TasteReport = {
      id: body.id ?? "temp",
      createdAt: body.createdAt ?? new Date().toISOString(),
      input: fullInput,
      label: basicReport.label!,
      roast: basicReport.roast ?? "",
      radarData: basicReport.radarData ?? { depth: 50, breadth: 50, uniqueness: 50, emotionSensitivity: 50, timeSpan: 50 },
      summary: basicReport.summary ?? "",
      isPremium: false,
    };

    const [premium, timeline, recommendations, graph] = await Promise.all([
      generatePremiumReport(fullReport),
      generateTimeline(fullReport),
      generateRecommendations(fullReport),
      generateGraph(fullReport),
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
      // Return enriched counts so UI can update
      fullCounts: {
        bookCount: fullInput.books.length,
        movieCount: fullInput.movies.length,
        musicCount: fullInput.music.length,
        reviewCount: fullInput.reviews.length,
        diaryCount: fullInput.diaries.length,
        statusCount: fullInput.statuses.length,
      },
    });
  } catch (error) {
    console.error("Premium generation error:", error);
    const message =
      error instanceof Error ? error.message : "深度分析失败，请重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
