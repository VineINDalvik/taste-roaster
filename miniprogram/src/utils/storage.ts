import Taro from '@tarojs/taro'

export function getReport(id: string) {
  try {
    const data = Taro.getStorageSync(`taste-report-${id}`)
    return data ? (typeof data === 'string' ? JSON.parse(data) : data) : null
  } catch {
    return null
  }
}

export function setReport(id: string, data: unknown) {
  try {
    Taro.setStorageSync(`taste-report-${id}`, JSON.stringify(data))
  } catch {
    // storage full or other error
  }
}

export function getCachedByDoubanId(doubanId: string) {
  try {
    const data = Taro.getStorageSync(`taste-douban-${doubanId}`)
    return data ? (typeof data === 'string' ? JSON.parse(data) : data) : null
  } catch {
    return null
  }
}

export function setCacheByDoubanId(doubanId: string, data: unknown) {
  try {
    Taro.setStorageSync(`taste-douban-${doubanId}`, JSON.stringify(data))
  } catch {}
}

export function getCompare(id: string) {
  try {
    const data = Taro.getStorageSync(`taste-compare-${id}`)
    return data ? (typeof data === 'string' ? JSON.parse(data) : data) : null
  } catch {
    return null
  }
}

export function setCompare(id: string, data: unknown) {
  try {
    Taro.setStorageSync(`taste-compare-${id}`, JSON.stringify(data))
  } catch {
    // storage full or other error
  }
}

const COMPARE_USAGE_KEY = 'taste-compare-usage'
const FREE_LIMIT = 1
export const COMPARE_PRICE_CNY = 0.66

interface CompareUsage {
  count: number
}

function getCompareUsage(): CompareUsage {
  try {
    const raw = Taro.getStorageSync(COMPARE_USAGE_KEY)
    if (!raw) return { count: 0 }
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return { count: 0 }
  }
}

export function getCompareCount(): number {
  return getCompareUsage().count
}

export function canCompareForFree(): boolean {
  return getCompareUsage().count < FREE_LIMIT
}

export function getRemainingFreeCompares(): number {
  return Math.max(0, FREE_LIMIT - getCompareUsage().count)
}

export function recordCompareUsage() {
  const usage = getCompareUsage()
  usage.count += 1
  try {
    Taro.setStorageSync(COMPARE_USAGE_KEY, JSON.stringify(usage))
  } catch {}
}
