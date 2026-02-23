import { View, Text } from '@tarojs/components'
import type { MBTIDimension } from '@/utils/types'
import './index.scss'

const DIM_LABELS: Record<string, [string, string]> = {
  ie: ['I 内向', 'E 外向'],
  ns: ['N 直觉', 'S 感知'],
  tf: ['T 思维', 'F 情感'],
  jp: ['J 判断', 'P 感知'],
}

interface Props {
  dimKey: string
  dim: MBTIDimension
}

export default function DimensionBar({ dimKey, dim }: Props) {
  const [leftLabel, rightLabel] = DIM_LABELS[dimKey] ?? ['?', '?']
  const isLeft = dim.letter === leftLabel[0]
  const pct = dim.score

  return (
    <View className='dim-bar'>
      <View className='dim-labels'>
        <Text className={isLeft ? 'label-active' : 'label-dim'}>{leftLabel}</Text>
        <Text className='label-pct'>{pct}%</Text>
        <Text className={!isLeft ? 'label-active' : 'label-dim'}>{rightLabel}</Text>
      </View>
      <View className='dim-track'>
        <View
          className='dim-fill'
          style={{
            width: `${pct}%`,
            [isLeft ? 'left' : 'right']: 0,
            background: isLeft
              ? 'linear-gradient(90deg, #667eea, #764ba2)'
              : 'linear-gradient(90deg, #e94560, #f5c518)',
          }}
        />
      </View>
    </View>
  )
}
