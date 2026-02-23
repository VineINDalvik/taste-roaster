import { getOpenAI } from "./openai";
import {
  MBTI_ANALYSIS_PROMPT,
  PREMIUM_ANALYSIS_PROMPT,
  TIMELINE_PROMPT,
  RECOMMENDATION_PROMPT,
  formatItems,
  formatReviews,
  formatDiaries,
  formatStatuses,
} from "./prompts";
import { truncateForTokenBudget, groupByMonth } from "./token-budget";
import type {
  TasteInput,
  TasteReport,
  CulturalMBTI,
  RadarData,
  MonthSnapshot,
  RecommendationItem,
  RealCounts,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeParseJSON(text: string): Record<string, any> {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI 返回内容中未找到 JSON");

  let raw = jsonMatch[0];

  try {
    return JSON.parse(raw);
  } catch {
    // Fix common LLM JSON issues
  }

  // Remove trailing commas before } or ]
  raw = raw.replace(/,\s*([}\]])/g, "$1");
  // Fix unescaped newlines inside string values
  raw = raw.replace(/(?<=:\s*"[^"]*)\n/g, "\\n");
  // Remove control characters
  raw = raw.replace(/[\x00-\x1f\x7f]/g, (c) =>
    c === "\n" || c === "\r" || c === "\t" ? c : ""
  );

  try {
    return JSON.parse(raw);
  } catch {
    // Last resort: try to extract individual fields
  }

  // Aggressive: strip everything after last valid closing brace
  let depth = 0;
  let lastValid = -1;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "{") depth++;
    if (raw[i] === "}") {
      depth--;
      if (depth === 0) { lastValid = i; break; }
    }
  }
  if (lastValid > 0) {
    try {
      return JSON.parse(raw.substring(0, lastValid + 1));
    } catch {
      // fall through
    }
  }

  throw new Error("AI 返回的 JSON 格式无法解析，请重试");
}

function buildPromptData(
  input: TasteInput,
  realCounts?: RealCounts,
  originalCounts?: Record<string, number>,
  wasTruncated?: boolean
) {
  const sampleCount =
    input.books.length +
    input.movies.length +
    input.music.length;

  let truncateNote = "";
  if (wasTruncated && originalCounts) {
    const origTotal =
      originalCounts.books + originalCounts.movies + originalCounts.music;
    truncateNote = `，已从${origTotal}条中采样${sampleCount}条用于分析`;
  }

  return {
    userName: input.doubanName || input.doubanId || "匿名用户",
    sampleCount: String(sampleCount),
    totalCount: String(
      sampleCount +
      (input.reviews?.length ?? 0) +
      (input.diaries?.length ?? 0) +
      (input.statuses?.length ?? 0)
    ),
    truncateNote,
    realBooks: String(realCounts?.books ?? input.books.length),
    realMovies: String(realCounts?.movies ?? input.movies.length),
    realMusic: String(realCounts?.music ?? input.music.length),
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
  input: TasteInput,
  realCounts?: RealCounts
): Promise<{
  mbti: CulturalMBTI;
  roast: string;
  radar: RadarData;
  summary: string;
}> {
  const { input: truncated, wasTruncated, originalCounts } = truncateForTokenBudget(input);
  const openai = getOpenAI();
  const data = buildPromptData(truncated, realCounts, originalCounts, wasTruncated);
  const prompt = fillTemplate(MBTI_ANALYSIS_PROMPT, data);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2000,
    temperature: 0.8,
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  const parsed = safeParseJSON(text);

  const mbti: CulturalMBTI = {
    type: parsed.mbti?.type ?? "INFP",
    title: parsed.mbti?.title ?? "文化探索者",
    dimensions: {
      ie: {
        letter: parsed.mbti?.dimensions?.ie?.letter ?? "I",
        score: parsed.mbti?.dimensions?.ie?.score ?? 60,
        evidence: parsed.mbti?.dimensions?.ie?.evidence ?? "",
      },
      ns: {
        letter: parsed.mbti?.dimensions?.ns?.letter ?? "N",
        score: parsed.mbti?.dimensions?.ns?.score ?? 60,
        evidence: parsed.mbti?.dimensions?.ns?.evidence ?? "",
      },
      tf: {
        letter: parsed.mbti?.dimensions?.tf?.letter ?? "T",
        score: parsed.mbti?.dimensions?.tf?.score ?? 60,
        evidence: parsed.mbti?.dimensions?.tf?.evidence ?? "",
      },
      jp: {
        letter: parsed.mbti?.dimensions?.jp?.letter ?? "P",
        score: parsed.mbti?.dimensions?.jp?.score ?? 60,
        evidence: parsed.mbti?.dimensions?.jp?.evidence ?? "",
      },
    },
    summary: parsed.mbti?.summary ?? "",
  };

  return {
    mbti,
    roast: parsed.roast ?? "数据太少，品味成谜。",
    radar: {
      wenqing: parsed.radar?.wenqing ?? 50,
      emo: parsed.radar?.emo ?? 50,
      shekong: parsed.radar?.shekong ?? 50,
      kaogu: parsed.radar?.kaogu ?? 50,
      shangtou: parsed.radar?.shangtou ?? 50,
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
    ...buildPromptData(truncated, undefined, originalCounts, wasTruncated),
    mbtiType: report.mbti.type,
    mbtiTitle: report.mbti.title,
    roast: report.roast,
  };
  const prompt = fillTemplate(PREMIUM_ANALYSIS_PROMPT, data);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 3000,
    temperature: 0.85,
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  return safeParseJSON(text) as {
    bookAnalysis: string;
    movieAnalysis: string;
    musicAnalysis: string;
    crossDomain: string;
    personality: string;
    blindSpots: string;
  };
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
      m.books.length + m.movies.length + m.music.length + m.diaryTitles.length === 0
    )
      monthlyData += `- (本月无记录)\n`;
  }

  const openai = getOpenAI();
  const data = {
    userName: report.input.doubanName || report.input.doubanId || "匿名用户",
    mbtiType: report.mbti.type,
    mbtiTitle: report.mbti.title,
    monthCount: String(monthlyBuckets.length),
    monthlyData,
  };
  const prompt = fillTemplate(TIMELINE_PROMPT, data);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2000,
    temperature: 0.85,
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  const parsed = safeParseJSON(text);
  const months: MonthSnapshot[] = (parsed.months as Array<{ month: string; mood?: string; moodScore?: number; tasteShift?: string; roast?: string }> ?? []).map(
    (m: { month: string; mood?: string; moodScore?: number; tasteShift?: string; roast?: string }) => {
      const bucket = monthlyBuckets.find((b) => b.month === m.month);
      return {
        month: m.month,
        books: bucket?.books ?? [],
        movies: bucket?.movies ?? [],
        music: bucket?.music ?? [],
        mood: m.mood ?? "",
        moodScore: m.moodScore ?? 50,
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

  // Pass ALL consumed titles so AI avoids them
  const bookTitles = report.input.books.map((b) => b.title).join("、") || "无";
  const movieTitles = report.input.movies.map((m) => m.title).join("、") || "无";
  const musicTitles = report.input.music.map((m) => m.title).join("、") || "无";

  const data = {
    userName: report.input.doubanName || report.input.doubanId || "匿名用户",
    mbtiType: report.mbti.type,
    mbtiTitle: report.mbti.title,
    summary: report.summary,
    bookTitles,
    movieTitles,
    musicTitles,
  };

  const prompt = fillTemplate(RECOMMENDATION_PROMPT, data);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 2000,
    temperature: 0.85,
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: Record<string, any>;
  try {
    parsed = safeParseJSON(text);
  } catch {
    return [];
  }
  const allTitles = new Set([
    ...report.input.books.map((b) => b.title),
    ...report.input.movies.map((m) => m.title),
    ...report.input.music.map((m) => m.title),
  ]);

  return (parsed.recommendations ?? []).map(
    (r: { title: string; type: string; reason: string; matchScore: number }) => ({
      title: r.title,
      type: r.type as "book" | "movie" | "music",
      reason: r.reason,
      matchScore: r.matchScore ?? 70,
      alreadyConsumed: allTitles.has(r.title),
    })
  );
}

export async function generateComparison(
  reportA: TasteReport,
  reportB: TasteReport
): Promise<{
  matchScore: number;
  matchTitle: string;
  overview: string;
  similarities: { point: string; detail: string }[];
  differences: { point: string; detail: string }[];
  chemistry: string;
  sharedWorks: string[];
  recommendTogether: { title: string; type: string; reason: string }[];
}> {
  const { COMPARE_PROMPT } = await import("./prompts");
  const openai = getOpenAI();

  const data = {
    nameA: reportA.input.doubanName || reportA.input.doubanId || "用户A",
    mbtiTypeA: reportA.mbti.type,
    mbtiTitleA: reportA.mbti.title,
    summaryA: reportA.summary,
    booksA:
      reportA.input.books
        .slice(0, 30)
        .map((b) => b.title)
        .join("、") || "无",
    moviesA:
      reportA.input.movies
        .slice(0, 30)
        .map((m) => m.title)
        .join("、") || "无",
    musicA:
      reportA.input.music
        .slice(0, 30)
        .map((m) => m.title)
        .join("、") || "无",
    nameB: reportB.input.doubanName || reportB.input.doubanId || "用户B",
    mbtiTypeB: reportB.mbti.type,
    mbtiTitleB: reportB.mbti.title,
    summaryB: reportB.summary,
    booksB:
      reportB.input.books
        .slice(0, 30)
        .map((b) => b.title)
        .join("、") || "无",
    moviesB:
      reportB.input.movies
        .slice(0, 30)
        .map((m) => m.title)
        .join("、") || "无",
    musicB:
      reportB.input.music
        .slice(0, 30)
        .map((m) => m.title)
        .join("、") || "无",
  };

  const prompt = fillTemplate(COMPARE_PROMPT, data);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 3000,
    temperature: 0.85,
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  const parsed = safeParseJSON(text);
  return {
    matchScore: parsed.matchScore ?? 50,
    matchTitle: parsed.matchTitle ?? "品味探索中",
    overview: parsed.overview ?? "",
    similarities: parsed.similarities ?? [],
    differences: parsed.differences ?? [],
    chemistry: parsed.chemistry ?? "",
    sharedWorks: parsed.sharedWorks ?? [],
    recommendTogether: parsed.recommendTogether ?? [],
  };
}
