import { useEffect, useRef } from 'react'
import { View, Text, Canvas } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

const LABELS = ['深度', '广度', '独特性', '情感力', '时代感']
const KEYS = ['depth', 'breadth', 'uniqueness', 'emotionSensitivity', 'timeSpan']

interface Props {
  dataA: Record<string, number>
  dataB: Record<string, number>
  nameA: string
  nameB: string
}

export default function DualRadar({ dataA, dataB, nameA, nameB }: Props) {
  const size = 200
  const drawnRef = useRef(false)

  useEffect(() => {
    if (drawnRef.current) return
    drawnRef.current = true

    setTimeout(() => {
      const query = Taro.createSelectorQuery()
      query.select('#dualRadarCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res?.[0]?.node) return
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = Taro.getSystemInfoSync().pixelRatio || 2
          canvas.width = size * dpr
          canvas.height = size * dpr
          ctx.scale(dpr, dpr)
          drawDualRadar(ctx, dataA, dataB, size)
        })
    }, 300)
  }, [dataA, dataB])

  return (
    <View className='dual-radar-wrap'>
      <Canvas
        type='2d'
        id='dualRadarCanvas'
        canvasId='dualRadarCanvas'
        className='dual-radar-canvas'
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      <View className='legend'>
        <View className='legend-item'>
          <View className='legend-dot' style={{ background: '#667eea' }} />
          <Text className='legend-text'>{nameA}</Text>
        </View>
        <View className='legend-item'>
          <View className='legend-dot' style={{ background: '#e94560' }} />
          <Text className='legend-text'>{nameB}</Text>
        </View>
      </View>
    </View>
  )
}

function drawDualRadar(
  ctx: CanvasRenderingContext2D,
  dataA: Record<string, number>,
  dataB: Record<string, number>,
  size: number
) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 25
  const count = KEYS.length

  const getPoint = (i: number, val: number) => {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2
    const ratio = val / 100
    return { x: cx + r * ratio * Math.cos(angle), y: cy + r * ratio * Math.sin(angle) }
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 0.5
  for (const s of [0.25, 0.5, 0.75, 1]) {
    ctx.beginPath()
    for (let i = 0; i <= count; i++) {
      const p = getPoint(i % count, s * 100)
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.closePath()
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '8px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  LABELS.forEach((label, i) => {
    const p = getPoint(i, 120)
    ctx.fillText(label, p.x, p.y)
  })

  // Person A polygon
  const pointsA = KEYS.map((key, i) => getPoint(i, dataA[key] ?? 50))
  ctx.beginPath()
  pointsA.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y) })
  ctx.closePath()
  ctx.fillStyle = 'rgba(102,126,234,0.12)'
  ctx.fill()
  ctx.strokeStyle = '#667eea'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Person B polygon
  const pointsB = KEYS.map((key, i) => getPoint(i, dataB[key] ?? 50))
  ctx.beginPath()
  pointsB.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y) })
  ctx.closePath()
  ctx.fillStyle = 'rgba(233,69,96,0.12)'
  ctx.fill()
  ctx.strokeStyle = '#e94560'
  ctx.lineWidth = 1.5
  ctx.stroke()
}
