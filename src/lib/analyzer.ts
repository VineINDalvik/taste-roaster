import { getOpenAI } from "./openai";
import {
  TASTE_ANALYSIS_PROMPT,
  PREMIUM_ANALYSIS_PROMPT,
  formatItems,
  formatReviews,
  formatDiaries,
  formatStatuses,
} from "./prompts";
import type { TasteInput, TasteReport, RadarData } from "./types";

function buildPromptData(input: TasteInput) {
  return {
    userName: input.doubanName || input.doubanId || "匿名用户",
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
  const openai = getOpenAI();
  const data = buildPromptData(input);
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
  timeline: string;
  crossDomain: string;
  personality: string;
  blindSpots: string;
}> {
  const openai = getOpenAI();
  const data = {
    ...buildPromptData(report.input),
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
