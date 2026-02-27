import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro, { useRouter, getCurrentInstance } from '@tarojs/taro'
import { callApi } from '@/utils/api'
import {
  getReport, setReport, setCompare,
  canCompareForFree, getCompareCount, getRemainingFreeCompares,
  recordCompareUsage,
} from '@/utils/storage'
import './index.scss'

const PROGRESS_MESSAGES = [
  '正在爬取对方的豆瓣数据...',
  '翻看对方读过的书...',
  '扒拉对方看过的电影...',
  '推导对方的书影音 MBTI...',
  '寻找你们的品味交集...',
  'AI 正在犀利点评你们的匹配度...',
  '生成双人对比报告...',
]

/** 兼容 Taro 在小程序首次渲染时 useRouter 返回空 params 的时序问题 */
function useCompareFromId(): string {
  const router = useRouter()
  const instance = getCurrentInstance()
  return useMemo(() => {
    const fromRouter = router?.params?.from
    if (fromRouter) return fromRouter
    const fromInstance = (instance?.router?.params as Record<string, string> | undefined)?.from
    if (fromInstance) return fromInstance
    try {
      const pages = Taro.getCurrentPages()
      const page = pages?.[pages.length - 1] as { options?: Record<string, string> } | undefined
      return page?.options?.from ?? ''
    } catch {
      return ''
    }
  }, [router?.params?.from, instance?.router?.params])
}

export default function ComparePage() {
  const fromId = useCompareFromId()
  const [doubanIdB, setDoubanIdB] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressIdx, setProgressIdx] = useState(0)
  const [myName, setMyName] = useState('')
  const [showPaywall, setShowPaywall] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  const withHardTimeout = useCallback(async <T,>(p: Promise<T>, ms: number, label: string) => {
    let t: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        p,
        new Promise<T>((_, reject) => {
          t = setTimeout(() => reject(new Error(`${label}超时`)), ms)
        }),
      ])
    } finally {
      if (t) clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    if (fromId) {
      const stored = getReport(fromId)
      if (stored) {
        try {
          const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored
          setMyName(parsed.doubanName || parsed.input?.doubanId || '')
        } catch {}
      }
    }
  }, [fromId])

  const handleCompare = useCallback(async () => {
    if (!doubanIdB.trim() || !fromId) return

    const stored = getReport(fromId)
    if (!stored) {
      setError('找不到你的报告数据，请先测试自己的书影音 MBTI')
      return
    }

    const myReport = typeof stored === 'string' ? JSON.parse(stored) : stored
    const myDoubanId = myReport.input?.doubanId || myReport.doubanId

    if (!canCompareForFree(myDoubanId)) {
      setShowPaywall(true)
      return
    }

    const myBookCount = myReport.realCounts?.books || myReport.bookCount || myReport.input?.books?.length || 0
    const myMovieCount = myReport.realCounts?.movies || myReport.movieCount || myReport.input?.movies?.length || 0
    const myMusicCount = myReport.realCounts?.music || myReport.musicCount || myReport.input?.music?.length || 0

    setIsLoading(true)
    setError(null)
    setProgressIdx(0)

    timerRef.current = setInterval(() => {
      setProgressIdx(prev => (prev < PROGRESS_MESSAGES.length - 1 ? prev + 1 : prev))
    }, 3500)

    try {
      // Step 1: Analyze person B
      const reportB = await withHardTimeout(
        callApi<Record<string, unknown>>('/api/analyze', { doubanId: doubanIdB.trim() }),
        130000,
        '分析对方数据'
      )

      const reportBId = typeof (reportB as any).id === 'string' ? ((reportB as any).id as string) : ''
      if (reportBId) setReport(reportBId, reportB)

      setProgressIdx(4)

      const bBookCount = (reportB as any).realCounts?.books || (reportB as any).bookCount || (reportB as any).input?.books?.length || 0
      const bMovieCount = (reportB as any).realCounts?.movies || (reportB as any).movieCount || (reportB as any).input?.movies?.length || 0
      const bMusicCount = (reportB as any).realCounts?.music || (reportB as any).musicCount || (reportB as any).input?.music?.length || 0

      // Step 2: Comparison
      const result = await withHardTimeout(callApi<Record<string, unknown>>('/api/compare', {
        doubanIdA: myDoubanId || undefined,
        doubanIdB: (reportB as any).doubanId || (reportB as any).input?.doubanId || doubanIdB.trim(),
        personA: {
          name: myReport.doubanName || myReport.input?.doubanId || '你',
          mbtiType: myReport.mbti.type,
          mbtiTitle: myReport.mbti.title,
          dimensions: myReport.mbti.dimensions,
          radarData: myReport.radarData,
          summary: myReport.summary,
          roast: myReport.roast,
          bookTitles: (myReport.input?.books ?? []).slice(0, 30).map((b: any) => b.title),
          movieTitles: (myReport.input?.movies ?? []).slice(0, 30).map((m: any) => m.title),
          musicTitles: (myReport.input?.music ?? []).slice(0, 30).map((m: any) => m.title),
          bookCount: myBookCount,
          movieCount: myMovieCount,
          musicCount: myMusicCount,
        },
        personB: {
          name: (reportB as any).doubanName || doubanIdB.trim(),
          mbtiType: (reportB as any).mbti.type,
          mbtiTitle: (reportB as any).mbti.title,
          dimensions: (reportB as any).mbti.dimensions,
          radarData: (reportB as any).radarData,
          summary: (reportB as any).summary,
          roast: (reportB as any).roast,
          bookTitles: ((reportB as any).input?.books ?? []).slice(0, 30).map((b: any) => b.title),
          movieTitles: ((reportB as any).input?.movies ?? []).slice(0, 30).map((m: any) => m.title),
          musicTitles: ((reportB as any).input?.music ?? []).slice(0, 30).map((m: any) => m.title),
          bookCount: bBookCount,
          movieCount: bMovieCount,
          musicCount: bMusicCount,
        },
      }), 100000, '生成对比报告')

      setCompare(result.compareId as string, result)
      recordCompareUsage(myDoubanId)
      const qs = [`id=${result.compareId}`, `from=${fromId}`]
      if (reportBId) qs.push(`to=${reportBId}`)
      Taro.navigateTo({ url: `/pages/compare-result/index?${qs.join('&')}` })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '对比失败'
      const hint = /(超时|timeout|fail|网络|连接)/i.test(msg)
        ? '（分析对方数据约 30-60 秒，国内网络建议开启 VPN 后重试）'
        : ''
      setError(msg + hint)
    } finally {
      if (timerRef.current) clearInterval(timerRef.current)
      setIsLoading(false)
    }
  }, [doubanIdB, fromId])

  if (!fromId) {
    return (
      <View className='compare-page center-page'>
        <Text className='big-emoji'>👥</Text>
        <Text className='page-title'>品味双人对比</Text>
        <Text className='page-desc'>请先测试自己的书影音 MBTI，然后从结果页发起对比</Text>
        <View
          className='btn-primary'
          onClick={() => Taro.navigateTo({ url: '/pages/upload/index' })}
        >
          <Text className='btn-text'>先测测自己</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='compare-page center-page'>
      <View className='compare-container'>
        <View className='header animate-fade-in-up'>
          <Text className='big-emoji'>👥</Text>
          <Text className='page-title'>品味双人对比</Text>
          <Text className='page-desc'>
            {myName ? `${myName}，` : ''}输入对方的豆瓣 ID{'\n'}看看你们的书影音 MBTI 有多配
          </Text>
        </View>

        {!isLoading && (
          <View className='input-section animate-fade-in-up animate-delay-100'>
            <Input
              className='id-input'
              value={doubanIdB}
              onInput={e => {
                setDoubanIdB(e.detail.value)
                setError(null)
              }}
              onConfirm={handleCompare}
              placeholder='对方的豆瓣 ID 或主页链接'
              placeholderClass='placeholder'
            />

            <View
              className={`btn-primary ${!doubanIdB.trim() ? 'disabled' : ''}`}
              onClick={handleCompare}
            >
              <Text className='btn-text'>开始对比</Text>
            </View>

            {error && (
              <View className='error-box'>
                <Text className='error-text'>{error}</Text>
                <View
                  className='btn-retry'
                  onClick={() => { setError(null); handleCompare() }}
                >
                  <Text className='btn-retry-text'>点击重试</Text>
                </View>
              </View>
            )}

            <View className='card-glass hint-card'>
              <Text className='hint-text'>
                对方的豆瓣标记需为公开 · 分析约需 40-90 秒
              </Text>
              <Text className='hint-sub'>国内网络可能较慢，建议开启 VPN 后使用</Text>
              {(() => {
                try {
                  const stored = getReport(fromId)
                  const r = stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : null
                  const dId = r?.input?.doubanId || r?.doubanId
                  if (canCompareForFree(dId)) {
                    const rem = getRemainingFreeCompares(dId)
                    return <Text className='hint-sub'>免费对比剩余 {rem} 次{rem === '∞' ? '' : '（每人 1 次）'}</Text>
                  }
                } catch {}
                return <Text className='hint-sub hint-paid'>免费次数已用完</Text>
              })()}
            </View>
          </View>
        )}

        {isLoading && (
          <View className='loading-section animate-fade-in-up'>
            <View className='spinner-container'>
              <View className='spinner-bg' />
              <View className='spinner-ring animate-spin' />
              <Text className='spinner-icon'>👥</Text>
            </View>
            <View className='progress-info'>
              <Text className='progress-text'>{PROGRESS_MESSAGES[progressIdx]}</Text>
              <View className='progress-bar-bg'>
                <View
                  className='progress-bar-fill accent-gradient'
                  style={{ width: `${((progressIdx + 1) / PROGRESS_MESSAGES.length) * 100}%` }}
                />
              </View>
              <Text className='progress-sub'>
                正在对比 {myName || '你'} 与 {doubanIdB} 的品味...
              </Text>
            </View>
          </View>
        )}
      </View>

      {showPaywall && (
        <View className='paywall-overlay' onClick={() => setShowPaywall(false)}>
          <View className='paywall-card paywall-simple' onClick={e => e.stopPropagation()}>
            <Text className='paywall-icon'>🔒</Text>
            <Text className='paywall-title'>对比次数已用完</Text>
            <Text className='paywall-desc'>
              每人 1 次免费额度，你已使用
            </Text>
            <Text className='paywall-tip-cta'>觉得有意思？在结果页底部可赞赏支持作者 ☕</Text>
            <View className='paywall-close' onClick={() => setShowPaywall(false)}>
              <Text className='paywall-close-text'>知道了</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
