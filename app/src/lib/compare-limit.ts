const STORAGE_KEY = "taste-compare-usage";
const FREE_LIMIT = 1;
const PRICE_CNY = 1.88;

/** 内测账号：豆瓣 ID 在此列表者可无限次双人对比 */
export const INTERNAL_TESTER_DOUBAN_IDS = ["98610936"];

export function isInternalTester(doubanId?: string): boolean {
  if (!doubanId) return false;
  return INTERNAL_TESTER_DOUBAN_IDS.includes(String(doubanId).trim());
}

interface CompareUsage {
  count: number;
  paidCompareIds: string[];
}

function getUsage(): CompareUsage {
  if (typeof window === "undefined") return { count: 0, paidCompareIds: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, paidCompareIds: [] };
    return JSON.parse(raw);
  } catch {
    return { count: 0, paidCompareIds: [] };
  }
}

function saveUsage(usage: CompareUsage) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

export function getCompareCount(): number {
  return getUsage().count;
}

export function canCompareForFree(doubanId?: string): boolean {
  if (isInternalTester(doubanId)) return true;
  return getUsage().count < FREE_LIMIT;
}

export function getRemainingFree(doubanId?: string): number | string {
  if (isInternalTester(doubanId)) return "∞";
  return Math.max(0, FREE_LIMIT - getUsage().count);
}

export function recordCompare(doubanId?: string) {
  if (isInternalTester(doubanId)) return;
  const usage = getUsage();
  usage.count += 1;
  saveUsage(usage);
}

export function markComparePaid(compareId: string) {
  const usage = getUsage();
  if (!usage.paidCompareIds.includes(compareId)) {
    usage.paidCompareIds.push(compareId);
  }
  saveUsage(usage);
}

export function isComparePaid(compareId: string): boolean {
  return getUsage().paidCompareIds.includes(compareId);
}

export { FREE_LIMIT, PRICE_CNY };
