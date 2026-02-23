import { useEffect, useRef } from 'react'
import { View, Canvas } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

const LABELS = ['深度', '广度', '独特性', '情感力', '时代感']
const KEYS = ['depth', 'breadth', 'uniqueness', 'emotionSensitivity', 'timeSpan']

interface Props {
  data: Record<string, number>
  size?: number
  canvasId?: string
}

export default function RadarChart({ data, size = 200, canvasId = 'radarCanvas' }: Props) {
  const drawnRef = useRef(false)

  useEffect(() => {
    if (drawnRef.current) return
    drawnRef.current = true

    setTimeout(() => {
      const query = Taro.createSelectorQuery()
      query.select(`#${canvasId}`)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res?.[0]?.node) return
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = Taro.getSystemInfoSync().pixelRatio || 2
          canvas.width = size * dpr
          canvas.height = size * dpr
          ctx.scale(dpr, dpr)
          drawRadar(ctx, data, size)
        })
    }, 300)
  }, [data, size, canvasId])

  return (
    <View className='radar-container'>
      <Canvas
        type='2d'
        id={canvasId}
        canvasId={canvasId}
        className='radar-canvas'
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    </View>
  )
}

function drawRadar(ctx: CanvasRenderingContext2D, data: Record<string, number>, size: number) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 25
  const count = KEYS.length

  const getPoint = (i: number, val: number) => {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2
    const ratio = val / 100
    return { x: cx + r * ratio * Math.cos(angle), y: cy + r * ratio * Math.sin(angle) }
  }

  // Grid lines
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

  // Labels
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '8px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  LABELS.forEach((label, i) => {
    const p = getPoint(i, 115)
    ctx.fillText(label, p.x, p.y)
  })

  // Data polygon
  const points = KEYS.map((key, i) => getPoint(i, data[key] ?? 50))

  ctx.beginPath()
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  })
  ctx.closePath()
  ctx.fillStyle = 'rgba(102,126,234,0.15)'
  ctx.fill()
  ctx.strokeStyle = '#667eea'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Dots
  points.forEach(p => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = '#667eea'
    ctx.fill()
  })
}
