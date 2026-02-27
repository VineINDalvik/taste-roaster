import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { View, Text, Button, Image } from '@tarojs/components'
import Taro, { useRouter, useShareAppMessage, useShareTimeline } from '@tarojs/taro'
import ShareCard from '@/components/share-card'
import EvolutionCurve from '@/components/evolution-curve'
import { callApi } from '@/utils/api'
import { getReport, setReport, markBasicPaid, markDeepPaid } from '@/utils/storage'
import { saveAnalysisCard, saveFullReport } from '@/utils/canvas-saver'
import type { ReportData, RecommendationItem, MonthSnapshot, MBTIDimension } from '@/utils/types'
import './index.scss'

const TIP_QRCODE = '/assets/tip-qrcode.jpg'

const ENABLE_PAID_DEEP = false

const UNLOCK_MESSAGES = [
  '深入解读你的文化人格...',
  '分析跨领域品味关联...',
  '挖掘你的品味盲区...',
  '生成专属推荐...',
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

const MBTI_TYPES = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP', 'ISTJ', 'ISTP', 'ESTJ', 'ESTP', 'ISFJ', 'ISFP', 'ESFJ', 'ESFP']

function fixMbtiInText(
  text: string | undefined,
  _aiType: string | undefined,
  correctType: string
): string {
  if (!text || !correctType) return text || ''
  return MBTI_TYPES.reduce(
    (s, t) => (t !== correctType ? s.replace(new RegExp(t, 'gi'), correctType) : s),
    text
  )
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
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteGenerating, setInviteGenerating] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [basicPaid, setBasicPaid] = useState(false)
  const [deepPaid, setDeepPaid] = useState(false)
  const [expandFailed, setExpandFailed] = useState(false)
  const [deepUnlockFailed, setDeepUnlockFailed] = useState(false)
  const stepRef = useRef<ReturnType<typeof setInterval>>()

  // musicEmotions handled by themed AnalysisSection with theme='music'

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
        const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored
        setReportState(parsed)
        markBasicPaid(parsed.id || id)
        markDeepPaid(parsed.id || id)
        setBasicPaid(true)
        setDeepPaid(true)
      } catch {
        setError('报告数据损坏')
      }
    } else {
      setError('报告不存在，请重新生成')
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    if (report?.input && report?.mbti?.type && basicPaid && !hasExpandContent && !expanding && !expandFailed) {
      handleLoadExpand()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id, hasExpandContent, basicPaid])

  // 深度解读：已标记已支付但无内容时自动加载（如从分享/存储恢复）
  useEffect(() => {
    if (report?.input && deepPaid && !isDeepUnlocked && !unlocking && !deepUnlockFailed) {
      startDeepAnalysis()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id, deepPaid, isDeepUnlocked, deepUnlockFailed])

  const handleLoadExpand = useCallback(async () => {
    if (!report?.input || !report?.mbti?.type || expanding) return
    setExpanding(true)
    setExpandFailed(false)

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
      setExpandFailed(true)
      Taro.showToast({ title: '加载失败，请重试', icon: 'none' })
    } finally {
      setExpanding(false)
    }
  }, [report, id, expanding])

  const startDeepAnalysis = useCallback(async () => {
    if (!report?.input) return

    setShowShareModal(false)
    setUnlocking(true)
    setDeepUnlockFailed(false)
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
      setDeepUnlockFailed(true)
      Taro.showToast({ title: err instanceof Error ? err.message : '加载失败，请重试', icon: 'none' })
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
    startDeepAnalysis()
  }

  const handleShareDone = useCallback(() => {
    Taro.setStorageSync(`shared_${id}`, true)
    startDeepAnalysis()
  }, [id, startDeepAnalysis])

  const handleGenerateInviteLink = useCallback(async () => {
    if (!report || inviteGenerating) return
    setInviteGenerating(true)
    setInviteError(null)
    try {
      const myBookCount = report.realCounts?.books ?? report.bookCount ?? report.input?.books?.length ?? 0
      const myMovieCount = report.realCounts?.movies ?? report.movieCount ?? report.input?.movies?.length ?? 0
      const myMusicCount = report.realCounts?.music ?? report.musicCount ?? report.input?.music?.length ?? 0
      const res = await callApi<{ code: string }>('/api/invite', {
        name: report.doubanName || report.input?.doubanId || '神秘用户',
        doubanId: report.input?.doubanId,
        mbtiType: report.mbti?.type,
        mbtiTitle: report.mbti?.title,
        dimensions: report.mbti?.dimensions,
        radarData: report.radarData,
        summary: report.summary,
        roast: report.roast,
        bookTitles: (report.input?.books ?? []).slice(0, 30).map((b: { title: string }) => b.title),
        movieTitles: (report.input?.movies ?? []).slice(0, 30).map((m: { title: string }) => m.title),
        musicTitles: (report.input?.music ?? []).slice(0, 30).map((m: { title: string }) => m.title),
        bookCount: myBookCount,
        movieCount: myMovieCount,
        musicCount: myMusicCount,
      })
      setInviteLink(`https://db-mbti.vinex.top/invite/${res.code}`)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : '生成失败')
    } finally {
      setInviteGenerating(false)
    }
  }, [report, inviteGenerating])

  const handleCopyInviteLink = useCallback(() => {
    if (!inviteLink) return
    Taro.setClipboardData({
      data: inviteLink,
      success: () => {
        setInviteCopied(true)
        Taro.showToast({ title: '已复制', icon: 'success' })
        setTimeout(() => setInviteCopied(false), 2000)
      },
    })
  }, [inviteLink])

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
            onClick={() => setShowInviteModal(true)}
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

        {/* sample count hidden — avoid showing small numbers */}

        {/* Taste Analysis Section */}
        {(
          <>
            <View className='animate-fade-in-up animate-delay-200'>
              <Text className='report-title'>
                <Text className='text-blue'>✦</Text> {mbtiType} 品味报告
              </Text>

              {hasExpandContent ? (
                <View className='analysis-sections'>
                  <AnalysisSection
                    icon='📚' title='阅读情绪画像' content={ft(report.bookAnalysis)} theme='book'
                    onSave={() => saveAnalysisCard('analysisCanvas', { icon: '📚', title: `${mbtiType} 的阅读品味`, content: ft(report.bookAnalysis) || '', mbtiType, doubanName: report.doubanName })}
                  />
                  <AnalysisSection
                    icon='🎬' title='观影品味画像' content={ft(report.movieAnalysis)} theme='movie'
                    onSave={() => saveAnalysisCard('analysisCanvas', { icon: '🎬', title: `${mbtiType} 的观影品味`, content: ft(report.movieAnalysis) || '', mbtiType, doubanName: report.doubanName })}
                  />
                  <AnalysisSection
                    icon='🎵' title='音乐情绪画像' content={ft(report.musicAnalysis)} theme='music'
                    onSave={() => saveAnalysisCard('analysisCanvas', { icon: '🎵', title: `${mbtiType} 的音乐品味`, content: ft(report.musicAnalysis) || '', mbtiType, doubanName: report.doubanName })}
                  />
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
                  <Text className='load-btn-icon'>{expandFailed ? '🔄' : '📊'}</Text>
                  <View className='load-btn-text-wrap'>
                    <Text className='load-btn-title'>{expandFailed ? '加载失败，点击重试' : '加载完整品味分析'}</Text>
                    <Text className='load-btn-desc'>{expandFailed ? '网络问题可能导致加载失败，请重试' : '书影音逐项分析 + 品味时间线 · 约需 10-15 秒'}</Text>
                  </View>
                  <Text className='load-btn-arrow'>→</Text>
                </View>
              )}
            </View>

            {report.timelineMonths && report.timelineMonths.length > 0 && (
              <View className='animate-fade-in-up animate-delay-200'>
                <EvolutionCurve
                  months={report.timelineMonths}
                  trend={ft(report.timelineText?.split('\n')[0])}
                  prediction={ft(
                    report.timelineText?.includes('预测')
                      ? report.timelineText.split('\n').slice(1).join('\n')
                      : undefined
                  )}
                />
              </View>
            )}

            {!hasTimeline && expanding && (
              <View className='section-card card-glass center-text'>
                <Text className='loading-emoji animate-pulse'>📅</Text>
                <Text className='loading-text'>品味进化时间线加载中...</Text>
              </View>
            )}
          </>
        )}

        {/* Deep Analysis Section */}
        {(
          !isDeepUnlocked ? (
            unlocking ? (
              <UnlockingOverlay step={unlockStep} funFact={funFact} />
            ) : deepUnlockFailed ? (
              <View className='section-card card-glass center-text animate-fade-in-up animate-delay-300'>
                <Text className='loading-emoji'>🔮</Text>
                <Text className='loading-sub'>加载失败，网络可能较慢</Text>
                <Text className='unlock-hint'>建议开启 VPN 后重试</Text>
                <View className='btn-unlock' style={{ marginTop: '24rpx' }} onClick={handleDeepUnlock}>
                  <Text className='btn-action-text'>点击重试</Text>
                </View>
              </View>
            ) : (
              <View className='section-card card-glass center-text animate-fade-in-up animate-delay-300'>
                <Text className='loading-emoji animate-pulse'>🔮</Text>
                <Text className='loading-sub'>正在加载深度解读...</Text>
              </View>
            )
          ) : (
          <View className='animate-fade-in-up animate-delay-300'>
            <Text className='report-title'>
              <Text className='text-red'>✦</Text> 深度解读
            </Text>
            <View className='analysis-sections'>
              <AnalysisSection
                icon='🔗' title='跨领域品味关联' content={ft(report.crossDomain)}
                onSave={() => saveAnalysisCard('analysisCanvas', { icon: '🔗', title: '跨领域品味关联', content: ft(report.crossDomain) || '', mbtiType, doubanName: report.doubanName })}
              />
              <AnalysisSection
                icon='🧠' title={`${mbtiType} 深度人格画像`} content={ft(report.personality)}
                onSave={() => saveAnalysisCard('analysisCanvas', { icon: '🧠', title: `${mbtiType} 深度人格画像`, content: ft(report.personality) || '', mbtiType, doubanName: report.doubanName })}
              />
              <AnalysisSection
                icon='🎯' title='品味盲区' content={ft(report.blindSpots)}
                onSave={() => saveAnalysisCard('analysisCanvas', { icon: '🎯', title: '品味盲区', content: ft(report.blindSpots) || '', mbtiType, doubanName: report.doubanName })}
              />
            </View>

            {report.recommendations && report.recommendations.length > 0 && (
              <View className='section-card card-glass'>
                <Text className='section-title text-red'>💡 {mbtiType} 专属推荐</Text>
                <Text className='rec-hint'>点击可复制豆瓣搜索链接</Text>
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
          )
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
            onClick={() => setShowInviteModal(true)}
          >
            <Text className='btn-text'>邀请 TA 来对比</Text>
          </View>
        </View>

        {/* Explore More */}
        <View className='animate-fade-in-up animate-delay-300'>
          <Text className='explore-section-title'>
            <Text className='text-blue'>🌐</Text> 探索更多
          </Text>
          <View className='explore-grid'>
            {[
              { icon: '🎧', name: '网易云音乐', desc: '听歌品味分析', color: '#e94560', badge: '即将上线' },
              { icon: '🔮', name: '赛博神算子', desc: 'AI 塔罗占卜', color: '#a855f7', badge: '可体验' },
            ].map(item => (
              <View
                key={item.name}
                className='explore-card card-glass'
                onClick={() => {
                  if (item.name === '赛博神算子') {
                    Taro.setClipboardData({ data: 'https://cyber-oracle-nine.vercel.app', success: () => {
                      Taro.showToast({ title: '链接已复制，可在浏览器打开', icon: 'none' })
                    }})
                  }
                }}
              >
                <View className='explore-card-header'>
                  <Text className='explore-card-icon'>{item.icon}</Text>
                  <Text className='explore-card-name'>{item.name}</Text>
                </View>
                <Text className='explore-card-desc'>{item.desc}</Text>
                <Text className='explore-card-badge' style={{ color: item.color, background: item.color + '15' }}>{item.badge}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tip / Donation */}
        <View className='tip-card card-glass animate-fade-in-up animate-delay-300'>
          <Text className='tip-title'>☕ 请作者喝杯咖啡</Text>
          <Text className='tip-desc'>如果觉得有趣，可以赞赏支持一下</Text>
          <Image
            className='tip-qrcode tip-qrcode-tappable'
            src={TIP_QRCODE}
            mode='aspectFill'
            showMenuByLongpress
            onClick={() => Taro.previewImage({ current: TIP_QRCODE, urls: [TIP_QRCODE] })}
          />
          <Text className='tip-hint'>点击放大 / 长按识别二维码（手机无法自己“扫一扫”屏幕）</Text>
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
              <Text className='share-bar-label'>MBTI卡片</Text>
            </View>
          )}
        />
        {hasExpandContent && (
          <View
            className='share-bar-btn share-bar-report'
            onClick={() => {
              saveFullReport('fullReportCanvas', {
                mbtiType,
                mbtiTitle: ft(report.mbti.title),
                roast: ft(report.roast),
                summary: ft(report.summary),
                doubanName: report.doubanName,
                bookCount: report.bookCount,
                movieCount: report.movieCount,
                musicCount: report.musicCount,
                bookAnalysis: ft(report.bookAnalysis),
                movieAnalysis: ft(report.movieAnalysis),
                musicAnalysis: ft(report.musicAnalysis),
              })
            }}
          >
            <Text className='share-bar-icon'>📋</Text>
            <Text className='share-bar-label'>完整报告</Text>
          </View>
        )}
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

      {/* Invite Modal — 当面对比 / 生成邀请链接 */}
      {showInviteModal && (
        <View className='share-modal-mask' onClick={() => { setShowInviteModal(false); setInviteLink(null); setInviteError(null) }}>
          <View className='share-modal invite-modal' onClick={(e) => e.stopPropagation?.()}>
            <Text className='share-modal-title'>👥 邀请 TA 来对比</Text>
            <Text className='share-modal-desc'>选择一种方式发起品味对比</Text>

            <View className='invite-options'>
              <View
                className='invite-option'
                onClick={() => { setShowInviteModal(false); Taro.navigateTo({ url: `/pages/compare/index?from=${id}` }) }}
              >
                <View className='invite-option-icon'>📱</View>
                <View className='invite-option-content'>
                  <Text className='invite-option-title'>当面对比</Text>
                  <Text className='invite-option-desc'>直接输入对方的豆瓣 ID，当场揭晓结果</Text>
                </View>
                <Text className='invite-option-arrow'>→</Text>
              </View>

              {!inviteLink ? (
                <View
                  className='invite-option invite-option-link'
                  onClick={handleGenerateInviteLink}
                >
                  <View className='invite-option-icon invite-option-icon-link'>🔗</View>
                  <View className='invite-option-content'>
                    <Text className='invite-option-title'>{inviteGenerating ? '生成中...' : '生成邀请链接'}</Text>
                    <Text className='invite-option-desc'>发给 TA，TA 打开就能直接对比（7天有效）</Text>
                  </View>
                  <Text className='invite-option-arrow'>{inviteGenerating ? '⏳' : '→'}</Text>
                </View>
              ) : (
                <View className='invite-link-result'>
                  <Text className='invite-link-label'>邀请链接已生成</Text>
                  <View className='invite-link-row'>
                    <Text className='invite-link-text' numberOfLines={1}>{inviteLink}</Text>
                    <View
                      className={`invite-copy-btn ${inviteCopied ? 'invite-copy-done' : ''}`}
                      onClick={handleCopyInviteLink}
                    >
                      <Text>{inviteCopied ? '已复制 ✓' : '复制'}</Text>
                    </View>
                  </View>
                  <Text className='invite-link-hint'>链接 7 天内有效 · 对方打开后输入豆瓣 ID 即可对比</Text>
                </View>
              )}
            </View>

            {inviteError && (
              <View className='invite-error'>
                <Text>{inviteError}</Text>
              </View>
            )}

            <Text
              className='invite-modal-cancel'
              onClick={() => { setShowInviteModal(false); setInviteLink(null); setInviteError(null) }}
            >
              取消
            </Text>
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

function AnalysisSection({ icon, title, content, onSave, theme }: { icon: string; title: string; content?: string; onSave?: () => void; theme?: 'book' | 'movie' | 'music' }) {
  if (!content) return null

  const sentences = content
    .split(/(?<=[。！？\n])/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (visibleCount >= sentences.length) return
    const timer = setTimeout(() => setVisibleCount(v => v + 1), 350)
    return () => clearTimeout(timer)
  }, [visibleCount, sentences.length])

  const themeClass = theme ? `themed-section themed-${theme}` : ''
  const themeConfig = {
    book: { subtitle: '的书架密码', color: '#fcd393', dimColor: 'rgba(252,211,147,0.4)', titleColor: '#fbbf24' },
    movie: { subtitle: '的光影密码', color: '#93c5fd', dimColor: 'rgba(147,197,253,0.4)', titleColor: '#60a5fa' },
    music: { subtitle: '的声波密码', color: '#d8b4fe', dimColor: 'rgba(216,180,254,0.5)', titleColor: '#a78bfa' },
  }
  const tc = theme ? themeConfig[theme] : null

  return (
    <View className={`section-card ${themeClass}`}>
      {/* Decorations */}
      {theme === 'book' && (
        <View className='deco-book'>
          {['📖', '📝', '✦', '📄', '🔖'].map((ic, i) => (
            <Text key={i} className={`float-icon float-book-${i}`}>{ic}</Text>
          ))}
        </View>
      )}
      {theme === 'movie' && (
        <>
          <View className='deco-film-strip deco-film-left'>
            {Array.from({ length: 10 }).map((_, i) => <View key={i} className='film-hole' />)}
          </View>
          <View className='deco-film-strip deco-film-right'>
            {Array.from({ length: 10 }).map((_, i) => <View key={i} className='film-hole' />)}
          </View>
          <View className='deco-film-reel'>
            <View className='reel-outer'>
              <View className='reel-inner' />
            </View>
          </View>
        </>
      )}
      {theme === 'music' && (
        <View className='deco-equalizer'>
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={i} className='eq-bar' style={{ animationDelay: `${i * 0.12}s`, height: `${10 + Math.random() * 30}px` }} />
          ))}
        </View>
      )}

      {/* Header */}
      <View className='section-header'>
        <View className='themed-header'>
          <View className={`themed-icon-circle ${theme ? `icon-${theme}` : ''}`}>
            <Text className='themed-icon-emoji'>{icon}</Text>
          </View>
          <View className='themed-header-text'>
            <Text className='section-title' style={tc ? { color: tc.titleColor } : { color: '#e94560' }}>
              {title}
            </Text>
            {tc && <Text className='themed-subtitle' style={{ color: tc.dimColor }}>{tc.subtitle}</Text>}
          </View>
        </View>
        {onSave && (
          <View className='save-card-btn' onClick={onSave}>
            <Text className='save-card-icon'>💾</Text>
          </View>
        )}
      </View>

      {/* Animated sentences */}
      <View className='themed-sentences'>
        {sentences.map((sentence, i) => (
          <Text
            key={i}
            className={`themed-sentence ${i < visibleCount ? 'sentence-visible' : 'sentence-hidden'} ${theme === 'movie' ? 'slide-right' : 'slide-up'}`}
            style={tc && i === 0 ? { color: tc.color, fontSize: '28rpx', fontWeight: '500' } : undefined}
          >
            {sentence}
          </Text>
        ))}
      </View>
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
