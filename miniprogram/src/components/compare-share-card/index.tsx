import { useCallback, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { PersonData, ComparisonData } from '@/utils/types'
import { requestSharePng, saveToAlbumWithPermission } from '@/utils/share-image'
import './index.scss'

interface CompareShareCardProps {
  personA: PersonData
  personB: PersonData
  comparison: ComparisonData
  renderTrigger: (onSave: () => void) => React.ReactNode
}

export default function CompareShareCard({
  personA,
  personB,
  comparison,
  renderTrigger,
}: CompareShareCardProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleSaveImage = useCallback(async () => {
    Taro.showLoading({ title: '生成中...' })

    try {
      const body = { personA, personB, comparison }
      const tempPath = await requestSharePng('/api/share-compare', body, { timeout: 60000, filenamePrefix: 'share-compare' })
      Taro.hideLoading()
      setPreviewUrl(tempPath)
    } catch (e) {
      console.error('Compare share card generation failed:', e)
      Taro.hideLoading()
      Taro.showToast({ title: '生成失败', icon: 'error' })
    }
  }, [personA, personB, comparison])

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

  return (
    <>
      {previewUrl && (
        <PreviewOverlay
          url={previewUrl}
          onClose={() => setPreviewUrl(null)}
          onSave={handleSaveToAlbum}
        />
      )}
      {renderTrigger(handleSaveImage)}
    </>
  )
}

function PreviewOverlay({
  url,
  onClose,
  onSave,
}: {
  url: string
  onClose: () => void
  onSave: () => void
}) {
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
