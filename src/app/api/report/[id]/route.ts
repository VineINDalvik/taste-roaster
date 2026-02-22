import { NextRequest, NextResponse } from "next/server";
import { getReport } from "@/lib/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const report = getReport(id);

  if (!report) {
    return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  }

  const totalItems =
    report.input.books.length +
    report.input.movies.length +
    report.input.music.length +
    (report.input.reviews?.length ?? 0) +
    (report.input.diaries?.length ?? 0) +
    (report.input.statuses?.length ?? 0);

  const response: Record<string, unknown> = {
    id: report.id,
    createdAt: report.createdAt,
    doubanName: report.input.doubanName,
    mbti: report.mbti,
    roast: report.roast,
    radarData: report.radarData,
    summary: report.summary,
    isPremium: report.isPremium,
    itemCount: totalItems,
    bookCount: report.input.books.length,
    movieCount: report.input.movies.length,
    musicCount: report.input.music.length,
    reviewCount: report.input.reviews?.length ?? 0,
    diaryCount: report.input.diaries?.length ?? 0,
    statusCount: report.input.statuses?.length ?? 0,
  };

  if (report.isPremium) {
    response.bookAnalysis = report.bookAnalysis;
    response.movieAnalysis = report.movieAnalysis;
    response.musicAnalysis = report.musicAnalysis;
    response.timelineMonths = report.timelineMonths;
    response.timelineText = report.timelineText;
    response.crossDomain = report.crossDomain;
    response.personality = report.personality;
    response.blindSpots = report.blindSpots;
    response.recommendations = report.recommendations;
  }

  return NextResponse.json(response);
}
