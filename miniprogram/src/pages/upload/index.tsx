import { useState, useRef, useCallback } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { callApi } from '@/utils/api'
import { setReport } from '@/utils/storage'
import './index.scss'

const PROGRESS_MESSAGES = [
  '正在潜入ta的豆瓣主页...',
  '采样ta读过的书...',
  '采样ta看过的电影...',
  '采样ta听过的音乐...',
  'AI 正在分析 MBTI 四维度...',
  '从品味中推导人格类型...',
  '生成书影音 MBTI 报告...',
  '报告即将生成完毕...',
]

const FUN_FACTS = [
  '豆瓣用户平均标记过 237 部电影',
  'INTJ 是豆瓣上最常见的书影音 MBTI',
  '豆瓣评分最集中的区间是 7.0-8.0',
  '听音乐最多的 MBTI 类型是 INFP',
  '看电影数量 Top 1% 的用户平均看了 3000+ 部',
  '书影音品味最「杂食」的 MBTI 是 ENFP',
]

export default function UploadPage() {
  const [doubanId, setDoubanId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressIdx, setProgressIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [funFact, setFunFact] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const elapsedRef = useRef<ReturnType<typeof setInterval>>()

  const handleOpenDouban = useCallback(() => {
    Taro.showModal({
      title: '前往豆瓣复制 ID',
      content: '1. 打开豆瓣 App\n2. 进入「我的」页面\n3. 点击头像进入个人主页\n4. 复制地址栏中的 ID\n5. 回来粘贴到输入框',
      confirmText: '我知道了',
      showCancel: false,
    })
  }, [])

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (elapsedRef.current) clearInterval(elapsedRef.current)
  }, [])

  const handleAnalyze = useCallback(async () => {
    const id = doubanId.trim()
    if (!id) return

    setIsLoading(true)
    setError(null)
    setProgressIdx(0)
    setElapsed(0)
    setFunFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)])

    timerRef.current = setInterval(() => {
      setProgressIdx(prev => (prev < PROGRESS_MESSAGES.length - 1 ? prev + 1 : prev))
      if (Math.random() < 0.4) {
        setFunFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)])
      }
    }, 4000)

    elapsedRef.current = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)

    try {
      const result = await callApi<Record<string, unknown>>(
        '/api/analyze',
        { doubanId: id }
      )

      if (!result || !result.id) {
        throw new Error('分析失败，返回数据异常')
      }

      setReport(result.id as string, result)
      Taro.navigateTo({ url: `/pages/result/index?id=${result.id}` })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '分析失败'
      if (msg.includes('timeout') || msg.includes('超时')) {
        setError('请求超时，豆瓣服务器响应较慢，请稍后重试')
      } else {
        setError(msg)
      }
    } finally {
      clearTimers()
      setIsLoading(false)
    }
  }, [doubanId, clearTimers])

  return (
    <View className='upload-page'>
      <View className='upload-container'>
        {/* Header */}
        <View className='header animate-fade-in-up'>
          <Text className='title'>开始品味鉴定</Text>
          <Text className='subtitle'>
            AI 将采样你的公开书影音数据{'\n'}推导你的书影音 MBTI
          </Text>
        </View>

        {/* Input section */}
        {!isLoading && (
          <View className='input-section animate-fade-in-up animate-delay-100'>
            {/* Mode 1: Open Douban */}
            <View className='mode-card card-glass' onClick={handleOpenDouban}>
              <View className='mode-header'>
                <Text className='mode-icon'>📱</Text>
                <View className='mode-text'>
                  <Text className='mode-title'>从豆瓣 App 获取 ID</Text>
                  <Text className='mode-desc'>打开豆瓣 → 复制个人主页 ID → 回来粘贴</Text>
                </View>
              </View>
              <Text className='mode-arrow'>→</Text>
            </View>

            {/* Divider */}
            <View className='divider-row'>
              <View className='divider-line' />
              <Text className='divider-text'>或直接输入</Text>
              <View className='divider-line' />
            </View>

            {/* Mode 2: Manual Input */}
            <View className='input-wrapper'>
              <Input
                className='id-input'
                value={doubanId}
                onInput={e => {
                  setDoubanId(e.detail.value)
                  setError(null)
                }}
                onConfirm={handleAnalyze}
                placeholder='豆瓣 ID 或个人主页链接'
                placeholderClass='placeholder'
              />
            </View>

            <View
              className={`btn-primary ${!doubanId.trim() ? 'disabled' : ''}`}
              onClick={handleAnalyze}
            >
              <Text className='btn-text'>开始鉴定</Text>
            </View>

            {error && (
              <View className='error-box'>
                <Text className='error-text'>{error}</Text>
                <View className='retry-btn' onClick={handleAnalyze}>
                  <Text className='retry-text'>点击重试</Text>
                </View>
              </View>
            )}

            {/* Privacy notice */}
            <View className='privacy-notice'>
              <Text className='privacy-lock'>🔒</Text>
              <Text className='privacy-text'>
                数据不留存 · 仅读取公开标记做一次性分析 · 分析完即销毁
              </Text>
            </View>

            {/* Help */}
            <View className='help-card card-glass'>
              <Text className='help-title'>如何找到你的豆瓣 ID？</Text>
              <Text className='help-item'>
                · 打开豆瓣 App → 我的 → 个人主页 → URL 中的数字或英文即为 ID
              </Text>
              <Text className='help-item'>
                · 例如：douban.com/people/ahbei/ 中的 ahbei
              </Text>
              <Text className='help-item'>· 也可以直接粘贴完整的个人主页链接</Text>
              <Text className='help-item'>· 需要对方的主页和标记为公开状态</Text>
            </View>
          </View>
        )}

        {/* Loading state */}
        {isLoading && (
          <View className='loading-section animate-fade-in-up'>
            <View className='spinner-container'>
              <View className='spinner-bg' />
              <View className='spinner-ring animate-spin' />
              <Text className='spinner-icon'>🔍</Text>
            </View>

            <View className='progress-info'>
              <Text className='progress-text'>
                {PROGRESS_MESSAGES[progressIdx]}
              </Text>
              <View className='progress-bar-bg'>
                <View
                  className='progress-bar-fill accent-gradient'
                  style={{
                    width: `${((progressIdx + 1) / PROGRESS_MESSAGES.length) * 100}%`,
                  }}
                />
              </View>
              <Text className='progress-sub'>
                正在分析 {doubanId} 的品味数据... ({elapsed}s)
              </Text>
              {elapsed > 20 && (
                <Text className='progress-patience'>
                  ⏳ 数据量较大，请耐心等待
                </Text>
              )}
              <View className='fun-fact-box'>
                <Text className='fun-fact'>💡 {funFact}</Text>
              </View>
              <Text className='privacy-reminder'>
                🔒 数据仅用于本次分析，不会被存储或用于其他用途
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
