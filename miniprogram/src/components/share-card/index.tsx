import { useCallback, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { MBTIDimension, RadarData } from '@/utils/types'
import './index.scss'

const VERCEL_BASE = 'https://app-theta-puce.vercel.app'

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

      const res = await Taro.request({
        url: `${VERCEL_BASE}/api/share-card`,
        method: 'POST',
        data: body,
        header: { 'Content-Type': 'application/json' },
        responseType: 'arraybuffer',
        timeout: 30000,
      })

      if (res.statusCode !== 200) {
        throw new Error(`Server error ${res.statusCode}`)
      }

      const fs = Taro.getFileSystemManager()
      const tempPath = `${Taro.env.USER_DATA_PATH}/share-card-${Date.now()}.png`
      fs.writeFileSync(tempPath, res.data, 'binary')

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
      await Taro.saveImageToPhotosAlbum({ filePath: previewUrl })
      Taro.showToast({ title: '已保存到相册', icon: 'success' })
    } catch {
      Taro.showToast({ title: '保存失败', icon: 'error' })
    }
  }, [previewUrl])

  return (
    <>
      {/* Preview overlay */}
      {previewUrl && (
        <View className='share-preview-overlay' onClick={() => setPreviewUrl(null)}>
          <Text className='share-preview-hint'>长按图片保存到相册</Text>
          <Image
            className='share-preview-image'
            src={previewUrl}
            mode='widthFix'
            showMenuByLongpress
            onClick={(e) => e.stopPropagation()}
          />
          <View className='share-preview-actions'>
            <View className='share-preview-btn' onClick={(e) => { e.stopPropagation(); handleSaveToAlbum() }}>
              <Text>保存到相册</Text>
            </View>
            <View className='share-preview-btn share-preview-close' onClick={() => setPreviewUrl(null)}>
              <Text>关闭</Text>
            </View>
          </View>
        </View>
      )}

      {renderTrigger ? (
        renderTrigger(handleSaveImage)
      ) : (
        <View className='share-card-trigger' onClick={handleSaveImage}>
          <Text>保存卡片</Text>
        </View>
      )}
    </>
  )
}
