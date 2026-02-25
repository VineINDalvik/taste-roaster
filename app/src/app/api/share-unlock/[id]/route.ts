import { NextRequest, NextResponse } from "next/server";
import {
  generatePremiumReport,
  generateRecommendations,
} from "@/lib/analyzer";
import { resetUsage, getAccumulatedUsage } from "@/lib/openai";
import { getCachedShareUnlock, cacheShareUnlock } from "@/lib/kv";
import type { TasteReport, TasteInput, CulturalMBTI } from "@/lib/types";

export const maxDuration = 90;

/**
 * Share-unlock: generates cross-domain, personality, blindSpots, recommendations.
 * Uses existing sampled data, no re-scraping.
 */
export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEV_MOCK === "true") {
    const { MOCK_SHARE_UNLOCK } = await import("@/lib/mock-data");
    return NextResponse.json(MOCK_SHARE_UNLOCK);
  }

  try {
    const body = await req.json();
    const report = body as Partial<TasteReport> & {
      input: TasteInput;
      mbti: CulturalMBTI;
    };

    if (!report?.input || !report?.mbti?.type) {
      return NextResponse.json(
        { error: "报告数据不完整" },
        { status: 400 }
      );
    }

    const doubanId = report.input.doubanId;
    if (doubanId) {
      const cached = await getCachedShareUnlock(doubanId);
      if (cached) {
        console.log(`[Cache HIT] share-unlock:${doubanId}`);
        return NextResponse.json({ ...cached, _cached: true });
      }
      console.log(`[Cache MISS] share-unlock:${doubanId}`);
    }

    const fullReport: TasteReport = {
      id: body.id ?? "temp",
      createdAt: body.createdAt ?? new Date().toISOString(),
      input: report.input,
      mbti: report.mbti,
      roast: report.roast ?? "",
      radarData: report.radarData ?? {
        wenqing: 50, emo: 50, shekong: 50,
        kaogu: 50, shangtou: 50, chouxiang: 50,
      },
      summary: report.summary ?? "",
      isPremium: false,
    };

    resetUsage();
    const [premium, recommendations] = await Promise.all([
      generatePremiumReport(fullReport),
      generateRecommendations(fullReport),
    ]);

    const result = {
      crossDomain: premium.crossDomain,
      personality: premium.personality,
      blindSpots: premium.blindSpots,
      recommendations: recommendations.filter((r) => !r.alreadyConsumed),
      _usage: getAccumulatedUsage(),
    };

    if (doubanId) {
      cacheShareUnlock(doubanId, result);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Share unlock error:", error);
    const message =
      error instanceof Error ? error.message : "解锁失败，请重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
