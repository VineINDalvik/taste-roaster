import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType> | null = null;

async function getRedis(): Promise<RedisClientType> {
  if (client?.isOpen) return client;

  if (connecting) return connecting;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("Missing REDIS_URL environment variable");

  connecting = (async () => {
    client = createClient({ url });
    client.on("error", (err) => console.error("Redis error:", err));
    await client.connect();
    connecting = null;
    return client;
  })();

  return connecting;
}

export function isKvConfigured(): boolean {
  return !!process.env.REDIS_URL;
}

const INVITE_TTL = 7 * 24 * 60 * 60; // 7 days
const COMPARE_TTL = 30 * 24 * 60 * 60; // 30 days
const ANALYZE_TTL = 7 * 24 * 60 * 60; // 7 days
const EXPAND_TTL = 7 * 24 * 60 * 60; // 7 days
const SHARE_UNLOCK_TTL = 7 * 24 * 60 * 60; // 7 days

export interface InviteData {
  name: string;
  doubanId?: string; // 用于内测账号无限次判定
  mbtiType: string;
  mbtiTitle: string;
  dimensions: Record<string, { letter: string; score: number; evidence: string }>;
  radarData: Record<string, number>;
  summary: string;
  roast: string;
  bookTitles: string[];
  movieTitles: string[];
  musicTitles: string[];
  bookCount: number;
  movieCount: number;
  musicCount: number;
}

export async function saveInvite(code: string, data: InviteData) {
  const r = await getRedis();
  await r.set(`invite:${code}`, JSON.stringify(data), { EX: INVITE_TTL });
}

export async function getInvite(code: string): Promise<InviteData | null> {
  const r = await getRedis();
  const raw = await r.get(`invite:${code}`);
  if (!raw) return null;
  return JSON.parse(raw);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveCompare(id: string, data: any) {
  const r = await getRedis();
  await r.set(`compare:${id}`, JSON.stringify(data), { EX: COMPARE_TTL });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCompare(id: string): Promise<any | null> {
  const r = await getRedis();
  const raw = await r.get(`compare:${id}`);
  if (!raw) return null;
  return JSON.parse(raw);
}

// --- Analyze cache (by douban ID) ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheAnalyze(doubanId: string, data: any): Promise<void> {
  if (!isKvConfigured()) return;
  try {
    const r = await getRedis();
    await r.set(`analyze:${doubanId}`, JSON.stringify(data), { EX: ANALYZE_TTL });
  } catch (e) {
    console.error("Cache analyze write failed:", e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedAnalyze(doubanId: string): Promise<any | null> {
  if (!isKvConfigured()) return null;
  try {
    const r = await getRedis();
    const raw = await r.get(`analyze:${doubanId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Cache analyze read failed:", e);
    return null;
  }
}

// --- Expand cache (by douban ID) ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheExpand(doubanId: string, data: any): Promise<void> {
  if (!isKvConfigured()) return;
  try {
    const r = await getRedis();
    await r.set(`expand:${doubanId}`, JSON.stringify(data), { EX: EXPAND_TTL });
  } catch (e) {
    console.error("Cache expand write failed:", e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedExpand(doubanId: string): Promise<any | null> {
  if (!isKvConfigured()) return null;
  try {
    const r = await getRedis();
    const raw = await r.get(`expand:${doubanId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Cache expand read failed:", e);
    return null;
  }
}

// --- Share-unlock cache (by douban ID) ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheShareUnlock(doubanId: string, data: any): Promise<void> {
  if (!isKvConfigured()) return;
  try {
    const r = await getRedis();
    await r.set(`share-unlock:${doubanId}`, JSON.stringify(data), { EX: SHARE_UNLOCK_TTL });
  } catch (e) {
    console.error("Cache share-unlock write failed:", e);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedShareUnlock(doubanId: string): Promise<any | null> {
  if (!isKvConfigured()) return null;
  try {
    const r = await getRedis();
    const raw = await r.get(`share-unlock:${doubanId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Cache share-unlock read failed:", e);
    return null;
  }
}

// --- Compare cache (by doubanId pair) ---

/** Cache key: normalized pair so A:B and B:A hit same cache */
export function compareCacheKey(doubanIdA: string, doubanIdB: string): string {
  const [a, b] = [doubanIdA.trim(), doubanIdB.trim()];
  return a <= b ? `compare-gen:${a}:${b}` : `compare-gen:${b}:${a}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCachedCompareResult(cacheKey: string): Promise<any | null> {
  if (!isKvConfigured()) return null;
  try {
    const r = await getRedis();
    const raw = await r.get(cacheKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Cache compare read failed:", e);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function cacheCompareResult(cacheKey: string, data: any): Promise<void> {
  if (!isKvConfigured()) return;
  try {
    const r = await getRedis();
    await r.set(cacheKey, JSON.stringify(data), { EX: COMPARE_TTL });
  } catch (e) {
    console.error("Cache compare write failed:", e);
  }
}
