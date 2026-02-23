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

const INVITE_TTL = 7 * 24 * 60 * 60; // 7 days
const COMPARE_TTL = 30 * 24 * 60 * 60; // 30 days

export interface InviteData {
  name: string;
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

export function isKvConfigured(): boolean {
  return !!process.env.REDIS_URL;
}
