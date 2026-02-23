import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { generateComparison } from "@/lib/analyzer";
import { resetUsage, getAccumulatedUsage } from "@/lib/openai";
import { saveCompare, isKvConfigured } from "@/lib/kv";
import type { TasteReport, CulturalMBTI, RadarData } from "@/lib/types";

export const maxDuration = 30;

interface PersonSummary {
  name: string;
  mbtiType: string;
  mbtiTitle: string;
  dimensions: CulturalMBTI["dimensions"];
  radarData: RadarData;
  summary: string;
  roast: string;
  bookTitles: string[];
  movieTitles: string[];
  musicTitles: string[];
  bookCount: number;
  movieCount: number;
  musicCount: number;
}

/**
 * Lightweight compare: both persons already analyzed.
 * Only generates AI comparison (~5s).
 */
export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEV_MOCK === "true") {
    const { MOCK_COMPARE } = await import("@/lib/mock-data");
    return NextResponse.json(MOCK_COMPARE);
  }

  try {
    const body = await req.json();
    const { personA, personB } = body as {
      personA: PersonSummary;
      personB: PersonSummary;
    };

    if (!personA?.mbtiType || !personB?.mbtiType) {
      return NextResponse.json(
        { error: "缺少双方的 MBTI 数据" },
        { status: 400 }
      );
    }

    // Build minimal TasteReport for comparison
    const reportA: TasteReport = {
      id: "a",
      createdAt: new Date().toISOString(),
      input: {
        doubanId: "",
        doubanName: personA.name,
        books: personA.bookTitles.map((t) => ({ title: t })),
        movies: personA.movieTitles.map((t) => ({ title: t })),
        music: personA.musicTitles.map((t) => ({ title: t })),
        reviews: [],
        diaries: [],
        statuses: [],
        source: "douban",
      },
      mbti: {
        type: personA.mbtiType,
        title: personA.mbtiTitle,
        dimensions: personA.dimensions,
        summary: personA.summary,
      },
      roast: personA.roast,
      radarData: personA.radarData,
      summary: personA.summary,
      isPremium: false,
    };

    const reportB: TasteReport = {
      id: "b",
      createdAt: new Date().toISOString(),
      input: {
        doubanId: "",
        doubanName: personB.name,
        books: personB.bookTitles.map((t) => ({ title: t })),
        movies: personB.movieTitles.map((t) => ({ title: t })),
        music: personB.musicTitles.map((t) => ({ title: t })),
        reviews: [],
        diaries: [],
        statuses: [],
        source: "douban",
      },
      mbti: {
        type: personB.mbtiType,
        title: personB.mbtiTitle,
        dimensions: personB.dimensions,
        summary: personB.summary,
      },
      roast: personB.roast,
      radarData: personB.radarData,
      summary: personB.summary,
      isPremium: false,
    };

    resetUsage();
    const comparison = await generateComparison(reportA, reportB);
    const compareId = uuidv4();

    const result = {
      compareId,
      personA: {
        name: personA.name,
        mbtiType: personA.mbtiType,
        mbtiTitle: personA.mbtiTitle,
        dimensions: personA.dimensions,
        radarData: personA.radarData,
        bookCount: personA.bookCount,
        movieCount: personA.movieCount,
        musicCount: personA.musicCount,
      },
      personB: {
        name: personB.name,
        mbtiType: personB.mbtiType,
        mbtiTitle: personB.mbtiTitle,
        dimensions: personB.dimensions,
        radarData: personB.radarData,
        bookCount: personB.bookCount,
        movieCount: personB.movieCount,
        musicCount: personB.musicCount,
      },
      comparison,
    };

    if (isKvConfigured()) {
      try {
        await saveCompare(compareId, result);
      } catch (e) {
        console.warn("Failed to save compare to KV:", e);
      }
    }

    return NextResponse.json({ ...result, _usage: getAccumulatedUsage() });
  } catch (error) {
    console.error("Compare error:", error);
    const message =
      error instanceof Error ? error.message : "对比分析失败，请重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
