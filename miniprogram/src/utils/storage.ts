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
