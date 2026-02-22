import { NextRequest, NextResponse } from "next/server";
import { generatePremiumReport } from "@/lib/analyzer";
import type { TasteReport, TasteInput, CulturalMBTI } from "@/lib/types";

export async function POST(req: NextRequest) {
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

    const fullReport: TasteReport = {
      id: body.id ?? "temp",
      createdAt: body.createdAt ?? new Date().toISOString(),
      input: report.input,
      mbti: report.mbti,
      roast: report.roast ?? "",
      radarData: report.radarData ?? {
        depth: 50, breadth: 50, uniqueness: 50,
        emotionSensitivity: 50, timeSpan: 50,
      },
      summary: report.summary ?? "",
      isPremium: false,
    };

    const premium = await generatePremiumReport(fullReport);

    return NextResponse.json({
      personality: premium.personality,
      crossDomain: premium.crossDomain,
    });
  } catch (error) {
    console.error("Share unlock error:", error);
    const message =
      error instanceof Error ? error.message : "解锁失败，请重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
