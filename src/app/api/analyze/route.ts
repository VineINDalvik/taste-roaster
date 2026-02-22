import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { scrapeDoubanQuick } from "@/lib/douban-scraper";
import {
  generateBasicReport,
  generatePremiumReport,
  generateTimeline,
} from "@/lib/analyzer";
import type { TasteInput, TasteReport } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { doubanId } = body as { doubanId: string };

    if (!doubanId || doubanId.trim().length === 0) {
      return NextResponse.json({ error: "请输入豆瓣 ID" }, { status: 400 });
    }

    const cleanId = doubanId
      .trim()
      .replace(/^https?:\/\/.*\/people\//, "")
      .replace(/\/$/, "");

    const doubanData = await scrapeDoubanQuick(cleanId);

    const input: TasteInput = {
      doubanId: cleanId,
      doubanName: doubanData.profile.name,
      books: doubanData.books,
      movies: doubanData.movies,
      music: doubanData.music,
      reviews: doubanData.reviews,
      diaries: doubanData.diaries,
      statuses: doubanData.statuses,
      source: "douban",
    };

    // Generate MBTI first (needed for premium + timeline prompts)
    const basicResult = await generateBasicReport(
      input,
      doubanData.profile.realCounts
    );

    const id = uuidv4();
    const sampleCount =
      input.books.length + input.movies.length + input.music.length;

    // Build a temporary report for premium + timeline calls
    const tempReport: TasteReport = {
      id,
      createdAt: new Date().toISOString(),
      input,
      mbti: basicResult.mbti,
      roast: basicResult.roast,
      radarData: basicResult.radar,
      summary: basicResult.summary,
      isPremium: false,
    };

    // Generate book/movie/music analysis + timeline in parallel (sampled data, fast)
    const [premiumResult, timelineResult] = await Promise.all([
      generatePremiumReport(tempReport).catch(() => ({
        bookAnalysis: "",
        movieAnalysis: "",
        musicAnalysis: "",
        crossDomain: "",
        personality: "",
        blindSpots: "",
      })),
      generateTimeline(tempReport).catch(() => ({
        months: [],
        trend: "",
        prediction: "",
      })),
    ]);

    return NextResponse.json({
      id,
      createdAt: tempReport.createdAt,
      doubanName: doubanData.profile.name,
      mbti: basicResult.mbti,
      roast: basicResult.roast,
      radarData: basicResult.radar,
      summary: basicResult.summary,
      isPremium: false,
      input,
      sampleCount,
      // Free content: book/movie/music analysis + timeline
      bookAnalysis: premiumResult.bookAnalysis,
      movieAnalysis: premiumResult.movieAnalysis,
      musicAnalysis: premiumResult.musicAnalysis,
      timelineMonths: timelineResult.months,
      timelineText: `${timelineResult.trend}\n\n${timelineResult.prediction}`,
      // Real counts from paginator
      realCounts: doubanData.profile.realCounts,
      bookCount:
        doubanData.profile.realCounts.books || input.books.length,
      movieCount:
        doubanData.profile.realCounts.movies || input.movies.length,
      musicCount:
        doubanData.profile.realCounts.music || input.music.length,
      itemCount:
        (doubanData.profile.realCounts.books || input.books.length) +
        (doubanData.profile.realCounts.movies || input.movies.length) +
        (doubanData.profile.realCounts.music || input.music.length),
    });
  } catch (error) {
    console.error("Analysis error:", error);
    const message =
      error instanceof Error ? error.message : "分析失败，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
