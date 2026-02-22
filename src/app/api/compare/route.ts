import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { scrapeDoubanQuick } from "@/lib/douban-scraper";
import {
  generateBasicReport,
  generateComparison,
} from "@/lib/analyzer";
import type { TasteInput, TasteReport } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { doubanIdB, reportA } = body as {
      doubanIdB: string;
      reportA: {
        id: string;
        input: TasteInput;
        mbti: TasteReport["mbti"];
        roast: string;
        radarData: TasteReport["radarData"];
        summary: string;
      };
    };

    if (!doubanIdB?.trim()) {
      return NextResponse.json(
        { error: "请输入对方的豆瓣 ID" },
        { status: 400 }
      );
    }
    if (!reportA?.input || !reportA?.mbti?.type) {
      return NextResponse.json(
        { error: "缺少你的报告数据" },
        { status: 400 }
      );
    }

    const cleanIdB = doubanIdB
      .trim()
      .replace(/^https?:\/\/.*\/people\//, "")
      .replace(/\/$/, "");

    // Scrape person B
    const doubanDataB = await scrapeDoubanQuick(cleanIdB);

    const inputB: TasteInput = {
      doubanId: cleanIdB,
      doubanName: doubanDataB.profile.name,
      books: doubanDataB.books,
      movies: doubanDataB.movies,
      music: doubanDataB.music,
      reviews: doubanDataB.reviews,
      diaries: doubanDataB.diaries,
      statuses: doubanDataB.statuses,
      source: "douban",
    };

    // Generate MBTI for person B
    const basicB = await generateBasicReport(
      inputB,
      doubanDataB.profile.realCounts
    );

    const fullReportA: TasteReport = {
      id: reportA.id,
      createdAt: new Date().toISOString(),
      input: reportA.input,
      mbti: reportA.mbti,
      roast: reportA.roast,
      radarData: reportA.radarData,
      summary: reportA.summary,
      isPremium: false,
    };

    const fullReportB: TasteReport = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      input: inputB,
      mbti: basicB.mbti,
      roast: basicB.roast,
      radarData: basicB.radar,
      summary: basicB.summary,
      isPremium: false,
    };

    // Generate comparison
    const comparison = await generateComparison(fullReportA, fullReportB);

    const compareId = uuidv4();

    return NextResponse.json({
      compareId,
      personA: {
        name: reportA.input.doubanName || reportA.input.doubanId,
        mbtiType: reportA.mbti.type,
        mbtiTitle: reportA.mbti.title,
        dimensions: reportA.mbti.dimensions,
        radarData: reportA.radarData,
        bookCount: reportA.input.books.length,
        movieCount: reportA.input.movies.length,
        musicCount: reportA.input.music.length,
      },
      personB: {
        name: inputB.doubanName || cleanIdB,
        mbtiType: basicB.mbti.type,
        mbtiTitle: basicB.mbti.title,
        dimensions: basicB.mbti.dimensions,
        radarData: basicB.radar,
        bookCount:
          doubanDataB.profile.realCounts.books || inputB.books.length,
        movieCount:
          doubanDataB.profile.realCounts.movies || inputB.movies.length,
        musicCount:
          doubanDataB.profile.realCounts.music || inputB.music.length,
      },
      comparison,
    });
  } catch (error) {
    console.error("Compare error:", error);
    const message =
      error instanceof Error ? error.message : "对比分析失败，请重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
