import Taro from '@tarojs/taro'

const VERCEL_BASE = 'https://app-theta-puce.vercel.app'

export async function callApi<T = unknown>(
  path: string,
  body?: Record<string, unknown>,
  method: 'GET' | 'POST' = 'POST'
): Promise<T> {
  const res = await Taro.request({
    url: `${VERCEL_BASE}${path}`,
    method,
    data: body,
    header: { 'Content-Type': 'application/json' },
    timeout: 90000,
  })

  if (res.statusCode >= 400) {
    const errMsg = typeof res.data === 'object' && res.data?.error
      ? res.data.error
      : `请求失败 (${res.statusCode})`
    throw new Error(errMsg)
  }

  return res.data as T
}
