import { NextRequest, NextResponse } from "next/server";
import { generatePremiumReport, generateTimeline } from "@/lib/analyzer";
import type { TasteReport, TasteInput, CulturalMBTI } from "@/lib/types";

export const maxDuration = 60;

/**
 * Expand: generates book/movie/music analysis + timeline.
 * Called automatically from result page after MBTI loads.
 * Uses existing sampled data, no re-scraping.
 */
export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEV_MOCK === "true") {
    const { MOCK_EXPAND } = await import("@/lib/mock-data");
    return NextResponse.json(MOCK_EXPAND);
  }

  try {
    const body = await req.json();

    const { input, mbti, roast, radarData, summary } = body as {
      id: string;
      input: TasteInput;
      mbti: CulturalMBTI;
      roast: string;
      radarData: TasteReport["radarData"];
      summary: string;
    };

    if (!input || !mbti?.type) {
      return NextResponse.json(
        { error: "报告数据不完整" },
        { status: 400 }
      );
    }

    const report: TasteReport = {
      id: body.id ?? "temp",
      createdAt: new Date().toISOString(),
      input,
      mbti,
      roast: roast ?? "",
      radarData: radarData ?? {
        wenqing: 50, emo: 50, shekong: 50,
        kaogu: 50, shangtou: 50,
      },
      summary: summary ?? "",
      isPremium: false,
    };

    const [premium, timeline] = await Promise.all([
      generatePremiumReport(report).catch(() => ({
        bookAnalysis: "",
        movieAnalysis: "",
        musicAnalysis: "",
        crossDomain: "",
        personality: "",
        blindSpots: "",
      })),
      generateTimeline(report).catch(() => ({
        months: [],
        trend: "",
        prediction: "",
      })),
    ]);

    return NextResponse.json({
      bookAnalysis: premium.bookAnalysis,
      movieAnalysis: premium.movieAnalysis,
      musicAnalysis: premium.musicAnalysis,
      timelineMonths: timeline.months,
      timelineText: `${timeline.trend}\n\n${timeline.prediction}`,
    });
  } catch (error) {
    console.error("Expand error:", error);
    const message =
      error instanceof Error ? error.message : "扩展分析失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
