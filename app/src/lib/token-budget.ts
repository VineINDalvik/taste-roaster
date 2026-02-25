import type { TasteInput, WorkItem, ReviewItem, DiaryItem, StatusItem } from "./types";

// ~2 chars per token for mixed Chinese/English, conservative estimate
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 2);
}

const MAX_PROMPT_TOKENS = 90_000;
const TEMPLATE_OVERHEAD = 3_000;

interface TruncatedInput {
  input: TasteInput;
  wasTruncated: boolean;
  originalCounts: {
    books: number;
    movies: number;
    music: number;
    reviews: number;
    diaries: number;
    statuses: number;
  };
}

/**
 * Same stable hash and scoring as douban-scraper.ts — ensures truncation
 * preserves the same high-value items that were selected during scraping.
 */
function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

function scoreWorkItem(item: WorkItem): number {
  let score = 0;
  const commentLen = item.comment?.length ?? 0;
  score += Math.min(commentLen / 5, 40);
  if (item.rating != null) {
    score += Math.abs(item.rating - 3) * 15;
    score += 5;
  }
  if (item.date) score += 10;
  return score;
}

function sortByPriority(items: WorkItem[]): WorkItem[] {
  return [...items].sort((a, b) => {
    const sa = scoreWorkItem(a);
    const sb = scoreWorkItem(b);
    if (sa !== sb) return sb - sa;
    return stableHash(a.title) - stableHash(b.title);
  });
}

function itemToString(item: WorkItem): string {
  let s = item.title;
  if (item.rating) s += ` (${item.rating}星)`;
  if (item.date) s += ` [${item.date}]`;
  if (item.comment) s += ` "${item.comment}"`;
  return s;
}

function reviewToString(r: ReviewItem): string {
  let s = `「${r.title}」`;
  if (r.rating) s += ` (${r.rating}星)`;
  if (r.content) s += ` ${r.content}`;
  return s;
}

function trimComments(items: WorkItem[]): WorkItem[] {
  return items.map((item) => ({
    ...item,
    comment: item.comment ? item.comment.slice(0, 50) : undefined,
  }));
}

function trimReviewContent(reviews: ReviewItem[], maxChars: number): ReviewItem[] {
  return reviews.map((r) => ({
    ...r,
    content: r.content ? r.content.slice(0, maxChars) : "",
  }));
}

function estimateDataTokens(input: TasteInput): number {
  let total = 0;
  for (const item of input.books) total += estimateTokens(itemToString(item));
  for (const item of input.movies) total += estimateTokens(itemToString(item));
  for (const item of input.music) total += estimateTokens(itemToString(item));
  for (const r of input.reviews ?? []) total += estimateTokens(reviewToString(r));
  for (const d of input.diaries ?? []) total += estimateTokens(`${d.title} ${d.content}`);
  for (const s of input.statuses ?? []) total += estimateTokens(s.content);
  return total;
}

export function truncateForTokenBudget(input: TasteInput): TruncatedInput {
  const originalCounts = {
    books: input.books.length,
    movies: input.movies.length,
    music: input.music.length,
    reviews: (input.reviews ?? []).length,
    diaries: (input.diaries ?? []).length,
    statuses: (input.statuses ?? []).length,
  };

  const budget = MAX_PROMPT_TOKENS - TEMPLATE_OVERHEAD;
  let current = estimateDataTokens(input);

  if (current <= budget) {
    return { input, wasTruncated: false, originalCounts };
  }

  let result: TasteInput = { ...input };

  // Phase 1: Trim review content to 100 chars
  result = { ...result, reviews: trimReviewContent(result.reviews ?? [], 100) };
  current = estimateDataTokens(result);
  if (current <= budget) {
    return { input: result, wasTruncated: true, originalCounts };
  }

  // Phase 2: Trim comments to 50 chars
  result = {
    ...result,
    books: trimComments(result.books),
    movies: trimComments(result.movies),
    music: trimComments(result.music),
  };
  current = estimateDataTokens(result);
  if (current <= budget) {
    return { input: result, wasTruncated: true, originalCounts };
  }

  // Phase 3: Keep highest-priority items. Progressively reduce.
  const caps = [500, 300, 200, 100];
  for (const cap of caps) {
    result = {
      ...result,
      books: sortByPriority(result.books).slice(0, cap),
      movies: sortByPriority(result.movies).slice(0, cap),
      music: sortByPriority(result.music).slice(0, cap),
      reviews: (result.reviews ?? []).slice(0, Math.floor(cap / 5)),
      statuses: (result.statuses ?? []).slice(0, 10),
    };

    // Remove comments entirely at lower caps
    if (cap <= 200) {
      result = {
        ...result,
        books: result.books.map(({ title, rating, date }) => ({ title, rating, date })),
        movies: result.movies.map(({ title, rating, date }) => ({ title, rating, date })),
        music: result.music.map(({ title, rating, date }) => ({ title, rating, date })),
        reviews: trimReviewContent(result.reviews ?? [], 50),
      };
    }

    current = estimateDataTokens(result);
    if (current <= budget) {
      return { input: result, wasTruncated: true, originalCounts };
    }
  }

  return { input: result, wasTruncated: true, originalCounts };
}

/**
 * Extract items from the last N months, grouped by month.
 */
export function groupByMonth(input: TasteInput, months: number = 6) {
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months, 1);

  function parseDate(dateStr?: string): Date | null {
    if (!dateStr) return null;
    const match = dateStr.match(/(\d{4})[-./](\d{1,2})(?:[-./](\d{1,2}))?/);
    if (!match) return null;
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3] ?? "1"));
  }

  function monthKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  interface MonthBucket {
    books: string[];
    movies: string[];
    music: string[];
    reviewSnippets: string[];
  }

  const buckets = new Map<string, MonthBucket>();

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    buckets.set(key, {
      books: [],
      movies: [],
      music: [],
      reviewSnippets: [],
    });
  }

  function addItem(items: WorkItem[], field: "books" | "movies" | "music") {
    for (const item of items) {
      const d = parseDate(item.date);
      if (!d || d < cutoff) continue;
      const key = monthKey(d);
      const bucket = buckets.get(key);
      if (bucket) {
        const entry = item.rating ? `${item.title}(${item.rating}星)` : item.title;
        bucket[field].push(entry);
      }
    }
  }

  addItem(input.books, "books");
  addItem(input.movies, "movies");
  addItem(input.music, "music");

  const sortedKeys = [...buckets.keys()].sort().reverse();
  return sortedKeys
    .map((key) => ({
      month: key,
      ...buckets.get(key)!,
    }))
    .filter(
      (m) =>
        m.books.length + m.movies.length + m.music.length > 0
    );
}
