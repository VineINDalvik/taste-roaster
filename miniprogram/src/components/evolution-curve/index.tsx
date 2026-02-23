import { useEffect, useRef } from 'react'
import { View, Text, Canvas } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { EvolutionPoint } from '@/utils/types'
import './index.scss'

interface Props {
  data: EvolutionPoint[]
  title?: string
}

export default function EvolutionCurve({ data, title = '观影品味进化曲线' }: Props) {
  const drawnRef = useRef(false)

  useEffect(() => {
    if (drawnRef.current || !data.length) return
    drawnRef.current = true

    setTimeout(() => {
      const query = Taro.createSelectorQuery()
      query.select('#evolutionCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res?.[0]?.node) return
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = Taro.getSystemInfoSync().pixelRatio || 2
          const w = 320
          const h = 200
          canvas.width = w * dpr
          canvas.height = h * dpr
          ctx.scale(dpr, dpr)
          drawCurve(ctx, data, w, h)
        })
    }, 300)
  }, [data])

  if (!data.length) return null

  return (
    <View className='evo-wrap card-glass'>
      <Text className='evo-title'>📈 {title}</Text>
      <Canvas
        type='2d'
        id='evolutionCanvas'
        canvasId='evolutionCanvas'
        className='evo-canvas'
        style={{ width: '320px', height: '200px' }}
      />
      <View className='evo-labels'>
        {data.map((p, i) => (
          <View key={i} className='evo-label-item'>
            <Text className='evo-label-month'>{p.month.slice(5)}</Text>
            <Text className='evo-label-genre'>{p.genre}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function drawCurve(ctx: CanvasRenderingContext2D, data: EvolutionPoint[], w: number, h: number) {
  const padL = 30, padR = 15, padT = 20, padB = 30
  const plotW = w - padL - padR
  const plotH = h - padT - padB

  const maxScore = Math.max(...data.map(d => d.score), 100)
  const minScore = Math.min(...data.map(d => d.score), 0)
  const range = maxScore - minScore || 1

  const getX = (i: number) => padL + (i / (data.length - 1 || 1)) * plotW
  const getY = (v: number) => padT + plotH - ((v - minScore) / range) * plotH

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= 4; i++) {
    const y = padT + (plotH * i) / 4
    ctx.beginPath()
    ctx.moveTo(padL, y)
    ctx.lineTo(w - padR, y)
    ctx.stroke()
  }

  // Y-axis labels
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.font = '8px sans-serif'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 4; i++) {
    const val = Math.round(minScore + (range * (4 - i)) / 4)
    const y = padT + (plotH * i) / 4
    ctx.fillText(String(val), padL - 5, y + 3)
  }

  if (data.length < 2) return

  // Gradient fill under curve
  const gradient = ctx.createLinearGradient(0, padT, 0, padT + plotH)
  gradient.addColorStop(0, 'rgba(102, 126, 234, 0.25)')
  gradient.addColorStop(1, 'rgba(102, 126, 234, 0)')

  ctx.beginPath()
  ctx.moveTo(getX(0), padT + plotH)
  data.forEach((d, i) => ctx.lineTo(getX(i), getY(d.score)))
  ctx.lineTo(getX(data.length - 1), padT + plotH)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.fill()

  // Smooth curve line
  ctx.beginPath()
  ctx.strokeStyle = '#667eea'
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  data.forEach((d, i) => {
    const x = getX(i)
    const y = getY(d.score)
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      const prevX = getX(i - 1)
      const prevY = getY(data[i - 1].score)
      const cpx = (prevX + x) / 2
      ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y)
    }
  })
  ctx.stroke()

  // Dots + labels
  data.forEach((d, i) => {
    const x = getX(i)
    const y = getY(d.score)

    // Glow
    ctx.beginPath()
    ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(102,126,234,0.2)'
    ctx.fill()

    // Dot
    ctx.beginPath()
    ctx.arc(x, y, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#667eea'
    ctx.fill()
    ctx.strokeStyle = '#0f0c29'
    ctx.lineWidth = 1
    ctx.stroke()

    // Score label on significant points
    if (i === 0 || i === data.length - 1 || Math.abs(d.score - data[Math.max(0, i - 1)].score) > 10) {
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 9px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(d.label || String(d.score), x, y - 10)
    }
  })
}
