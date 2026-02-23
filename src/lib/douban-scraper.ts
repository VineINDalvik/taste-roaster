import * as cheerio from "cheerio";
import { createHash } from "crypto";
import type { WorkItem, RealCounts } from "./types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const BASE_HEADERS: Record<string, string> = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
};

const FETCH_TIMEOUT_MS = 10_000;
const INTER_PAGE_SLEEP_MS = 400;
const INTER_TYPE_SLEEP_MS = 200;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchWithTimeout(url: string, opts: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ─── PoW Challenge Solver ───────────────────────────────────────

function sha512(data: string): string {
  return createHash("sha512").update(data).digest("hex");
}

function solvePoW(challenge: string, difficulty: number = 4): number {
  const target = "0".repeat(difficulty);
  let nonce = 0;
  while (true) {
    nonce++;
    if (sha512(challenge + nonce).substring(0, difficulty) === target) return nonce;
    if (nonce > 2_000_000) throw new Error("PoW solver exceeded max iterations");
  }
}

// ─── Cookie Management ──────────────────────────────────────────

const globalCookies: Record<string, string> = {};

function mergeCookies(setCookieHeaders: string[]) {
  for (const h of setCookieHeaders) {
    const parts = h.split(";")[0].split("=");
    const key = parts[0].trim();
    const val = parts.slice(1).join("=");
    if (key) globalCookies[key] = val;
  }
}

function cookieString(): string {
  return Object.entries(globalCookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

// ─── Fetch with PoW ─────────────────────────────────────────────

function isChallengePage(html: string): boolean {
  return html.includes('id="cha"') && html.includes("sha512");
}

/**
 * Fetch a Douban page. Handles:
 * 1. 302 redirect to sec.douban.com
 * 2. PoW challenge on sec.douban.com
 * 3. Cookie persistence across all .douban.com subdomains
 */
async function fetchPage(url: string): Promise<string> {
  const headers: Record<string, string> = {
    ...BASE_HEADERS,
    Referer: "https://www.douban.com/",
  };
  const ck = cookieString();
  if (ck) headers["Cookie"] = ck;

  let res = await fetchWithTimeout(url, { headers, redirect: "manual" });
  mergeCookies(res.headers.getSetCookie?.() ?? []);

  let redirectCount = 0;
  while ((res.status === 301 || res.status === 302) && redirectCount < 5) {
    redirectCount++;
    const loc = res.headers.get("location");
    if (!loc) break;
    const nextHeaders = { ...BASE_HEADERS, Cookie: cookieString() };
    res = await fetchWithTimeout(loc, { headers: nextHeaders, redirect: "manual" });
    mergeCookies(res.headers.getSetCookie?.() ?? []);
  }

  if (res.status === 404) throw new Error("用户不存在或主页未公开");
  if (res.status === 403) throw new Error("豆瓣暂时限制访问，请稍后再试");
  if (!res.ok && res.status !== 200) throw new Error(`请求失败: ${res.status}`);

  let html = await res.text();

  if (isChallengePage(html)) {
    const $ = cheerio.load(html);
    const tok = $("#tok").val() as string;
    const cha = $("#cha").val() as string;
    if (!tok || !cha) throw new Error("无法提取验证参数");

    const sol = solvePoW(cha, 4);
    const currentUrl = res.url || url;
    const origin = new URL(currentUrl).origin;
    const action = ($("#sec").attr("action") || "/c");
    const postUrl = origin + action;

    const postRes = await fetchWithTimeout(postUrl, {
      method: "POST",
      headers: {
        ...BASE_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieString(),
        Referer: currentUrl,
      },
      body: new URLSearchParams({ tok, cha, sol: String(sol) }).toString(),
      redirect: "manual",
    });
    mergeCookies(postRes.headers.getSetCookie?.() ?? []);

    let finalRes = postRes;
    let count = 0;
    while ((finalRes.status === 301 || finalRes.status === 302) && count < 5) {
      count++;
      const loc = finalRes.headers.get("location");
      if (!loc) break;
      finalRes = await fetchWithTimeout(loc, {
        headers: { ...BASE_HEADERS, Cookie: cookieString() },
        redirect: "manual",
      });
      mergeCookies(finalRes.headers.getSetCookie?.() ?? []);
    }

    html = await finalRes.text();

    if (isChallengePage(html)) {
      throw new Error("豆瓣验证未通过，请稍后再试");
    }
  }

  if (html.includes("<title>403 Forbidden</title>")) {
    throw new Error("豆瓣暂时限制访问，请稍后再试");
  }

  return html;
}

// ─── Data Types ─────────────────────────────────────────────────

function getDomain(type: "book" | "movie" | "music"): string {
  return type === "book"
    ? "book.douban.com"
    : type === "movie"
      ? "movie.douban.com"
      : "music.douban.com";
}

export interface DoubanProfile {
  id: string;
  name: string;
  avatar?: string;
  intro?: string;
  realCounts: RealCounts;
}

export interface DoubanData {
  profile: DoubanProfile;
  books: WorkItem[];
  movies: WorkItem[];
  music: WorkItem[];
  reviews: { title: string; content: string; type: string; rating?: number }[];
  diaries: { title: string; content: string; date?: string }[];
  statuses: { content: string; date?: string }[];
}

const PAGE_SIZE = 30;

// ─── Page Parsing ───────────────────────────────────────────────

function parseListItems($: cheerio.CheerioAPI): WorkItem[] {
  const items: WorkItem[] = [];
  $(".list-view .item").each((_, el) => {
    const titleEl = $(el).find(".title a").first();
    const title = (titleEl.text().trim() || titleEl.attr("title") || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!title) return;

    const ratingClass = $(el).find("[class*='rating']").attr("class") || "";
    const ratingMatch = ratingClass.match(/rating(\d)-t/);
    const rating = ratingMatch ? parseInt(ratingMatch[1]) : undefined;

    const dateText = $(el).find(".date").text().trim();
    const dateMatch = dateText.match(/\d{4}-\d{2}-\d{2}/);
    const date = dateMatch ? dateMatch[0] : undefined;

    const comment = $(el).find(".comment").text().trim() || undefined;

    items.push({ title, rating, date, comment });
  });
  return items;
}

/**
 * Extract real count from page title.
 * Douban titles: "阿北读过的书(115)", "阿北看过的影视(218)", "阿北听过的音乐(24)"
 */
function extractCountFromTitle($: cheerio.CheerioAPI): number {
  const title = $("title").text().trim();
  const match = title.match(/\((\d+)\)/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Extract user display name from collection page title as fallback.
 * "阿北读过的书(115)" → "阿北"
 */
function extractNameFromCollectionTitle($: cheerio.CheerioAPI): string {
  const title = $("title").text().trim();
  const match = title.match(/^(.+?)(?:读过|看过|听过|想读|想看|想听|在读|在看|在听)/);
  return match ? match[1].trim() : "";
}

// ─── Deterministic Sampling ─────────────────────────────────────

/**
 * Stable hash for tiebreaking — always returns the same number for the same string.
 */
function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * Score an item for deterministic selection priority.
 *
 * Higher score = more informative for MBTI analysis.
 * - Longer comments carry more personality signal
 * - Polarized ratings (1/5 star) reveal stronger preferences than neutral 3-star
 * - Having a date helps timeline construction
 */
function scoreItem(item: WorkItem): number {
  let score = 0;

  // Comment length: 0-40 points (200+ chars = max)
  const commentLen = item.comment?.length ?? 0;
  score += Math.min(commentLen / 5, 40);

  // Rating polarity: extreme ratings reveal personality
  // |rating - 3|: 5→2, 4→1, 3→0, 2→1, 1→2
  // 0-30 points
  if (item.rating != null) {
    score += Math.abs(item.rating - 3) * 15;
    score += 5; // bonus for having a rating at all
  }

  // Date presence: 0-10 points (useful for timeline)
  if (item.date) score += 10;

  return score;
}

/**
 * Deterministic selection: score → sort → take top N.
 * Same input always produces the same output.
 */
function deterministicSelect(items: WorkItem[], limit: number): WorkItem[] {
  if (items.length <= limit) return items;

  return [...items]
    .sort((a, b) => {
      const sa = scoreItem(a);
      const sb = scoreItem(b);
      if (sa !== sb) return sb - sa;
      // Stable tiebreak: hash of title
      return stableHash(a.title) - stableHash(b.title);
    })
    .slice(0, limit);
}

// ─── Collection Scraping ────────────────────────────────────────

async function scrapeCollectionSampled(
  userId: string,
  type: "book" | "movie" | "music",
  targetItems: number = 100
): Promise<{ items: WorkItem[]; realCount: number; nameHint: string }> {
  const domain = getDomain(type);
  const url0 = `https://${domain}/people/${userId}/collect?start=0&sort=time&mode=list`;
  const html = await fetchPage(url0);
  const $0 = cheerio.load(html);

  const realCount = extractCountFromTitle($0);
  const nameHint = extractNameFromCollectionTitle($0);
  const page0Items = parseListItems($0);

  if (page0Items.length === 0) {
    return { items: [], realCount, nameHint };
  }

  const totalPages = Math.ceil(realCount / PAGE_SIZE) || 1;
  const seenTitles = new Set(page0Items.map((i) => i.title));
  const allItems = [...page0Items];

  if (totalPages <= 1) {
    return {
      items: deterministicSelect(allItems, targetItems),
      realCount: realCount || allItems.length,
      nameHint,
    };
  }

  // Deterministic page selection: 1 recent + 1 middle + 1 last = 3 additional max.
  // Keeps total fetches per type to 4 max (~6-10s per type).
  const pagesToFetch: number[] = [];
  if (totalPages <= 4) {
    for (let i = 1; i < totalPages; i++) pagesToFetch.push(i);
  } else {
    pagesToFetch.push(1);
    pagesToFetch.push(Math.floor(totalPages / 2));
    pagesToFetch.push(totalPages - 1);
  }

  const uniquePages = [...new Set(pagesToFetch)]
    .filter((p) => p > 0 && p < totalPages)
    .sort((a, b) => a - b);

  for (const page of uniquePages) {
    try {
      await sleep(INTER_PAGE_SLEEP_MS);
      const start = page * PAGE_SIZE;
      const pageUrl = `https://${domain}/people/${userId}/collect?start=${start}&sort=time&mode=list`;
      const pageHtml = await fetchPage(pageUrl);
      const $p = cheerio.load(pageHtml);
      for (const item of parseListItems($p)) {
        if (!seenTitles.has(item.title)) {
          seenTitles.add(item.title);
          allItems.push(item);
        }
      }
    } catch {
      // Skip failed pages but continue with others
    }
  }

  // Deterministic selection: score all items → stable sort → take top N
  const selected = deterministicSelect(allItems, targetItems);
  return { items: selected, realCount: realCount || allItems.length, nameHint };
}

async function scrapeCollectionFull(
  userId: string,
  type: "book" | "movie" | "music",
  maxPages: number = 80
): Promise<{ items: WorkItem[]; realCount: number }> {
  const domain = getDomain(type);
  const url0 = `https://${domain}/people/${userId}/collect?start=0&sort=time&mode=list`;
  const html = await fetchPage(url0);
  const $0 = cheerio.load(html);

  const realCount = extractCountFromTitle($0);
  const page0Items = parseListItems($0);

  if (page0Items.length === 0) {
    return { items: [], realCount };
  }

  const totalPages = Math.min(Math.ceil(realCount / PAGE_SIZE) || 1, maxPages);
  const seenTitles = new Set(page0Items.map((i) => i.title));
  const allItems = [...page0Items];

  for (let page = 1; page < totalPages; page++) {
    try {
      await sleep(800 + Math.random() * 400);
      const start = page * PAGE_SIZE;
      const pageUrl = `https://${domain}/people/${userId}/collect?start=${start}&sort=time&mode=list`;
      const pageHtml = await fetchPage(pageUrl);
      const $p = cheerio.load(pageHtml);
      const pageItems = parseListItems($p);
      if (pageItems.length === 0) break;

      let foundNew = false;
      for (const item of pageItems) {
        if (!seenTitles.has(item.title)) {
          seenTitles.add(item.title);
          allItems.push(item);
          foundNew = true;
        }
      }
      if (!foundNew) break;
    } catch {
      break;
    }
  }

  return { items: allItems, realCount: Math.max(realCount, allItems.length) };
}

// ─── Profile ────────────────────────────────────────────────────

const BAD_NAMES = ["登录豆瓣", "登录", "豆瓣", "403 Forbidden", "页面不存在", ""];

async function scrapeProfile(userId: string): Promise<DoubanProfile> {
  const html = await fetchPage(`https://www.douban.com/people/${userId}/`);
  const $ = cheerio.load(html);

  let name =
    $("title").text().split("的豆瓣")[0]?.trim() ||
    $(".info h1").text().trim() ||
    "";

  if (!name || BAD_NAMES.includes(name) || name.includes("登录")) {
    name = userId;
  }

  const avatar =
    $(".basic-info img").attr("src") ||
    $("#db-usr-profile .pic img").attr("src") ||
    "";
  const intro =
    $(".user-info .intro .all")?.text().trim() ||
    $(".intro .all")?.text().trim() ||
    $(".user-info .intro")?.text().trim() ||
    "";

  return {
    id: userId,
    name,
    avatar,
    intro,
    realCounts: { books: 0, movies: 0, music: 0 },
  };
}

// ─── Reviews / Diaries / Statuses ───────────────────────────────

async function scrapeReviews(
  userId: string,
  maxPages: number = 10
): Promise<{ title: string; content: string; type: string; rating?: number }[]> {
  const reviews: { title: string; content: string; type: string; rating?: number }[] = [];
  for (let page = 0; page < maxPages; page++) {
    try {
      const html = await fetchPage(
        `https://www.douban.com/people/${userId}/reviews?start=${page * 10}`
      );
      const $ = cheerio.load(html);
      const items = $(".review-item, .tlst, .ilst");
      if (items.length === 0 && page === 0) break;
      items.each((_, el) => {
        const title = $(el).find("a.title-link, h2 a, a").first().text().trim();
        const content = $(el).find(".short-content, .review-short, p").text().trim();
        const typeText = $(el).find(".type, .category").text().trim();
        const rc = $(el).find("[class*='rating']").attr("class") || "";
        const rm = rc.match(/rating(\d)/);
        if (title) {
          reviews.push({
            title, content: content.slice(0, 500), type: typeText || "未知",
            rating: rm ? parseInt(rm[1]) : undefined,
          });
        }
      });
      if ($(".paginator .next a").length === 0) break;
      await sleep(800 + Math.random() * 400);
    } catch { break; }
  }
  return reviews;
}

async function scrapeDiaries(
  userId: string,
  maxPages: number = 10
): Promise<{ title: string; content: string; date?: string }[]> {
  const diaries: { title: string; content: string; date?: string }[] = [];
  for (let page = 0; page < maxPages; page++) {
    try {
      const html = await fetchPage(
        `https://www.douban.com/people/${userId}/notes?start=${page * 10}`
      );
      const $ = cheerio.load(html);
      const items = $(".note-container .note-header-container, .klist .list-item, .article-list .item");
      if (items.length === 0 && page === 0) break;
      items.each((_, el) => {
        const title = $(el).find("a.title, h3 a, a").first().text().trim();
        const date = $(el).find(".pub-date, .time, span.date").text().trim();
        if (title) diaries.push({ title, content: "", date: date || undefined });
      });
      if ($(".paginator .next a").length === 0) break;
      await sleep(800 + Math.random() * 400);
    } catch { break; }
  }
  return diaries;
}

async function scrapeStatuses(
  userId: string
): Promise<{ content: string; date?: string }[]> {
  const statuses: { content: string; date?: string }[] = [];
  try {
    const html = await fetchPage(`https://www.douban.com/people/${userId}/statuses`);
    const $ = cheerio.load(html);
    $(".status-item, .new-status, .saying").each((_, el) => {
      const content =
        $(el).find(".status-content, .saying-text, blockquote").text().trim() ||
        $(el).find("p").text().trim();
      const date = $(el).find(".created_at, .pubtime, span.date").text().trim();
      if (content && content.length > 5)
        statuses.push({ content: content.slice(0, 300), date: date || undefined });
    });
  } catch { /* statuses page might not be accessible */ }
  return statuses;
}

// ─── Public API ─────────────────────────────────────────────────

export async function scrapeDoubanQuick(userId: string): Promise<DoubanData> {
  const emptyResult = { items: [] as WorkItem[], realCount: 0, nameHint: "" };

  const [bookResult, movieResult, musicResult] = await Promise.all([
    scrapeCollectionSampled(userId, "book", 100).catch(() => emptyResult),
    scrapeCollectionSampled(userId, "movie", 100).catch(() => emptyResult),
    scrapeCollectionSampled(userId, "music", 100).catch(() => emptyResult),
  ]);

  const name =
    bookResult.nameHint || movieResult.nameHint || musicResult.nameHint || userId;

  const profile: DoubanProfile = {
    id: userId,
    name,
    avatar: "",
    intro: "",
    realCounts: {
      books: bookResult.realCount,
      movies: movieResult.realCount,
      music: musicResult.realCount,
    },
  };

  const totalItems =
    bookResult.items.length + movieResult.items.length + musicResult.items.length;
  if (totalItems === 0) {
    throw new Error("未获取到任何数据，该用户可能设置了隐私保护");
  }

  return {
    profile,
    books: bookResult.items,
    movies: movieResult.items,
    music: musicResult.items,
    reviews: [], diaries: [], statuses: [],
  };
}

export async function scrapeDoubanFull(userId: string): Promise<DoubanData> {
  const profile = await scrapeProfile(userId);

  const bookResult = await scrapeCollectionFull(userId, "book", 80)
    .catch(() => ({ items: [] as WorkItem[], realCount: 0 }));
  profile.realCounts.books = bookResult.realCount;
  await sleep(1000);

  const movieResult = await scrapeCollectionFull(userId, "movie", 80)
    .catch(() => ({ items: [] as WorkItem[], realCount: 0 }));
  profile.realCounts.movies = movieResult.realCount;
  await sleep(1000);

  const musicResult = await scrapeCollectionFull(userId, "music", 80)
    .catch(() => ({ items: [] as WorkItem[], realCount: 0 }));
  profile.realCounts.music = musicResult.realCount;
  await sleep(1000);

  const [reviews, diaries, statuses] = await Promise.all([
    scrapeReviews(userId).catch(() => [] as { title: string; content: string; type: string; rating?: number }[]),
    scrapeDiaries(userId).catch(() => [] as { title: string; content: string; date?: string }[]),
    scrapeStatuses(userId).catch(() => [] as { content: string; date?: string }[]),
  ]);

  const totalItems =
    bookResult.items.length + movieResult.items.length + musicResult.items.length +
    reviews.length + diaries.length + statuses.length;
  if (totalItems === 0) {
    throw new Error("未获取到任何数据，该用户可能设置了隐私保护");
  }

  return {
    profile,
    books: bookResult.items,
    movies: movieResult.items,
    music: musicResult.items,
    reviews, diaries, statuses,
  };
}
