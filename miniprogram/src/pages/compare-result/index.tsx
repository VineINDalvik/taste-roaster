import { useEffect, useState, useCallback, useRef } from 'react'
import { View, Text, Canvas } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import DualRadar from '@/components/dual-radar'
import { getCompare } from '@/utils/storage'
import type { CompareData, PersonData, ComparisonData, MBTIDimension } from '@/utils/types'
import './index.scss'

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
  const router = useRouter()
  const id = router.params.id || ''
  const [data, setData] = useState<CompareData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = getCompare(id)
    if (stored) {
      try {
        setData(typeof stored === 'string' ? JSON.parse(stored) : stored)
      } catch {
        setError('对比数据损坏')
      }
    } else {
      setError('对比报告不存在')
    }
  }, [id])

  if (error || !data) {
    return (
      <View className='compare-result-page center-page'>
        <Text className='error-emoji'>😵</Text>
        <Text className='error-msg'>{error || '加载中...'}</Text>
        <View className='btn-small accent-gradient' onClick={() => Taro.navigateTo({ url: '/pages/upload/index' })}>
          <Text className='btn-action-text'>重新测试</Text>
        </View>
      </View>
    )
  }

  const { personA, personB, comparison } = data
  const matchColor = getMatchColor(comparison.matchScore)

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
          <CompareCard personA={personA} personB={personB} comparison={comparison} />
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
        {comparison.recommendTogether.length > 0 && (
          <View className='section-card card-glass animate-fade-in-up animate-delay-300'>
            <Text className='section-title text-red'>💡 推荐你们一起</Text>
            <View className='rec-list'>
              {comparison.recommendTogether.map((rec, i) => (
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

function CompareCard({
  personA,
  personB,
  comparison,
}: {
  personA: PersonData
  personB: PersonData
  comparison: ComparisonData
}) {
  const matchColor = getMatchColor(comparison.matchScore)

  const handleSave = useCallback(async () => {
    try {
      Taro.showLoading({ title: '生成中...' })
      const query = Taro.createSelectorQuery()
      query.select('#compareCardCanvas')
        .fields({ node: true, size: true })
        .exec(async (res) => {
          if (!res?.[0]?.node) {
            Taro.hideLoading()
            return
          }
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const w = 600
          const h = 500
          const dpr = 2
          canvas.width = w * dpr
          canvas.height = h * dpr
          ctx.scale(dpr, dpr)

          drawCompareCard(ctx, w, h, personA, personB, comparison, matchColor)

          setTimeout(() => {
            Taro.canvasToTempFilePath({
              canvas, width: w * dpr, height: h * dpr,
              destWidth: w * dpr, destHeight: h * dpr,
              fileType: 'png',
              success: (result) => {
                Taro.hideLoading()
                Taro.saveImageToPhotosAlbum({
                  filePath: result.tempFilePath,
                  success: () => Taro.showToast({ title: '已保存到相册', icon: 'success' }),
                  fail: () => Taro.showToast({ title: '请授权相册权限', icon: 'none' }),
                })
              },
              fail: () => { Taro.hideLoading(); Taro.showToast({ title: '生成失败', icon: 'error' }) },
            })
          }, 200)
        })
    } catch {
      Taro.hideLoading()
    }
  }, [personA, personB, comparison, matchColor])

  const handleCopy = useCallback(() => {
    Taro.setClipboardData({
      data: `${personA.name}(${personA.mbtiType}) vs ${personB.name}(${personB.mbtiType}) 匹配度 ${comparison.matchScore}%！来测测你们的书影音 MBTI`,
    })
  }, [personA, personB, comparison])

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

      <Canvas
        type='2d'
        id='compareCardCanvas'
        canvasId='compareCardCanvas'
        className='canvas-hidden'
        style={{ width: '600px', height: '500px' }}
      />

      <View className='cc-actions'>
        <View className='btn-save' onClick={handleSave}>
          <Text className='btn-action-text'>保存卡片</Text>
        </View>
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

function drawCompareCard(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  pA: PersonData, pB: PersonData, comp: ComparisonData, matchColor: string
) {
  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#0f0c29')
  bg.addColorStop(0.3, '#1a1a2e')
  bg.addColorStop(0.6, '#16213e')
  bg.addColorStop(1, '#0f3460')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  let y = 40
  ctx.textAlign = 'center'
  ctx.fillStyle = '#6b7280'
  ctx.font = '12px sans-serif'
  ctx.fillText('品味双人对比', w / 2, y)
  y += 50

  // Person A
  ctx.font = 'bold 32px sans-serif'
  ctx.fillStyle = '#667eea'
  ctx.fillText(pA.mbtiType, w / 4, y)

  // Score
  ctx.font = 'bold 40px sans-serif'
  ctx.fillStyle = matchColor
  ctx.fillText(String(comp.matchScore), w / 2, y)

  // Person B
  ctx.font = 'bold 32px sans-serif'
  ctx.fillStyle = '#e94560'
  ctx.fillText(pB.mbtiType, (w * 3) / 4, y)

  y += 25
  ctx.font = '11px sans-serif'
  ctx.fillStyle = '#9ca3af'
  ctx.fillText(pA.name, w / 4, y)
  ctx.fillText('match', w / 2, y)
  ctx.fillText(pB.name, (w * 3) / 4, y)

  y += 18
  ctx.font = '10px sans-serif'
  ctx.fillStyle = '#6b7280'
  ctx.fillText(pA.mbtiTitle, w / 4, y)
  ctx.fillText(pB.mbtiTitle, (w * 3) / 4, y)

  y += 30
  ctx.fillStyle = matchColor
  ctx.font = '13px sans-serif'
  ctx.fillText(comp.matchTitle, w / 2, y)

  y += 30
  ctx.fillStyle = '#9ca3af'
  ctx.font = '12px sans-serif'
  const overview = comp.overview.slice(0, 80) + (comp.overview.length > 80 ? '...' : '')
  ctx.fillText(overview, w / 2, y)

  y = h - 30
  ctx.fillStyle = '#4b5563'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(getMatchLabel(comp.matchScore), 20, y)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#667eea'
  ctx.fillText('测测你们的书影音 MBTI →', w - 20, y)
}
