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
  const avatar = $(".basic-info img").attr("src") || $("#db-usr-profile .pic img").attr("src") || "";
  const intro = $(".user-info .intro .all")?.text().trim() || $(".intro .all")?.text().trim() || $(".user-info .intro")?.text().trim() || "";

  return { id: userId, name, avatar, intro };
}

async function scrapeCollection(
  userId: string,
  type: "book" | "movie" | "music",
  maxPages: number = 50
): Promise<WorkItem[]> {
  const domain =
    type === "book"
      ? "book.douban.com"
      : type === "movie"
        ? "movie.douban.com"
        : "music.douban.com";
  const action = type === "book" ? "collect" : type === "movie" ? "collect" : "collect";

  const items: WorkItem[] = [];

  for (let page = 0; page < maxPages; page++) {
    const start = page * 15;
    const url = `https://${domain}/people/${userId}/${action}?start=${start}&sort=time&rating=all&filter=all&mode=list`;

    try {
      const html = await fetchPage(url);
      const $ = cheerio.load(html);

      const listItems = $(".list-view .item, .item.comment-item, li.subject-item");

      if (listItems.length === 0 && page === 0) {
        const gridItems = $(".item");
        if (gridItems.length === 0) break;

        gridItems.each((_, el) => {
          const title = $(el).find("li.title a, .title a, em").text().trim();
          const ratingEl = $(el).find("[class*='rating']").attr("class") || "";
          const ratingMatch = ratingEl.match(/rating(\d)/);
          const rating = ratingMatch ? parseInt(ratingMatch[1]) : undefined;
          const date = $(el).find(".date, .collect-stamp, span.date").text().trim();
          const comment = $(el).find(".comment, .short-note .comment, p.comment").text().trim();

          if (title) {
            items.push({ title, rating, date: date || undefined, comment: comment || undefined });
          }
        });
      } else {
        listItems.each((_, el) => {
          const title =
            $(el).find(".title a").first().text().trim() ||
            $(el).find("a[title]").attr("title") ||
            $(el).find("a").first().text().trim();

          const ratingEl = $(el).find("[class*='rating']").attr("class") || "";
          const ratingMatch = ratingEl.match(/rating(\d)/);
          const rating = ratingMatch ? parseInt(ratingMatch[1]) : undefined;

          const date =
            $(el).find(".date, .collect-stamp span, span.date").text().trim();
          const comment =
            $(el).find(".comment, .short-note .comment, p.comment").text().trim();

          if (title) {
            items.push({
              title: title.replace(/\s+/g, " "),
              rating,
              date: date || undefined,
              comment: comment || undefined,
            });
          }
        });
      }

      const hasNext = $(".paginator .next a").length > 0 || $(".next a").length > 0;
      if (!hasNext) break;

      await sleep(800 + Math.random() * 500);
    } catch {
      if (page === 0) throw new Error(`无法访问${type === "book" ? "读书" : type === "movie" ? "电影" : "音乐"}页面`);
      break;
    }
  }

  return items;
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

      $(".review-item, .tlst, .ilst").each((_, el) => {
        const title = $(el).find("a.title-link, h2 a, a").first().text().trim();
        const content = $(el).find(".short-content, .review-short, p").text().trim();
        const typeText = $(el).find(".type, .category").text().trim();
        const ratingEl = $(el).find("[class*='rating']").attr("class") || "";
        const ratingMatch = ratingEl.match(/rating(\d)/);

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
      await sleep(800 + Math.random() * 500);
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

      $(".note-container .note-header-container, .klist .list-item, .article-list .item").each(
        (_, el) => {
          const title = $(el).find("a.title, h3 a, a").first().text().trim();
          const date = $(el).find(".pub-date, .time, span.date").text().trim();
          if (title) {
            diaries.push({
              title,
              content: "",
              date: date || undefined,
            });
          }
        }
      );

      const hasNext = $(".paginator .next a").length > 0;
      if (!hasNext) break;
      await sleep(800 + Math.random() * 500);
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

export async function scrapeDoubanUser(userId: string): Promise<DoubanData> {
  const profile = await scrapeProfile(userId);

  const [books, movies, music, reviews, diaries, statuses] = await Promise.all([
    scrapeCollection(userId, "book").catch(() => [] as WorkItem[]),
    scrapeCollection(userId, "movie").catch(() => [] as WorkItem[]),
    scrapeCollection(userId, "music").catch(() => [] as WorkItem[]),
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
    books.length + movies.length + music.length + reviews.length + diaries.length + statuses.length;

  if (totalItems === 0) {
    throw new Error("未获取到任何数据，该用户可能设置了隐私保护");
  }

  return { profile, books, movies, music, reviews, diaries, statuses };
}
