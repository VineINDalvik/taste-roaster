import * as cheerio from "cheerio";
import type { WorkItem } from "./types";

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

export interface DoubanProfile {
  id: string;
  name: string;
  avatar?: string;
  intro?: string;
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

  return { id: userId, name, avatar, intro };
}

/**
 * Scrape a user's "已读/已看/已听" collection.
 * /collect = done items only (wish = /wish, doing = /do)
 * Uses list mode for stable HTML structure, 15 items per page.
 */
async function scrapeCollection(
  userId: string,
  type: "book" | "movie" | "music",
  maxPages: number = 150
): Promise<WorkItem[]> {
  const domain =
    type === "book"
      ? "book.douban.com"
      : type === "movie"
        ? "movie.douban.com"
        : "music.douban.com";

  const items: WorkItem[] = [];
  const seenTitles = new Set<string>();
  const pageSize = 15;

  for (let page = 0; page < maxPages; page++) {
    const start = page * pageSize;
    const url = `https://${domain}/people/${userId}/collect?start=${start}&sort=time&mode=list`;

    try {
      const html = await fetchPage(url);
      const $ = cheerio.load(html);

      // In list mode, items are in .list-view > .item
      const listItems = $(".list-view .item");

      if (listItems.length === 0) break;

      let foundNew = false;
      listItems.each((_, el) => {
        const titleEl = $(el).find(".title a").first();
        const title = (titleEl.text().trim() || titleEl.attr("title") || "")
          .replace(/\s+/g, " ")
          .trim();

        if (!title || seenTitles.has(title)) return;
        seenTitles.add(title);
        foundNew = true;

        const ratingClass = $(el).find("[class*='rating']").attr("class") || "";
        const ratingMatch = ratingClass.match(/rating(\d)-t/);
        const rating = ratingMatch ? parseInt(ratingMatch[1]) : undefined;

        const dateText = $(el).find(".date").text().trim();
        const dateMatch = dateText.match(/\d{4}-\d{2}-\d{2}/);
        const date = dateMatch ? dateMatch[0] : undefined;

        const comment = $(el).find(".comment").text().trim() || undefined;

        items.push({ title, rating, date, comment });
      });

      if (!foundNew) break;

      const hasNext = $(".paginator .next a").length > 0;
      if (!hasNext) break;

      await sleep(600 + Math.random() * 400);
    } catch {
      if (page === 0)
        throw new Error(
          `无法访问${type === "book" ? "读书" : type === "movie" ? "电影" : "音乐"}页面`
        );
      break;
    }
  }

  return items;
}

async function scrapeReviews(
  userId: string,
  maxPages: number = 20
): Promise<
  { title: string; content: string; type: string; rating?: number }[]
> {
  const reviews: {
    title: string;
    content: string;
    type: string;
    rating?: number;
  }[] = [];

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
        const title = $(el)
          .find("a.title-link, h2 a, a")
          .first()
          .text()
          .trim();
        const content = $(el)
          .find(".short-content, .review-short, p")
          .text()
          .trim();
        const typeText = $(el).find(".type, .category").text().trim();
        const ratingClass =
          $(el).find("[class*='rating']").attr("class") || "";
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
          diaries.push({
            title,
            content: "",
            date: date || undefined,
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
        $(el)
          .find(".status-content, .saying-text, blockquote")
          .text()
          .trim() || $(el).find("p").text().trim();
      const date = $(el)
        .find(".created_at, .pubtime, span.date")
        .text()
        .trim();

      if (content && content.length > 5) {
        statuses.push({
          content: content.slice(0, 300),
          date: date || undefined,
        });
      }
    });
  } catch {
    // statuses page might not be accessible
  }

  return statuses;
}

/**
 * Quick mode: 3 pages/type (~45 items each), no reviews/diaries/statuses.
 * Fast enough for free tier, gives AI enough signal for basic analysis.
 */
export async function scrapeDoubanQuick(userId: string): Promise<DoubanData> {
  const profile = await scrapeProfile(userId);

  const [books, movies, music] = await Promise.all([
    scrapeCollection(userId, "book", 5).catch(() => [] as WorkItem[]),
    scrapeCollection(userId, "movie", 5).catch(() => [] as WorkItem[]),
    scrapeCollection(userId, "music", 5).catch(() => [] as WorkItem[]),
  ]);

  const totalItems = books.length + movies.length + music.length;

  if (totalItems === 0) {
    throw new Error("未获取到任何数据，该用户可能设置了隐私保护");
  }

  return {
    profile,
    books,
    movies,
    music,
    reviews: [],
    diaries: [],
    statuses: [],
  };
}

/**
 * Full mode: up to 150 pages/type, includes reviews, diaries, statuses.
 * Used for premium deep analysis.
 */
export async function scrapeDoubanFull(userId: string): Promise<DoubanData> {
  const profile = await scrapeProfile(userId);

  const [books, movies, music, reviews, diaries, statuses] = await Promise.all([
    scrapeCollection(userId, "book", 150).catch(() => [] as WorkItem[]),
    scrapeCollection(userId, "movie", 150).catch(() => [] as WorkItem[]),
    scrapeCollection(userId, "music", 150).catch(() => [] as WorkItem[]),
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
    books.length + movies.length + music.length +
    reviews.length + diaries.length + statuses.length;

  if (totalItems === 0) {
    throw new Error("未获取到任何数据，该用户可能设置了隐私保护");
  }

  return { profile, books, movies, music, reviews, diaries, statuses };
}
