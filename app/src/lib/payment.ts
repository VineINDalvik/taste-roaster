export const PRICE_BASIC = 0.66;
export const PRICE_DEEP = 0.99;
export const PRICE_COMPARE = 1.88;

const BASIC_KEY = "taste-basic-paid";
const DEEP_KEY = "taste-deep-paid";

function getPaidIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addPaidId(key: string, reportId: string) {
  if (typeof window === "undefined") return;
  const ids = getPaidIds(key);
  if (!ids.includes(reportId)) {
    ids.push(reportId);
    localStorage.setItem(key, JSON.stringify(ids));
  }
}

export function isBasicPaid(reportId: string): boolean {
  return getPaidIds(BASIC_KEY).includes(reportId);
}

export function markBasicPaid(reportId: string): void {
  addPaidId(BASIC_KEY, reportId);
}

export function isDeepPaid(reportId: string): boolean {
  return getPaidIds(DEEP_KEY).includes(reportId);
}

export function markDeepPaid(reportId: string): void {
  addPaidId(DEEP_KEY, reportId);
}
