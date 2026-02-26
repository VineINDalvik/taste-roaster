import Taro from '@tarojs/taro'

const VERCEL_BASE = 'https://vinex.top'

export async function callApi<T = unknown>(
  path: string,
  body?: Record<string, unknown>,
  method: 'GET' | 'POST' = 'POST',
  opts?: { timeout?: number }
): Promise<T> {
  const timeout = opts?.timeout ?? (
    path.includes('/api/analyze') ? 120000
    : path.includes('/api/compare') ? 90000
    : path.includes('/api/share-unlock') || path.includes('/api/expand') ? 90000
    : 60000
  )
  const res = await Taro.request({
    url: `${VERCEL_BASE}${path}`,
    method,
    data: body,
    header: { 'Content-Type': 'application/json' },
    timeout,
  })

  if (res.statusCode >= 400) {
    const errMsg = typeof res.data === 'object' && res.data?.error
      ? res.data.error
      : `请求失败 (${res.statusCode})`
    throw new Error(errMsg)
  }

  return res.data as T
}
