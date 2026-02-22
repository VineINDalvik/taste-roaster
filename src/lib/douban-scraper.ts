import * as cheerio from "cheerio";
import type { WorkItem, RealCounts } from "./types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const HEADERS = {
  "User-Agent": UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  Referer: "https://www.douban.com/",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 404) throw new Error("用户不存在或主页未公开");
  if (res.status === 403) throw new Error("豆瓣暂时限制访问，请稍后再试");
  if (!res.ok) throw new Error(`请求失败: ${res.status}`);
  return res.text();
}

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

const PAGE_SIZE = 15;

/**
 * Fetch page 0 of a collection to get the real total count from the paginator.
 * Douban's paginator has `data-total-page` or we can count from the last page link.
 * Also extracts items from page 0 itself.
 */
async function fetchFirstPageAndCount(
  userId: string,
  type: "book" | "movie" | "music"
): Promise<{ totalPages: number; totalItems: number; items: WorkItem[]; html: string }> {
  const domain = getDomain(type);
  const url = `https://${domain}/people/${userId}/collect?start=0&sort=time&mode=list`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  // Method 1: data-total-page attribute on the current page span
  let totalPages = 0;
  const totalPageAttr = $(".paginator .thispage").attr("data-total-page");
  if (totalPageAttr) {
    totalPages = parseInt(totalPageAttr) || 0;
  }

  // Method 2: last numbered page link in paginator
  if (totalPages === 0) {
    $(".paginator a").each((_, el) => {
      const pageNum = parseInt($(el).text().trim());
      if (!isNaN(pageNum) && pageNum > totalPages) {
        totalPages = pageNum;
      }
    });
  }

  // Method 3: if no paginator at all, there's only 1 page (or 0)
  if (totalPages === 0) {
    const listItems = $(".list-view .item");
    totalPages = listItems.length > 0 ? 1 : 0;
  }

  // Method 4: look for "（共N个）" text in page header/title
  let totalItems = 0;
  const headerText = $("h1, .usr-collect-hd, #db-usr-profile h1").text();
  const countInHeader = headerText.match(/(\d+)/);
  if (countInHeader) {
    totalItems = parseInt(countInHeader[1]);
  }

  // Also try the filter bar text like "共XXX个"
  if (totalItems === 0) {
    const bodyText = $("body").text();
    const totalMatch = bodyText.match(/共(\d+)个/);
    if (totalMatch) {
      totalItems = parseInt(totalMatch[1]);
    }
  }

  // Calculate from pages if direct count not found
  if (totalItems === 0 && totalPages > 0) {
    // Last page might have fewer items, but totalPages * pageSize is a good estimate
    // We'll refine with actual last page if needed
    totalItems = totalPages * PAGE_SIZE;
  }

  // Extract items from this first page
  const items = parseListItems($);

  return { totalPages, totalItems, items, html };
}

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
 * Scrape a single page of collection items.
 */
async function scrapeOnePage(
  userId: string,
  type: "book" | "movie" | "music",
  pageNum: number
): Promise<WorkItem[]> {
  const domain = getDomain(type);
  const start = pageNum * PAGE_SIZE;
  const url = `https://${domain}/people/${userId}/collect?start=${start}&sort=time&mode=list`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);
  return parseListItems($);
}

/**
 * Smart sampled scrape: gets real count from page 0 paginator,
 * then samples pages across time periods.
 */
async function scrapeCollectionSampled(
  userId: string,
  type: "book" | "movie" | "music",
  targetItems: number = 100
): Promise<{ items: WorkItem[]; realCount: number }> {
  const { totalPages, totalItems, items: page0Items } =
    await fetchFirstPageAndCount(userId, type);

  if (totalPages === 0 || page0Items.length === 0) {
    return { items: [], realCount: totalItems };
  }

  const seenTitles = new Set(page0Items.map((i) => i.title));
  const allItems = [...page0Items];

  if (totalPages <= 1) {
    return { items: allItems, realCount: totalItems || allItems.length };
  }

  // Decide which additional pages to sample
  const additionalPages: number[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i < totalPages; i++) additionalPages.push(i);
  } else {
    // Pages 1,2 (recent), middle 2, last 2 (oldest)
    additionalPages.push(1, 2);
    const mid = Math.floor(totalPages / 2);
    additionalPages.push(mid - 1, mid);
    const last = totalPages - 1;
    additionalPages.push(last - 1, last);
  }

  const uniquePages = [...new Set(additionalPages)]
    .filter((p) => p > 0 && p < totalPages)
    .sort((a, b) => a - b);

  for (const page of uniquePages) {
    if (allItems.length >= targetItems) break;

    try {
      await sleep(600 + Math.random() * 400);
      const pageItems = await scrapeOnePage(userId, type, page);
      for (const item of pageItems) {
        if (!seenTitles.has(item.title)) {
          seenTitles.add(item.title);
          allItems.push(item);
        }
      }
    } catch {
      // Skip failed pages, don't abort
    }
  }

  return { items: allItems, realCount: totalItems || allItems.length };
}

/**
 * Full sequential scrape for premium mode.
 */
async function scrapeCollectionFull(
  userId: string,
  type: "book" | "movie" | "music",
  maxPages: number = 150
): Promise<{ items: WorkItem[]; realCount: number }> {
  const { totalPages, totalItems, items: page0Items } =
    await fetchFirstPageAndCount(userId, type);

  if (totalPages === 0 || page0Items.length === 0) {
    return { items: [], realCount: totalItems };
  }

  const seenTitles = new Set(page0Items.map((i) => i.title));
  const allItems = [...page0Items];
  const pagesToScrape = Math.min(totalPages, maxPages);

  for (let page = 1; page < pagesToScrape; page++) {
    try {
      await sleep(600 + Math.random() * 400);
      const pageItems = await scrapeOnePage(userId, type, page);
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
      if (page === 1) break;
      break;
    }
  }

  return { items: allItems, realCount: Math.max(totalItems, allItems.length) };
}

async function scrapeProfile(userId: string): Promise<DoubanProfile> {
  const html = await fetchPage(`https://www.douban.com/people/${userId}/`);
  const $ = cheerio.load(html);

  const name =
    $("title").text().split("的豆瓣")[0]?.trim() ||
    $(".info h1").text().trim() ||
    userId;
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

async function scrapeReviews(
  userId: string,
  maxPages: number = 20
): Promise<{ title: string; content: string; type: string; rating?: number }[]> {
  const reviews: { title: string; content: string; type: string; rating?: number }[] = [];

  for (let page = 0; page < maxPages; page++) {
    const start = page * 10;
    try {
      const html = await fetchPage(
        `https://www.douban.com/people/${userId}/reviews?start=${start}`
      );
      const $ = cheerio.load(html);
      const reviewItems = $(".review-item, .tlst, .ilst");
      if (reviewItems.length === 0 && page === 0) break;

      reviewItems.each((_, el) => {
        const title = $(el).find("a.title-link, h2 a, a").first().text().trim();
        const content = $(el).find(".short-content, .review-short, p").text().trim();
        const typeText = $(el).find(".type, .category").text().trim();
        const ratingClass = $(el).find("[class*='rating']").attr("class") || "";
        const ratingMatch = ratingClass.match(/rating(\d)/);
        if (title) {
          reviews.push({
            title,
            content: content.slice(0, 500),
            type: typeText || "未知",
            rating: ratingMatch ? parseInt(ratingMatch[1]) : undefined,
          });
        }
      });

      const hasNext = $(".paginator .next a").length > 0;
      if (!hasNext) break;
      await sleep(600 + Math.random() * 400);
    } catch {
      break;
    }
  }
  return reviews;
}

async function scrapeDiaries(
  userId: string,
  maxPages: number = 20
): Promise<{ title: string; content: string; date?: string }[]> {
  const diaries: { title: string; content: string; date?: string }[] = [];

  for (let page = 0; page < maxPages; page++) {
    const start = page * 10;
    try {
      const html = await fetchPage(
        `https://www.douban.com/people/${userId}/notes?start=${start}`
      );
      const $ = cheerio.load(html);
      const noteItems = $(
        ".note-container .note-header-container, .klist .list-item, .article-list .item"
      );
      if (noteItems.length === 0 && page === 0) break;

      noteItems.each((_, el) => {
        const title = $(el).find("a.title, h3 a, a").first().text().trim();
        const date = $(el).find(".pub-date, .time, span.date").text().trim();
        if (title) {
          diaries.push({ title, content: "", date: date || undefined });
        }
      });

      const hasNext = $(".paginator .next a").length > 0;
      if (!hasNext) break;
      await sleep(600 + Math.random() * 400);
    } catch {
      break;
    }
  }
  return diaries;
}

async function scrapeStatuses(
  userId: string
): Promise<{ content: string; date?: string }[]> {
  const statuses: { content: string; date?: string }[] = [];
  try {
    const html = await fetchPage(
      `https://www.douban.com/people/${userId}/statuses`
    );
    const $ = cheerio.load(html);
    $(".status-item, .new-status, .saying").each((_, el) => {
      const content =
        $(el).find(".status-content, .saying-text, blockquote").text().trim() ||
        $(el).find("p").text().trim();
      const date = $(el).find(".created_at, .pubtime, span.date").text().trim();
      if (content && content.length > 5) {
        statuses.push({ content: content.slice(0, 300), date: date || undefined });
      }
    });
  } catch {
    // statuses page might not be accessible
  }
  return statuses;
}

/**
 * Quick mode: gets real counts from paginator, samples ~100 items per type.
 */
export async function scrapeDoubanQuick(userId: string): Promise<DoubanData> {
  const profile = await scrapeProfile(userId);

  // Sequential: each fetchFirstPageAndCount + sample is one type at a time
  const bookResult = await scrapeCollectionSampled(userId, "book", 100)
    .catch(() => ({ items: [] as WorkItem[], realCount: 0 }));
  profile.realCounts.books = bookResult.realCount;

  await sleep(500);

  const movieResult = await scrapeCollectionSampled(userId, "movie", 100)
    .catch(() => ({ items: [] as WorkItem[], realCount: 0 }));
  profile.realCounts.movies = movieResult.realCount;

  await sleep(500);

  const musicResult = await scrapeCollectionSampled(userId, "music", 100)
    .catch(() => ({ items: [] as WorkItem[], realCount: 0 }));
  profile.realCounts.music = musicResult.realCount;

  const books = bookResult.items;
  const movies = movieResult.items;
  const music = musicResult.items;

  const totalItems = books.length + movies.length + music.length;
  if (totalItems === 0) {
    throw new Error("未获取到任何数据，该用户可能设置了隐私保护");
  }

  return { profile, books, movies, music, reviews: [], diaries: [], statuses: [] };
}

/**
 * Full mode: exhaustive sequential scrape + reviews/diaries/statuses.
 */
export async function scrapeDoubanFull(userId: string): Promise<DoubanData> {
  const profile = await scrapeProfile(userId);

  const bookResult = await scrapeCollectionFull(userId, "book", 150)
    .catch(() => ({ items: [] as WorkItem[], realCount: 0 }));
  profile.realCounts.books = bookResult.realCount;

  await sleep(1000);

  const movieResult = await scrapeCollectionFull(userId, "movie", 150)
    .catch(() => ({ items: [] as WorkItem[], realCount: 0 }));
  profile.realCounts.movies = movieResult.realCount;

  await sleep(1000);

  const musicResult = await scrapeCollectionFull(userId, "music", 150)
    .catch(() => ({ items: [] as WorkItem[], realCount: 0 }));
  profile.realCounts.music = musicResult.realCount;

  await sleep(1000);

  const [reviews, diaries, statuses] = await Promise.all([
    scrapeReviews(userId).catch(
      () => [] as { title: string; content: string; type: string; rating?: number }[]
    ),
    scrapeDiaries(userId).catch(
      () => [] as { title: string; content: string; date?: string }[]
    ),
    scrapeStatuses(userId).catch(
      () => [] as { content: string; date?: string }[]
    ),
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
    reviews,
    diaries,
    statuses,
  };
}
