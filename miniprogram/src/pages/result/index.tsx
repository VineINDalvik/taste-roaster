import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro, { useRouter, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import ShareCard from '@/components/share-card'
import EvolutionCurve from '@/components/evolution-curve'
import MusicEmotionPortrait from '@/components/music-emotion'
import { callApi } from '@/utils/api'
import { getReport, setReport } from '@/utils/storage'
import type { ReportData, RecommendationItem, MonthSnapshot, MBTIDimension, EvolutionPoint, MusicEmotion } from '@/utils/types'
import './index.scss'

const ENABLE_PAID_DEEP = false

const UNLOCK_MESSAGES = [
  '深入解读你的文化人格...',
  '分析跨领域品味关联...',
  '挖掘你的品味盲区...',
  '生成专属推荐（排除已读）...',
  'AI 正在写深度人格画像...',
  '快好了，最后的打磨...',
]

const FUN_FACTS = [
  'INTJ 是豆瓣上最常见的书影音 MBTI——理性派果然爱数据',
  '数据显示：ENFP 用户的书影音品类最杂食',
  'INFJ 用户平均每部电影写的短评最长',
  '看文艺片多的人80%测出来是 xNxP',
  '音乐品味是四个维度中最能区分 T/F 的',
  'ISTP 用户偏好硬科幻和推理的概率最高',
]

function deriveMbtiType(dims: ReportData['mbti']['dimensions']): string {
  return (dims.ie.letter + dims.ns.letter + dims.tf.letter + dims.jp.letter).toUpperCase()
}

function fixMbtiInText(
  text: string | undefined,
  aiType: string | undefined,
  correctType: string
): string {
  if (!text) return ''
  if (!aiType || aiType === correctType) return text
  return text.replaceAll(aiType, correctType).replaceAll(aiType.toLowerCase(), correctType)
}

export default function ResultPage() {
  const router = useRouter()
  const id = router.params.id || ''
  const [report, setReportState] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanding, setExpanding] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [unlockStep, setUnlockStep] = useState(0)
  const [funFact, setFunFact] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const stepRef = useRef<ReturnType<typeof setInterval>>()

  const [evolutionData] = useState<EvolutionPoint[]>([])
  const [musicEmotions] = useState<MusicEmotion[]>([])

  const mbtiType = useMemo(() => {
    if (!report?.mbti?.dimensions) return report?.mbti?.type || '????'
    return deriveMbtiType(report.mbti.dimensions)
  }, [report?.mbti])

  const aiType = report?.mbti?.type
  const ft = useCallback(
    (text: string | undefined) => fixMbtiInText(text, aiType, mbtiType),
    [aiType, mbtiType]
  )

  const isDeepUnlocked = !!(report?.personality || report?.crossDomain || report?.blindSpots)
  const hasExpandContent = !!(report?.bookAnalysis || report?.movieAnalysis)
  const hasTimeline = !!(report?.timelineMonths?.length)

  useShareAppMessage(() => ({
    title: `我的书影音 MBTI 是 ${mbtiType}，快来测测你的！`,
    path: `/pages/index/index`,
  }))

  useShareTimeline(() => ({
    title: `我的书影音 MBTI 是 ${mbtiType}，快来测测你的！`,
  }))

  useEffect(() => {
    Taro.showShareMenu({ withShareTicket: true, showShareItems: ['shareAppMessage', 'shareTimeline'] })
  }, [])

  useEffect(() => {
    const stored = getReport(id)
    if (stored) {
      try {
        setReportState(typeof stored === 'string' ? JSON.parse(stored) : stored)
      } catch {
        setError('报告数据损坏')
      }
    } else {
      setError('报告不存在，请重新生成')
    }
    setLoading(false)
  }, [id])

  const handleLoadExpand = useCallback(async () => {
    if (!report?.input || !report?.mbti?.type || expanding) return
    setExpanding(true)

    try {
      const data = await callApi<Record<string, unknown>>(`/api/expand/${id}`, {
        id: report.id,
        input: report.input as unknown as Record<string, unknown>,
        mbti: report.mbti as unknown as Record<string, unknown>,
        roast: report.roast,
        summary: report.summary,
        radarData: report.radarData as unknown as Record<string, unknown>,
      })

      setReportState(prev => {
        if (!prev) return prev
        const updated = {
          ...prev,
          bookAnalysis: (data.bookAnalysis as string) || prev.bookAnalysis,
          movieAnalysis: (data.movieAnalysis as string) || prev.movieAnalysis,
          musicAnalysis: (data.musicAnalysis as string) || prev.musicAnalysis,
          timelineMonths: (data.timelineMonths as MonthSnapshot[])?.length
            ? (data.timelineMonths as MonthSnapshot[])
            : prev.timelineMonths,
          timelineText: (data.timelineText as string) || prev.timelineText,
        }
        setReport(id, updated)
        return updated
      })
    } catch {
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' })
    } finally {
      setExpanding(false)
    }
  }, [report, id, expanding])

  const startDeepAnalysis = useCallback(async () => {
    if (!report?.input) return

    setShowShareModal(false)
    setUnlocking(true)
    setUnlockStep(0)
    setFunFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)])

    stepRef.current = setInterval(() => {
      setUnlockStep(prev => (prev < UNLOCK_MESSAGES.length - 1 ? prev + 1 : prev))
      if (Math.random() < 0.3) {
        setFunFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)])
      }
    }, 3000)

    try {
      const data = await callApi<Record<string, unknown>>(`/api/share-unlock/${id}`, {
        id: report.id,
        input: report.input as unknown as Record<string, unknown>,
        mbti: report.mbti as unknown as Record<string, unknown>,
        roast: report.roast,
        summary: report.summary,
        radarData: report.radarData as unknown as Record<string, unknown>,
      })

      const updated: ReportData = {
        ...report,
        crossDomain: data.crossDomain as string,
        personality: data.personality as string,
        blindSpots: data.blindSpots as string,
        recommendations: data.recommendations as RecommendationItem[],
      }
      setReportState(updated)
      setReport(id, updated)
    } catch (err) {
      Taro.showToast({ title: err instanceof Error ? err.message : '解锁失败', icon: 'none' })
    } finally {
      if (stepRef.current) clearInterval(stepRef.current)
      setUnlocking(false)
    }
  }, [report, id])

  const handleDeepUnlock = () => {
    if (!report?.input) {
      Taro.showToast({ title: '缺少原始数据，请重新测试', icon: 'none' })
      return
    }
    setShowShareModal(true)
  }

  const handleShareDone = useCallback(() => {
    Taro.setStorageSync(`shared_${id}`, true)
    startDeepAnalysis()
  }, [id, startDeepAnalysis])

  if (loading) {
    return (
      <View className='result-page center-page'>
        <Text className='loading-emoji animate-spin'>🔍</Text>
        <Text className='loading-text'>加载报告中...</Text>
      </View>
    )
  }

  if (error || !report) {
    return (
      <View className='result-page center-page'>
        <Text className='error-emoji'>😵</Text>
        <Text className='error-msg'>{error || '报告不存在'}</Text>
        <View className='btn-small accent-gradient' onClick={() => Taro.navigateTo({ url: '/pages/upload/index' })}>
          <Text className='btn-action-text'>重新测试</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='result-page'>
      <View className='result-container'>
        {/* Nav */}
        <View className='nav-bar'>
          <Text className='nav-back' onClick={() => Taro.navigateTo({ url: '/pages/upload/index' })}>
            ← 重新测试
          </Text>
          <Text
            className='nav-invite'
            onClick={() => Taro.navigateTo({ url: `/pages/compare/index?from=${id}` })}
          >
            👥 邀请TA来测
          </Text>
        </View>

        {/* Share Card — uses derived mbtiType for consistency */}
        <View className='animate-fade-in-up'>
          <ShareCard
            mbtiType={mbtiType}
            mbtiTitle={ft(report.mbti.title)}
            dimensions={report.mbti.dimensions}
            roast={ft(report.roast)}
            radarData={report.radarData}
            summary={ft(report.summary)}
            itemCount={report.itemCount}
            doubanName={report.doubanName}
            bookCount={report.bookCount}
            movieCount={report.movieCount}
            musicCount={report.musicCount}
          />
        </View>

        {/* MBTI Dimensions */}
        <View className='section-card card-glass animate-fade-in-up animate-delay-100'>
          <Text className='section-title text-blue'>🧬 {mbtiType} 维度解读</Text>
          <View className='dim-list'>
            <EvidenceRow label='I/E' dim={report.mbti.dimensions.ie} />
            <EvidenceRow label='N/S' dim={report.mbti.dimensions.ns} />
            <EvidenceRow label='T/F' dim={report.mbti.dimensions.tf} />
            <EvidenceRow label='J/P' dim={report.mbti.dimensions.jp} />
          </View>
          {report.mbti.summary && (
            <Text className='dim-summary'>{ft(report.mbti.summary)}</Text>
          )}
        </View>

        {/* Stats */}
        <View className='stats-row animate-fade-in-up animate-delay-100'>
          <StatBlock value={report.bookCount} label='本书' emoji='📚' />
          <StatBlock value={report.movieCount} label='部电影' emoji='🎬' />
          <StatBlock value={report.musicCount} label='首音乐' emoji='🎵' />
        </View>

        {report.sampleCount && (
          <Text className='sample-info animate-fade-in-up'>
            基于 {report.sampleCount} 条数据分析 · 实际总量{' '}
            {report.bookCount + report.movieCount + report.musicCount}
          </Text>
        )}

        {/* Taste Analysis Section — button-triggered */}
        <View className='animate-fade-in-up animate-delay-200'>
          <Text className='report-title'>
            <Text className='text-blue'>✦</Text> {mbtiType} 品味报告
          </Text>

          {hasExpandContent ? (
            <View className='analysis-sections'>
              <AnalysisSection icon='📚' title={`${mbtiType} 的阅读品味`} content={ft(report.bookAnalysis)} />
              <AnalysisSection icon='🎬' title={`${mbtiType} 的观影品味`} content={ft(report.movieAnalysis)} />
              <AnalysisSection icon='🎵' title={`${mbtiType} 的音乐品味`} content={ft(report.musicAnalysis)} />
            </View>
          ) : expanding ? (
            <View className='section-card card-glass center-text'>
              <Text className='loading-emoji animate-pulse'>📊</Text>
              <Text className='loading-sub'>正在生成品味分析和时间线...</Text>
              <View className='progress-bar-bg' style={{ width: '200rpx', margin: '0 auto' }}>
                <View className='progress-bar-fill accent-gradient animate-pulse' style={{ width: '50%' }} />
              </View>
            </View>
          ) : (
            <View className='load-btn-card card-glass' onClick={handleLoadExpand}>
              <Text className='load-btn-icon'>📊</Text>
              <View className='load-btn-text-wrap'>
                <Text className='load-btn-title'>加载完整品味分析</Text>
                <Text className='load-btn-desc'>书影音逐项分析 + 品味时间线 · 约需 10-15 秒</Text>
              </View>
              <Text className='load-btn-arrow'>→</Text>
            </View>
          )}
        </View>

        {/* Evolution Curve */}
        {evolutionData.length > 0 && (
          <View className='animate-fade-in-up animate-delay-200'>
            <EvolutionCurve data={evolutionData} title='观影品味进化曲线' />
          </View>
        )}

        {/* Music Emotion Portrait */}
        {musicEmotions.length > 0 && (
          <View className='animate-fade-in-up animate-delay-200'>
            <MusicEmotionPortrait emotions={musicEmotions} />
          </View>
        )}

        {/* Timeline — only shows after expand data is loaded */}
        {hasTimeline && (
          <View className='section-card card-glass animate-fade-in-up animate-delay-200'>
            <Text className='section-title text-red'>📅 近 6 个月品味时间线</Text>
            <View className='timeline'>
              {report.timelineMonths!.map(m => (
                <View key={m.month} className='timeline-item'>
                  <View className='timeline-dot' />
                  <View className='timeline-content'>
                    <View className='timeline-header'>
                      <Text className='timeline-month'>{m.month}</Text>
                      <Text className='timeline-mood'>{m.mood}</Text>
                    </View>
                    {m.books.length > 0 && <Text className='timeline-detail'>📖 {m.books.join('、')}</Text>}
                    {m.movies.length > 0 && <Text className='timeline-detail'>🎬 {m.movies.join('、')}</Text>}
                    {m.music.length > 0 && <Text className='timeline-detail'>🎵 {m.music.join('、')}</Text>}
                    {m.tasteShift && <Text className='timeline-shift'>{m.tasteShift}</Text>}
                    {m.roast && <Text className='timeline-roast'>💬 {m.roast}</Text>}
                  </View>
                </View>
              ))}
            </View>
            {report.timelineText && (
              <View className='timeline-text-wrap'>
                <Text className='timeline-text'>{ft(report.timelineText)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Timeline load button — shows when expand loaded but no timeline data */}
        {hasExpandContent && !hasTimeline && !expanding && (
          <View className='load-btn-card card-glass animate-fade-in-up animate-delay-200' onClick={handleLoadExpand}>
            <Text className='load-btn-icon'>📅</Text>
            <View className='load-btn-text-wrap'>
              <Text className='load-btn-title'>重新加载时间线</Text>
              <Text className='load-btn-desc'>品味分析已加载，点击重试时间线</Text>
            </View>
            <Text className='load-btn-arrow'>↻</Text>
          </View>
        )}

        {/* Unlock Section (Share to unlock - free) */}
        {!isDeepUnlocked ? (
          unlocking ? (
            <UnlockingOverlay step={unlockStep} funFact={funFact} />
          ) : (
            <View className='unlock-card card-glass animate-fade-in-up animate-delay-300'>
              <Text className='unlock-emoji'>🔮</Text>
              <Text className='unlock-title'>分享解锁深度解读</Text>
              <View className='unlock-list'>
                <Text className='unlock-item'><Text className='text-red'>✦</Text> 跨领域品味关联分析</Text>
                <Text className='unlock-item'><Text className='text-red'>✦</Text> {mbtiType} 深度人格画像</Text>
                <Text className='unlock-item'><Text className='text-red'>✦</Text> 品味盲区诊断</Text>
                <Text className='unlock-item'><Text className='text-red'>✦</Text> AI 专属推荐（排除已读/已看/已听）</Text>
              </View>
              <View className='btn-unlock' onClick={handleDeepUnlock}>
                <Text className='btn-action-text'>分享并解锁 (免费)</Text>
              </View>
              <Text className='unlock-hint'>分享给好友即可解锁 · 分析约需 15-20 秒</Text>
            </View>
          )
        ) : (
          <View className='animate-fade-in-up animate-delay-300'>
            <Text className='report-title'>
              <Text className='text-red'>✦</Text> 深度解读
            </Text>
            <View className='analysis-sections'>
              <AnalysisSection icon='🔗' title='跨领域品味关联' content={ft(report.crossDomain)} />
              <AnalysisSection icon='🧠' title={`${mbtiType} 深度人格画像`} content={ft(report.personality)} />
              <AnalysisSection icon='🎯' title='品味盲区' content={ft(report.blindSpots)} />
            </View>

            {report.recommendations && report.recommendations.length > 0 && (
              <View className='section-card card-glass'>
                <Text className='section-title text-red'>💡 {mbtiType} 专属推荐</Text>
                <Text className='rec-hint'>已排除你读过/看过/听过的作品 · 点击复制豆瓣搜索链接</Text>
                <View className='rec-list'>
                  {report.recommendations.filter(r => !r.alreadyConsumed).map((rec, i) => (
                    <View
                      key={i}
                      className='rec-item'
                      onClick={() => {
                        const typeMap = { book: 'book', movie: 'movie', music: 'music' }
                        const url = `https://search.douban.com/${typeMap[rec.type]}/subject_search?search_text=${encodeURIComponent(rec.title)}`
                        Taro.setClipboardData({ data: url })
                      }}
                    >
                      <View className='rec-icon'>
                        <Text>{rec.type === 'book' ? '📖' : rec.type === 'movie' ? '🎬' : '🎵'}</Text>
                      </View>
                      <View className='rec-info'>
                        <View className='rec-title-row'>
                          <Text className='rec-title'>{rec.title}</Text>
                          <MatchBadge score={rec.matchScore} />
                        </View>
                        <Text className='rec-reason'>{rec.reason}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Paid Deep Analysis (hidden behind feature flag) */}
        {ENABLE_PAID_DEEP && isDeepUnlocked && (
          <View className='paid-deep-card card-glass animate-fade-in-up animate-delay-300'>
            <Text className='paid-deep-emoji'>🔬</Text>
            <Text className='paid-deep-title'>深度分析 Pro</Text>
            <Text className='paid-deep-desc'>
              解锁完整的观影品味进化曲线、音乐情绪画像、阅读成长图谱等高级分析
            </Text>
            <View className='paid-deep-features'>
              <Text className='paid-deep-feature'>📈 观影品味进化曲线</Text>
              <Text className='paid-deep-feature'>🎵 音乐情绪画像</Text>
              <Text className='paid-deep-feature'>📚 阅读成长图谱</Text>
              <Text className='paid-deep-feature'>🧬 品味 DNA 全景图</Text>
            </View>
            <View className='btn-paid'>
              <Text className='btn-action-text'>解锁深度分析 Pro</Text>
            </View>
          </View>
        )}

        {/* Compare CTA */}
        <View className='compare-cta card-glass animate-fade-in-up animate-delay-300'>
          <Text className='cta-emoji'>👥</Text>
          <Text className='cta-title'>品味双人对比</Text>
          <Text className='cta-desc'>邀请另一个人来测，看看你们的书影音 MBTI 有多配</Text>
          <View
            className='btn-primary'
            onClick={() => Taro.navigateTo({ url: `/pages/compare/index?from=${id}` })}
          >
            <Text className='btn-text'>邀请 TA 来对比</Text>
          </View>
        </View>

        {/* Privacy footer */}
        <View className='privacy-footer animate-fade-in-up animate-delay-300'>
          <Text className='privacy-footer-text'>
            🔒 所有数据仅保存在你的设备上 · 不会被上传或用于其他用途
          </Text>
        </View>

        {/* Footer */}
        <View className='page-footer animate-fade-in-up animate-delay-300'>
          <View
            className='btn-small card-glass'
            onClick={() => Taro.navigateTo({ url: '/pages/upload/index' })}
          >
            <Text className='btn-action-text'>再测一个人</Text>
          </View>
          <Text className='footer-text'>分享给朋友，看看谁是什么书影音 MBTI</Text>
        </View>
      </View>

      {/* Bottom Share Action Bar */}
      <View className='share-bar'>
        <Button openType='share' className='share-bar-btn share-bar-friend'>
          <Text className='share-bar-icon'>💬</Text>
          <Text className='share-bar-label'>分享好友</Text>
        </Button>
        <ShareCard
          mbtiType={mbtiType}
          mbtiTitle={ft(report.mbti.title)}
          dimensions={report.mbti.dimensions}
          roast={ft(report.roast)}
          radarData={report.radarData}
          summary={ft(report.summary)}
          itemCount={report.itemCount}
          doubanName={report.doubanName}
          bookCount={report.bookCount}
          movieCount={report.movieCount}
          musicCount={report.musicCount}
          renderTrigger={(onSave) => (
            <View className='share-bar-btn share-bar-save' onClick={onSave}>
              <Text className='share-bar-icon'>📷</Text>
              <Text className='share-bar-label'>保存卡片</Text>
            </View>
          )}
        />
      </View>

      {/* Share Guide Modal — shown before deep unlock */}
      {showShareModal && (
        <View className='share-modal-mask' onClick={() => setShowShareModal(false)}>
          <View className='share-modal' onClick={(e) => e.stopPropagation()}>
            <Text className='share-modal-title'>🔮 分享解锁深度解读</Text>
            <Text className='share-modal-desc'>
              分享给好友后即可解锁完整深度分析
            </Text>
            <View className='share-modal-actions'>
              <Button openType='share' className='share-modal-btn share-modal-btn-primary' onClick={handleShareDone}>
                <Text className='share-modal-btn-icon'>💬</Text>
                <Text className='share-modal-btn-text'>分享给好友</Text>
              </Button>
              <View className='share-modal-btn share-modal-btn-secondary' onClick={handleShareDone}>
                <Text className='share-modal-btn-icon'>⏭️</Text>
                <Text className='share-modal-btn-text'>直接解锁</Text>
              </View>
            </View>
            <Text className='share-modal-hint'>分享后自动开始深度分析 · 约需 15-20 秒</Text>
          </View>
        </View>
      )}
    </View>
  )
}

function EvidenceRow({ label, dim }: { label: string; dim: MBTIDimension }) {
  return (
    <View className='evidence-row'>
      <View className='evidence-badge'>
        <Text className='evidence-letter'>{dim.letter}</Text>
      </View>
      <Text className='evidence-text'>{dim.evidence}</Text>
    </View>
  )
}

function UnlockingOverlay({ step, funFact }: { step: number; funFact: string }) {
  return (
    <View className='section-card card-glass center-text animate-fade-in-up'>
      <View className='unlock-spinner'>
        <View className='spinner-bg' />
        <View className='spinner-ring animate-spin' />
        <View className='spinner-ring-inner' />
        <Text className='spinner-icon'>🧠</Text>
      </View>
      <Text className='progress-text'>{UNLOCK_MESSAGES[step]}</Text>
      <View className='progress-bar-bg' style={{ width: '360rpx', margin: '0 auto' }}>
        <View
          className='progress-bar-fill accent-gradient'
          style={{ width: `${((step + 1) / UNLOCK_MESSAGES.length) * 100}%` }}
        />
      </View>
      <Text className='loading-sub'>深度分析中 · 约需 15-20 秒</Text>
      <View className='fun-fact-box'>
        <Text className='fun-fact'>💡 {funFact}</Text>
      </View>
    </View>
  )
}

function StatBlock({ value, label, emoji }: { value: number; label: string; emoji: string }) {
  return (
    <View className='stat-block card-glass'>
      <Text className='stat-emoji'>{emoji}</Text>
      <Text className='stat-value'>{value}</Text>
      <Text className='stat-label'>{label}</Text>
    </View>
  )
}

function AnalysisSection({ icon, title, content }: { icon: string; title: string; content?: string }) {
  if (!content) return null
  return (
    <View className='section-card card-glass'>
      <Text className='section-title text-red'>{icon} {title}</Text>
      <Text className='section-content'>{content}</Text>
    </View>
  )
}

function MatchBadge({ score }: { score: number }) {
  const text = score >= 80 ? '高匹配' : score >= 50 ? '可能惊艳' : '挑战区'
  const color = score >= 80 ? '#4ade80' : score >= 50 ? '#facc15' : '#f87171'
  return (
    <Text className='match-badge' style={{ color, borderColor: color }}>
      {text} {score}%
    </Text>
  )
}
