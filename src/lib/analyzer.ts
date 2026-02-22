import { getOpenAI } from "./openai";
import {
  TASTE_ANALYSIS_PROMPT,
  PREMIUM_ANALYSIS_PROMPT,
  TIMELINE_PROMPT,
  RECOMMENDATION_PROMPT,
  GRAPH_PROMPT,
  formatItems,
  formatReviews,
  formatDiaries,
  formatStatuses,
} from "./prompts";
import { truncateForTokenBudget, groupByMonth } from "./token-budget";
import type {
  TasteInput,
  TasteReport,
  RadarData,
  MonthSnapshot,
  RecommendationItem,
} from "./types";

function buildPromptData(input: TasteInput, originalCounts?: Record<string, number>, wasTruncated?: boolean) {
  const totalCount =
    input.books.length +
    input.movies.length +
    input.music.length +
    (input.reviews?.length ?? 0) +
    (input.diaries?.length ?? 0) +
    (input.statuses?.length ?? 0);

  let truncateNote = "";
  if (wasTruncated && originalCounts) {
    const origTotal =
      originalCounts.books +
      originalCounts.movies +
      originalCounts.music +
      originalCounts.reviews +
      originalCounts.diaries +
      originalCounts.statuses;
    truncateNote = `，原始共${origTotal}条，已截取最近${totalCount}条用于分析`;
  }

  return {
    userName: input.doubanName || input.doubanId || "匿名用户",
    totalCount: String(totalCount),
    truncateNote,
    bookCount: String(input.books.length),
    movieCount: String(input.movies.length),
    musicCount: String(input.music.length),
    reviewCount: String(input.reviews?.length ?? 0),
    diaryCount: String(input.diaries?.length ?? 0),
    statusCount: String(input.statuses?.length ?? 0),
    books: formatItems(input.books),
    movies: formatItems(input.movies),
    music: formatItems(input.music),
    reviews: formatReviews(input.reviews ?? []),
    diaries: formatDiaries(input.diaries ?? []),
    statuses: formatStatuses(input.statuses ?? []),
  };
}

function fillTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

export async function generateBasicReport(
  input: TasteInput
): Promise<{
  label: string;
  roast: string;
  radar: RadarData;
  summary: string;
}> {
  const { input: truncated, wasTruncated, originalCounts } = truncateForTokenBudget(input);
  const openai = getOpenAI();
  const data = buildPromptData(truncated, originalCounts, wasTruncated);
  const prompt = fillTemplate(TASTE_ANALYSIS_PROMPT, data);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1500,
    temperature: 0.85,
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response");

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    label: parsed.label ?? "神秘品味人",
    roast: parsed.roast ?? "数据太少，品味成谜。",
    radar: {
      depth: parsed.radar?.depth ?? 50,
      breadth: parsed.radar?.breadth ?? 50,
      uniqueness: parsed.radar?.uniqueness ?? 50,
      emotionSensitivity: parsed.radar?.emotionSensitivity ?? 50,
      timeSpan: parsed.radar?.timeSpan ?? 50,
    },
    summary: parsed.summary ?? "",
  };
}

export async function generatePremiumReport(
  report: TasteReport
): Promise<{
  bookAnalysis: string;
  movieAnalysis: string;
  musicAnalysis: string;
  crossDomain: string;
  personality: string;
  blindSpots: string;
}> {
  const { input: truncated, wasTruncated, originalCounts } = truncateForTokenBudget(report.input);
  const openai = getOpenAI();
  const data = {
    ...buildPromptData(truncated, originalCounts, wasTruncated),
    label: report.label,
    roast: report.roast,
  };
  const prompt = fillTemplate(PREMIUM_ANALYSIS_PROMPT, data);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 3000,
    temperature: 0.85,
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse premium report");
  return JSON.parse(jsonMatch[0]);
}

export async function generateTimeline(
  report: TasteReport
): Promise<{
  months: MonthSnapshot[];
  trend: string;
  prediction: string;
}> {
  const monthlyBuckets = groupByMonth(report.input, 6);

  if (monthlyBuckets.length === 0) {
    return {
      months: [],
      trend: "数据中没有足够的日期信息来构建时间线。",
      prediction: "无法预测——先去多标记一些书影音吧。",
    };
  }

  let monthlyData = "";
  for (const m of monthlyBuckets) {
    monthlyData += `\n### ${m.month}\n`;
    if (m.books.length > 0) monthlyData += `- 读了：${m.books.join("、")}\n`;
    if (m.movies.length > 0) monthlyData += `- 看了：${m.movies.join("、")}\n`;
    if (m.music.length > 0) monthlyData += `- 听了：${m.music.join("、")}\n`;
    if (m.diaryTitles.length > 0)
      monthlyData += `- 日记：${m.diaryTitles.join("、")}\n`;
    if (
      m.books.length + m.movies.length + m.music.length + m.diaryTitles.length ===
      0
    )
      monthlyData += `- (本月无记录)\n`;
  }

  const openai = getOpenAI();
  const data = {
    userName: report.input.doubanName || report.input.doubanId || "匿名用户",
    label: report.label,
    monthCount: String(monthlyBuckets.length),
    monthlyData,
  };
  const prompt = fillTemplate(TIMELINE_PROMPT, data);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2000,
    temperature: 0.85,
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse timeline");

  const parsed = JSON.parse(jsonMatch[0]);
  const months: MonthSnapshot[] = (parsed.months ?? []).map(
    (m: { month: string; mood?: string; tasteShift?: string; roast?: string }) => {
      const bucket = monthlyBuckets.find((b) => b.month === m.month);
      return {
        month: m.month,
        books: bucket?.books ?? [],
        movies: bucket?.movies ?? [],
        music: bucket?.music ?? [],
        mood: m.mood ?? "",
        tasteShift: m.tasteShift ?? "",
        roast: m.roast ?? "",
      };
    }
  );

  return {
    months,
    trend: parsed.trend ?? "",
    prediction: parsed.prediction ?? "",
  };
}

export async function generateRecommendations(
  report: TasteReport
): Promise<RecommendationItem[]> {
  const openai = getOpenAI();

  const bookSample = report.input.books
    .slice(0, 15)
    .map((b) => b.title)
    .join("、") || "无";
  const movieSample = report.input.movies
    .slice(0, 15)
    .map((m) => m.title)
    .join("、") || "无";
  const musicSample = report.input.music
    .slice(0, 15)
    .map((m) => m.title)
    .join("、") || "无";

  const data = {
    userName: report.input.doubanName || report.input.doubanId || "匿名用户",
    label: report.label,
    summary: report.summary,
    bookSample,
    movieSample,
    musicSample,
  };

  const prompt = fillTemplate(RECOMMENDATION_PROMPT, data);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2000,
    temperature: 0.85,
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]);
  return (parsed.recommendations ?? []).map(
    (r: { title: string; type: string; reason: string; matchScore: number }) => ({
      title: r.title,
      type: r.type as "book" | "movie" | "music",
      reason: r.reason,
      matchScore: r.matchScore ?? 70,
    })
  );
}

export async function generateGraph(
  report: TasteReport
): Promise<{
  nodes: { id: string; label: string; type: string; size: number }[];
  edges: { source: string; target: string; weight: number }[];
}> {
  const openai = getOpenAI();

  const bookSample = report.input.books.slice(0, 20).map((b) => b.title).join("、") || "无";
  const movieSample = report.input.movies.slice(0, 20).map((m) => m.title).join("、") || "无";
  const musicSample = report.input.music.slice(0, 20).map((m) => m.title).join("、") || "无";

  const data = {
    userName: report.input.doubanName || report.input.doubanId || "匿名用户",
    bookSample,
    movieSample,
    musicSample,
  };

  const prompt = fillTemplate(GRAPH_PROMPT, data);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 3000,
    temperature: 0.7,
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { nodes: [], edges: [] };

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    nodes: parsed.nodes ?? [],
    edges: parsed.edges ?? [],
  };
}
