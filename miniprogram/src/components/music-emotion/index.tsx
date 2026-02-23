import { View, Text } from '@tarojs/components'
import type { MusicEmotion } from '@/utils/types'
import './index.scss'

interface Props {
  emotions: MusicEmotion[]
  summary?: string
}

const DEFAULT_COLORS = ['#667eea', '#e94560', '#f5c518', '#22c55e', '#a855f7', '#06b6d4']

export default function MusicEmotionPortrait({ emotions, summary }: Props) {
  if (!emotions.length) return null

  const sorted = [...emotions].sort((a, b) => b.percentage - a.percentage)
  const topEmotion = sorted[0]

  return (
    <View className='me-wrap card-glass'>
      <Text className='me-section-title'>🎵 音乐情绪画像</Text>

      {/* Hero emotion */}
      <View className='me-hero'>
        <View className='me-hero-ring' style={{ borderColor: topEmotion.color || DEFAULT_COLORS[0] }}>
          <Text className='me-hero-pct'>{topEmotion.percentage}%</Text>
        </View>
        <Text className='me-hero-label' style={{ color: topEmotion.color || DEFAULT_COLORS[0] }}>
          {topEmotion.emotion}
        </Text>
        <Text className='me-hero-desc'>你的音乐主色调</Text>
      </View>

      {/* Emotion bars */}
      <View className='me-bars'>
        {sorted.map((e, i) => {
          const color = e.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]
          return (
            <View key={e.emotion} className='me-bar-row'>
              <Text className='me-bar-label'>{e.emotion}</Text>
              <View className='me-bar-track'>
                <View
                  className='me-bar-fill'
                  style={{ width: `${e.percentage}%`, background: color }}
                />
              </View>
              <Text className='me-bar-pct' style={{ color }}>{e.percentage}%</Text>
            </View>
          )
        })}
      </View>

      {/* Representative tracks */}
      {sorted.slice(0, 3).map((e, i) => {
        if (!e.tracks?.length) return null
        const color = e.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]
        return (
          <View key={e.emotion} className='me-tracks'>
            <Text className='me-tracks-label' style={{ color }}>
              {e.emotion} 代表曲目
            </Text>
            <View className='me-tracks-list'>
              {e.tracks.slice(0, 3).map((t, j) => (
                <Text key={j} className='me-track-item'>♪ {t}</Text>
              ))}
            </View>
          </View>
        )
      })}

      {/* Summary */}
      {summary && (
        <View className='me-summary'>
          <Text className='me-summary-text'>{summary}</Text>
        </View>
      )}
    </View>
  )
}
