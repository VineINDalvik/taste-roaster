import { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter, useShareAppMessage, getCurrentInstance } from '@tarojs/taro'
import DualRadar from '@/components/dual-radar'
import { getCompare, setCompare } from '@/utils/storage'
import { callApi } from '@/utils/api'
import CompareShareCard from '@/components/compare-share-card'
import type { CompareData, PersonData, ComparisonData, MBTIDimension } from '@/utils/types'
import './index.scss'

/** 兼容 Taro 在小程序首次渲染时 useRouter 返回空 params 的时序问题 */
function useCompareResultId(): string {
  const router = useRouter()
  const instance = getCurrentInstance()
  return useMemo(() => {
    const fromRouter = router?.params?.id
    if (fromRouter) return fromRouter
    const fromInstance = (instance?.router?.params as Record<string, string> | undefined)?.id
    if (fromInstance) return fromInstance
    try {
      const pages = Taro.getCurrentPages()
      const page = pages?.[pages.length - 1] as { options?: Record<string, string> } | undefined
      return page?.options?.id ?? ''
    } catch {
      return ''
    }
  }, [router?.params?.id, instance?.router?.params])
}

const DIM_KEYS = ['ie', 'ns', 'tf', 'jp'] as const
const DIM_LABELS: Record<string, [string, string]> = {
  ie: ['I', 'E'],
  ns: ['N', 'S'],
  tf: ['T', 'F'],
  jp: ['J', 'P'],
}

function getMatchColor(score: number) {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#667eea'
  if (score >= 40) return '#f5c518'
  return '#e94560'
}

function getMatchLabel(score: number) {
  if (score >= 90) return '灵魂伴侣'
  if (score >= 70) return '品味知己'
  if (score >= 50) return '互补搭档'
  if (score >= 30) return '平行世界'
  return '文化反义词'
}

export default function CompareResultPage() {
  const id = useCompareResultId()
  const [data, setData] = useState<CompareData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(() => {
    if (!id) {
      setError('缺少对比 ID')
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)

    const stored = getCompare(id)
    if (stored) {
      try {
        const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored
        if (parsed?.personA && parsed?.personB && parsed?.comparison) {
          setData(parsed)
          setLoading(false)
          return
        }
      } catch {
        setError('对比数据损坏')
        setLoading(false)
        return
      }
    }

    callApi<CompareData>(`/api/compare/${id}`, undefined, 'GET', { timeout: 15000 })
      .then(remote => {
        if (remote?.personA && remote?.personB && remote?.comparison) {
          setData(remote)
          setCompare(id, remote)
        } else {
          setError('对比报告数据不完整')
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : ''
        const isNetwork = /(超时|timeout|fail|网络|连接|域名)/i.test(msg)
        setError(isNetwork ? '网络请求失败，请检查网络后重试' : '对比报告不存在或已过期')
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (error || !data) {
    const showLoading = loading && !error
    return (
      <View className='compare-result-page center-page'>
        <Text className='error-emoji'>😵</Text>
        <Text className='error-msg'>{error || (showLoading ? '加载中...' : '加载失败')}</Text>
        <View className='error-actions'>
          {error ? (
            <View className='btn-small accent-gradient' onClick={loadData}>
              <Text className='btn-action-text'>重试加载</Text>
            </View>
          ) : null}
          <View className='btn-small accent-gradient' onClick={() => Taro.navigateTo({ url: '/pages/upload/index' })}>
            <Text className='btn-action-text'>重新测试</Text>
          </View>
        </View>
      </View>
    )
  }

  const { personA, personB, comparison } = data

  useShareAppMessage(() => ({
    title: `${personA.name}(${personA.mbtiType}) vs ${personB.name}(${personB.mbtiType}) 匹配度 ${comparison.matchScore}%！来测测你们的书影音 MBTI`,
    path: `/pages/compare-result/index?id=${id}`,
  }))

  return (
    <View className='compare-result-page'>
      <View className='cr-container'>
        <Text
          className='nav-back'
          onClick={() => Taro.navigateTo({ url: '/pages/upload/index' })}
        >
          ← 返回
        </Text>

        {/* Match Score Hero Card */}
        <View className='animate-fade-in-up'>
          <CompareCard compareId={id} personA={personA} personB={personB} comparison={comparison} />
        </View>

        {/* Dimension Comparison */}
        <View className='section-card card-glass animate-fade-in-up animate-delay-100'>
          <Text className='section-title text-blue'>🧬 四维度对比</Text>
          {DIM_KEYS.map(key => (
            <DualDimensionBar
              key={key}
              dimKey={key}
              dimA={personA.dimensions[key]}
              dimB={personB.dimensions[key]}
              nameA={personA.name}
              nameB={personB.name}
            />
          ))}
        </View>

        {/* Dual Radar */}
        <View className='section-card card-glass animate-fade-in-up animate-delay-100'>
          <Text className='section-title text-blue'>📊 品味雷达对比</Text>
          <DualRadar
            dataA={personA.radarData}
            dataB={personB.radarData}
            nameA={personA.name}
            nameB={personB.name}
          />
        </View>

        {/* Overview */}
        <View className='section-card card-glass animate-fade-in-up animate-delay-200'>
          <Text className='section-title text-red'>💡 匹配解读</Text>
          <Text className='section-content'>{comparison.overview}</Text>
        </View>

        {/* Similarities */}
        <View className='section-card card-glass animate-fade-in-up animate-delay-200'>
          <Text className='section-title text-green'>✅ 相同点</Text>
          {comparison.similarities.map((s, i) => (
            <View key={i} className='point-item'>
              <Text className='point-title'>{s.point}</Text>
              <Text className='point-detail'>{s.detail}</Text>
            </View>
          ))}
        </View>

        {/* Differences */}
        <View className='section-card card-glass animate-fade-in-up animate-delay-200'>
          <Text className='section-title text-red'>⚡ 不同点</Text>
          {comparison.differences.map((d, i) => (
            <View key={i} className='point-item'>
              <Text className='point-title'>{d.point}</Text>
              <Text className='point-detail'>{d.detail}</Text>
            </View>
          ))}
        </View>

        {/* Chemistry */}
        <View className='section-card card-glass animate-fade-in-up animate-delay-200'>
          <Text className='section-title text-yellow'>⚗️ 化学反应</Text>
          <Text className='section-content'>{comparison.chemistry}</Text>
        </View>

        {/* 趣味彩蛋 */}
        {(comparison.roastOneLiner || comparison.dateScene || comparison.dangerZone || comparison.memeLine || comparison.battleVerdict) && (
          <View className='section-card card-glass animate-fade-in-up animate-delay-200'>
            <Text className='section-title text-purple'>🎯 趣味彩蛋</Text>
            {comparison.roastOneLiner && (
              <View className='fun-item'>
                <Text className='fun-label'>毒舌吐槽</Text>
                <Text className='fun-content italic'>"{comparison.roastOneLiner}"</Text>
              </View>
            )}
            {comparison.dateScene && (
              <View className='fun-item'>
                <Text className='fun-label'>最配的约会</Text>
                <Text className='fun-content green'>💕 {comparison.dateScene}</Text>
              </View>
            )}
            {comparison.dangerZone && (
              <View className='fun-item'>
                <Text className='fun-label'>危险雷区</Text>
                <Text className='fun-content red'>⚠️ {comparison.dangerZone}</Text>
              </View>
            )}
            {comparison.battleVerdict && (
              <View className='fun-item'>
                <Text className='fun-label'>品味战报</Text>
                <Text className='fun-content blue'>🏆 {comparison.battleVerdict}</Text>
              </View>
            )}
            {comparison.memeLine && (
              <View className='fun-item fun-meme'>
                <Text className='fun-label'>分享梗句</Text>
                <Text className='fun-content meme'>"{comparison.memeLine}"</Text>
              </View>
            )}
          </View>
        )}

        {/* Shared Works */}
        {comparison.sharedWorks.length > 0 && (
          <View className='section-card card-glass animate-fade-in-up animate-delay-200'>
            <Text className='section-title text-blue'>🔗 品味交集</Text>
            <Text className='section-sub'>你们都看过/读过/听过的作品</Text>
            <View className='tags-wrap'>
              {comparison.sharedWorks.map((w, i) => (
                <Text key={i} className='tag-item'>{w}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Recommend Together */}
        {(comparison.recommendTogether?.length ?? 0) > 0 && (
          <View className='section-card card-glass animate-fade-in-up animate-delay-300'>
            <Text className='section-title text-red'>💡 推荐你们一起</Text>
            <View className='rec-list'>
              {(comparison.recommendTogether ?? []).map((rec, i) => (
                <View
                  key={i}
                  className='rec-item'
                  onClick={() => {
                    const typeMap: Record<string, string> = { book: 'book', movie: 'movie', music: 'music' }
                    const url = `https://search.douban.com/${typeMap[rec.type] || 'movie'}/subject_search?search_text=${encodeURIComponent(rec.title)}`
                    Taro.setClipboardData({ data: url })
                  }}
                >
                  <View className='rec-icon'>
                    <Text>{rec.type === 'book' ? '📖' : rec.type === 'movie' ? '🎬' : '🎵'}</Text>
                  </View>
                  <View className='rec-info'>
                    <Text className='rec-title'>{rec.title}</Text>
                    <Text className='rec-reason'>{rec.reason}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Stats comparison */}
        <View className='section-card card-glass animate-fade-in-up animate-delay-300'>
          <Text className='section-title text-blue'>📊 数据对比</Text>
          <View className='stats-compare'>
            <View className='stats-person'>
              <Text className='stats-name'>{personA.name}</Text>
              <Text className='stats-nums'>📚{personA.bookCount} 🎬{personA.movieCount} 🎵{personA.musicCount}</Text>
            </View>
            <View className='stats-person'>
              <Text className='stats-name'>{personB.name}</Text>
              <Text className='stats-nums'>📚{personB.bookCount} 🎬{personB.movieCount} 🎵{personB.musicCount}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className='page-footer animate-fade-in-up animate-delay-300'>
          <View
            className='btn-small card-glass'
            onClick={() => Taro.navigateTo({ url: '/pages/upload/index' })}
          >
            <Text className='btn-action-text'>测测另一个人</Text>
          </View>
          <Text className='footer-text'>豆瓣书影音 MBTI · 品味即人格</Text>
        </View>
      </View>
    </View>
  )
}

const VERCEL_BASE = 'https://db-mbti.vinex.top'

function CompareCard({
  compareId,
  personA,
  personB,
  comparison,
}: {
  compareId: string
  personA: PersonData
  personB: PersonData
  comparison: ComparisonData
}) {
  const matchColor = getMatchColor(comparison.matchScore)

  const handleCopy = useCallback(() => {
    const shareUrl = `${VERCEL_BASE}/compare/${compareId}`
    Taro.setClipboardData({
      data: shareUrl,
      success: () => Taro.showToast({ title: '链接已复制', icon: 'success' }),
      fail: () => Taro.showToast({ title: '复制失败', icon: 'none' }),
    })
  }, [compareId])

  return (
    <View className='compare-card-wrap'>
      <View className='compare-card'>
        <View className='cc-glow-1' />
        <View className='cc-glow-2' />
        <View className='cc-content'>
          <Text className='cc-label'>品味双人对比</Text>

          <View className='cc-vs'>
            <View className='cc-person'>
              <Text className='cc-type' style={{ color: '#667eea' }}>{personA.mbtiType}</Text>
              <Text className='cc-name'>{personA.name}</Text>
              <Text className='cc-title-sub'>{personA.mbtiTitle}</Text>
            </View>
            <View className='cc-score-col'>
              <Text className='cc-score' style={{ color: matchColor }}>{comparison.matchScore}</Text>
              <Text className='cc-match-label'>match</Text>
            </View>
            <View className='cc-person'>
              <Text className='cc-type' style={{ color: '#e94560' }}>{personB.mbtiType}</Text>
              <Text className='cc-name'>{personB.name}</Text>
              <Text className='cc-title-sub'>{personB.mbtiTitle}</Text>
            </View>
          </View>

          <View className='cc-match-badge' style={{
            background: `${matchColor}15`,
            borderColor: `${matchColor}30`,
          }}>
            <Text style={{ color: matchColor, fontSize: '22rpx', fontWeight: '500' as any }}>
              {comparison.matchTitle}
            </Text>
          </View>

          <Text className='cc-overview'>{comparison.overview}</Text>

          <View className='cc-footer'>
            <Text className='cc-footer-left'>{getMatchLabel(comparison.matchScore)}</Text>
            <Text className='cc-footer-right'>测测你们的书影音 MBTI →</Text>
          </View>
        </View>
      </View>

      <View className='cc-actions'>
        <CompareShareCard
          personA={personA}
          personB={personB}
          comparison={comparison}
          renderTrigger={(onSave) => (
            <View className='btn-save' onClick={onSave}>
              <Text className='btn-action-text'>保存卡片</Text>
            </View>
          )}
        />
        <View className='btn-copy' onClick={handleCopy}>
          <Text className='btn-action-text'>复制链接</Text>
        </View>
      </View>
    </View>
  )
}

function DualDimensionBar({
  dimKey, dimA, dimB, nameA, nameB,
}: {
  dimKey: string; dimA: MBTIDimension; dimB: MBTIDimension; nameA: string; nameB: string
}) {
  const [leftLetter, rightLetter] = DIM_LABELS[dimKey] ?? ['?', '?']
  const isALeft = dimA.letter === leftLetter
  const isBLeft = dimB.letter === leftLetter
  const posA = isALeft ? 50 - dimA.score / 2 : 50 + dimA.score / 2
  const posB = isBLeft ? 50 - dimB.score / 2 : 50 + dimB.score / 2

  return (
    <View className='dual-dim'>
      <View className='dual-dim-labels'>
        <Text className='dual-dim-letter'>{leftLetter}</Text>
        <Text className='dual-dim-letter'>{rightLetter}</Text>
      </View>
      <View className='dual-dim-track'>
        <View className='dual-dim-center' />
        <View className='dual-dim-dot' style={{ left: `${posA}%`, background: '#667eea', boxShadow: '0 0 8rpx rgba(102,126,234,0.4)' }} />
        <View className='dual-dim-dot' style={{ left: `${posB}%`, background: '#e94560', boxShadow: '0 0 8rpx rgba(233,69,96,0.4)' }} />
      </View>
      <View className='dual-dim-info'>
        <Text className='dual-dim-name-a'>{nameA}: {dimA.letter}{dimA.score}%</Text>
        <Text className='dual-dim-name-b'>{nameB}: {dimB.letter}{dimB.score}%</Text>
      </View>
    </View>
  )
}
