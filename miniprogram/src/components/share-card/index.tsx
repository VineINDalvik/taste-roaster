import { useCallback, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { MBTIDimension, RadarData } from '@/utils/types'
import DimensionBar from '@/components/dimension-bar'
import RadarChart from '@/components/radar-chart'
import { requestSharePng, saveToAlbumWithPermission } from '@/utils/share-image'
import './index.scss'

interface Props {
  mbtiType: string
  mbtiTitle: string
  dimensions: {
    ie: MBTIDimension
    ns: MBTIDimension
    tf: MBTIDimension
    jp: MBTIDimension
  }
  roast: string
  radarData: RadarData
  summary: string
  itemCount: number
  doubanName?: string
  bookCount?: number
  movieCount?: number
  musicCount?: number
  renderTrigger?: (onSave: () => void) => React.ReactNode
}

export default function ShareCard(props: Props) {
  const {
    mbtiType, mbtiTitle, dimensions, roast, radarData,
    summary, doubanName, bookCount, movieCount, musicCount,
    renderTrigger,
  } = props

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleSaveImage = useCallback(async () => {
    Taro.showLoading({ title: '生成中...' })

    try {
      const body = {
        mbtiType,
        mbtiTitle,
        roast,
        dimensions: {
          ie: { letter: dimensions.ie.letter, score: dimensions.ie.score },
          ns: { letter: dimensions.ns.letter, score: dimensions.ns.score },
          tf: { letter: dimensions.tf.letter, score: dimensions.tf.score },
          jp: { letter: dimensions.jp.letter, score: dimensions.jp.score },
        },
        radarData,
        summary,
        doubanName,
        bookCount,
        movieCount,
        musicCount,
      }

      const tempPath = await requestSharePng('/api/share-card', body, { timeout: 30000, filenamePrefix: 'share-card' })
      Taro.hideLoading()
      setPreviewUrl(tempPath)
    } catch (e) {
      console.error('Share card generation failed:', e)
      Taro.hideLoading()
      Taro.showToast({ title: '生成失败', icon: 'error' })
    }
  }, [mbtiType, mbtiTitle, roast, dimensions, radarData, summary, doubanName, bookCount, movieCount, musicCount])

  const handleSaveToAlbum = useCallback(async () => {
    if (!previewUrl) return
    try {
      await saveToAlbumWithPermission(previewUrl)
      Taro.showToast({ title: '已保存到相册', icon: 'success' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存失败'
      Taro.showToast({ title: msg, icon: 'none' })
    }
  }, [previewUrl])

  if (renderTrigger) {
    return (
      <>
        {previewUrl && <PreviewOverlay url={previewUrl} onClose={() => setPreviewUrl(null)} onSave={handleSaveToAlbum} />}
        {renderTrigger(handleSaveImage)}
      </>
    )
  }

  return (
    <View className='share-card-wrap'>
      {previewUrl && <PreviewOverlay url={previewUrl} onClose={() => setPreviewUrl(null)} onSave={handleSaveToAlbum} />}

      <View className='card-visual'>
        <View className='card-glow-1' />
        <View className='card-glow-2' />
        <View className='card-content'>
          <Text className='card-label'>
            {doubanName ? `${doubanName} 的` : ''}书影音 MBTI
          </Text>
          <Text className='card-mbti-type'>{mbtiType}</Text>
          <Text className='card-mbti-title'>{mbtiTitle}</Text>

          <View className='card-roast-box'>
            <Text className='card-roast'>&ldquo;{roast}&rdquo;</Text>
          </View>

          <View className='card-dims'>
            {(['ie', 'ns', 'tf', 'jp'] as const).map(k => (
              <DimensionBar key={k} dimKey={k} dim={dimensions[k]} />
            ))}
          </View>

          <View className='card-radar-stats'>
            <RadarChart data={radarData as unknown as Record<string, number>} size={120} canvasId='shareRadar' />
            <View className='card-stats'>
              {bookCount != null && (
                <View className='mini-stat'>
                  <Text className='stat-emoji'>📚</Text>
                  <Text className='stat-val'>{bookCount}</Text>
                  <Text className='stat-label'>本书</Text>
                </View>
              )}
              {movieCount != null && (
                <View className='mini-stat'>
                  <Text className='stat-emoji'>🎬</Text>
                  <Text className='stat-val'>{movieCount}</Text>
                  <Text className='stat-label'>部电影</Text>
                </View>
              )}
              {musicCount != null && (
                <View className='mini-stat'>
                  <Text className='stat-emoji'>🎵</Text>
                  <Text className='stat-val'>{musicCount}</Text>
                  <Text className='stat-label'>首音乐</Text>
                </View>
              )}
            </View>
          </View>

          <Text className='card-summary'>{summary}</Text>

          <View className='card-footer'>
            <Text className='card-footer-left'>豆瓣书影音 MBTI</Text>
            <Text className='card-footer-right'>测测你的书影音 MBTI →</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

function PreviewOverlay({ url, onClose, onSave }: { url: string; onClose: () => void; onSave: () => void }) {
  return (
    <View className='share-preview-overlay' onClick={onClose}>
      <Text className='share-preview-hint'>长按图片保存到相册</Text>
      <Image
        className='share-preview-image'
        src={url}
        mode='widthFix'
        showMenuByLongpress
        onClick={(e) => e.stopPropagation()}
      />
      <View className='share-preview-actions'>
        <View className='share-preview-btn' onClick={(e) => { e.stopPropagation(); onSave() }}>
          <Text>保存到相册</Text>
        </View>
        <View className='share-preview-btn share-preview-close' onClick={onClose}>
          <Text>关闭</Text>
        </View>
      </View>
    </View>
  )
}
