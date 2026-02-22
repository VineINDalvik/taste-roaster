import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { scrapeDoubanUser } from "@/lib/douban-scraper";
import { generateBasicReport } from "@/lib/analyzer";
import { saveReport } from "@/lib/store";
import type { TasteInput, TasteReport } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { doubanId } = body as { doubanId: string };

    if (!doubanId || doubanId.trim().length === 0) {
      return NextResponse.json(
        { error: "请输入豆瓣 ID" },
        { status: 400 }
      );
    }

    const cleanId = doubanId.trim().replace(/^https?:\/\/.*\/people\//, "").replace(/\/$/, "");

    const doubanData = await scrapeDoubanUser(cleanId);

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

    const totalItems =
      input.books.length +
      input.movies.length +
      input.music.length +
      input.reviews.length +
      input.diaries.length +
      input.statuses.length;

    const result = await generateBasicReport(input);

    const report: TasteReport = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      input,
      label: result.label,
      roast: result.roast,
      radarData: result.radar,
      summary: result.summary,
      isPremium: false,
    };

    saveReport(report);

    return NextResponse.json({
      id: report.id,
      doubanName: doubanData.profile.name,
      label: report.label,
      roast: report.roast,
      radarData: report.radarData,
      summary: report.summary,
      itemCount: totalItems,
      bookCount: input.books.length,
      movieCount: input.movies.length,
      musicCount: input.music.length,
      reviewCount: input.reviews.length,
      diaryCount: input.diaries.length,
      statusCount: input.statuses.length,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    const message =
      error instanceof Error ? error.message : "分析失败，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
