const STORAGE_KEY = "taste-compare-usage";
const FREE_LIMIT = 1;
const PRICE_CNY = 1.88;

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

export function canCompareForFree(): boolean {
  return getUsage().count < FREE_LIMIT;
}

export function getRemainingFree(): number {
  return Math.max(0, FREE_LIMIT - getUsage().count);
}

export function recordCompare() {
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
