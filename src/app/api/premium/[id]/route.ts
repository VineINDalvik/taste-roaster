import { NextRequest, NextResponse } from "next/server";
import { getReport, updateReport } from "@/lib/store";
import { generatePremiumReport } from "@/lib/analyzer";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = getReport(id);

  if (!report) {
    return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  }

  if (report.isPremium) {
    return NextResponse.json({
      message: "已解锁",
      bookAnalysis: report.bookAnalysis,
      movieAnalysis: report.movieAnalysis,
      musicAnalysis: report.musicAnalysis,
      timeline: report.timeline,
      crossDomain: report.crossDomain,
      personality: report.personality,
      blindSpots: report.blindSpots,
    });
  }

  // In production, verify payment here before generating
  const premium = await generatePremiumReport(report);

  const updated = updateReport(id, {
    isPremium: true,
    bookAnalysis: premium.bookAnalysis,
    movieAnalysis: premium.movieAnalysis,
    musicAnalysis: premium.musicAnalysis,
    timeline: premium.timeline,
    crossDomain: premium.crossDomain,
    personality: premium.personality,
    blindSpots: premium.blindSpots,
  });

  return NextResponse.json({
    message: "解锁成功",
    ...premium,
    isPremium: updated?.isPremium,
  });
}
