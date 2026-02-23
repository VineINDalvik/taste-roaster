import { useState, useEffect, useRef, useMemo } from 'react'
import { View, Text, Canvas } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { MonthSnapshot } from '@/utils/types'
import './index.scss'

interface Props {
  months: MonthSnapshot[]
  trend?: string
  prediction?: string
}

function moodScoreFallback(mood: string, index: number): number {
  if (!mood) return 50 + Math.round(Math.sin(index * 1.2) * 15)
  let hash = 0
  for (let i = 0; i < mood.length; i++) {
    hash = (hash * 31 + mood.charCodeAt(i)) & 0xff
  }
  return 25 + Math.round((hash / 255) * 50)
}

function getEnergyLabel(score: number): string {
  if (score >= 80) return '狂热'
  if (score >= 60) return '活跃'
  if (score >= 40) return '平稳'
  if (score >= 20) return '内省'
  return '沉静'
}

function getEnergyColor(score: number): string {
  if (score >= 80) return '#f5c518'
  if (score >= 60) return '#e94560'
  if (score >= 40) return '#667eea'
  if (score >= 20) return '#764ba2'
  return '#4a5568'
}

export default function EvolutionCurve({ months, trend, prediction }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [drawn, setDrawn] = useState(false)
  const canvasRef = useRef(false)

  const points = useMemo(() => {
    const W = 320, PAD_X = 35, PAD_Y = 25, PAD_BOTTOM = 30
    const chartW = W - PAD_X * 2
    const chartH = 180 - PAD_Y - PAD_BOTTOM
    return months.map((m, i) => {
      const score = (m as any).moodScore ?? moodScoreFallback(m.mood, i)
      const x = months.length === 1 ? W / 2 : PAD_X + (i / (months.length - 1)) * chartW
      const y = PAD_Y + chartH - (score / 100) * chartH
      return { x, y, score }
    })
  }, [months])

  useEffect(() => {
    if (canvasRef.current || !months.length) return
    canvasRef.current = true
    const timer = setTimeout(() => {
      drawChart()
      setTimeout(() => setDrawn(true), 100)
    }, 300)
    return () => clearTimeout(timer)
  }, [months])

  useEffect(() => {
    if (!drawn || !months.length) return
    drawChart()
  }, [activeIndex, drawn])

  function drawChart() {
    const query = Taro.createSelectorQuery()
    query.select('#evoCurveCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res?.[0]?.node) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
        const dpr = Taro.getSystemInfoSync().pixelRatio || 2
        const W = 320, H = 180
        canvas.width = W * dpr
        canvas.height = H * dpr
        ctx.scale(dpr, dpr)
        ctx.clearRect(0, 0, W, H)
        renderCurve(ctx, W, H)
      })
  }

  function renderCurve(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const PAD_X = 35, PAD_Y = 25, PAD_BOTTOM = 30
    const chartW = W - PAD_X * 2
    const chartH = H - PAD_Y - PAD_BOTTOM
    const F = '"PingFang SC","Hiragino Sans GB",sans-serif'

    // Grid lines + Y labels
    const gridLabels = [
      { v: 0, label: '沉静' },
      { v: 50, label: '平稳' },
      { v: 100, label: '狂热' },
    ]
    gridLabels.forEach(({ v, label }) => {
      const y = PAD_Y + chartH - (v / 100) * chartH
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 0.5
      ctx.setLineDash([3, 6])
      ctx.beginPath()
      ctx.moveTo(PAD_X, y)
      ctx.lineTo(W - PAD_X, y)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.font = `8px ${F}`
      ctx.textAlign = 'right'
      ctx.fillText(label, PAD_X - 6, y + 3)
    })

    if (points.length < 2) {
      if (points.length === 1) {
        const p = points[0]
        ctx.beginPath()
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
        ctx.fillStyle = getEnergyColor(p.score)
        ctx.fill()
      }
      return
    }

    // Build path segments
    const buildPath = () => {
      const segs: { type: 'M' | 'C'; args: number[] }[] = []
      points.forEach((p, i) => {
        if (i === 0) {
          segs.push({ type: 'M', args: [p.x, p.y] })
        } else {
          const prev = points[i - 1]
          const tension = 0.3
          const dx = p.x - prev.x
          segs.push({ type: 'C', args: [prev.x + dx * tension, prev.y, p.x - dx * tension, p.y, p.x, p.y] })
        }
      })
      return segs
    }

    const segs = buildPath()

    // Area fill gradient
    const gradient = ctx.createLinearGradient(0, PAD_Y, 0, H - PAD_BOTTOM)
    gradient.addColorStop(0, 'rgba(233, 69, 96, 0.2)')
    gradient.addColorStop(1, 'rgba(233, 69, 96, 0)')

    ctx.beginPath()
    segs.forEach(s => {
      if (s.type === 'M') ctx.moveTo(s.args[0], s.args[1])
      else ctx.bezierCurveTo(s.args[0], s.args[1], s.args[2], s.args[3], s.args[4], s.args[5])
    })
    const lastPt = points[points.length - 1]
    const firstPt = points[0]
    ctx.lineTo(lastPt.x, H - PAD_BOTTOM)
    ctx.lineTo(firstPt.x, H - PAD_BOTTOM)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.globalAlpha = drawn ? 1 : 0
    ctx.fill()
    ctx.globalAlpha = 1

    // Curve line with gradient colors
    const lineGrad = ctx.createLinearGradient(firstPt.x, 0, lastPt.x, 0)
    lineGrad.addColorStop(0, '#764ba2')
    lineGrad.addColorStop(0.4, '#667eea')
    lineGrad.addColorStop(0.7, '#e94560')
    lineGrad.addColorStop(1, '#f5c518')

    ctx.beginPath()
    segs.forEach(s => {
      if (s.type === 'M') ctx.moveTo(s.args[0], s.args[1])
      else ctx.bezierCurveTo(s.args[0], s.args[1], s.args[2], s.args[3], s.args[4], s.args[5])
    })
    ctx.strokeStyle = lineGrad
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()

    // Points
    points.forEach((p, i) => {
      const isActive = activeIndex === i
      const color = getEnergyColor(p.score)

      if (isActive) {
        ctx.strokeStyle = color + '30'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(p.x, PAD_Y)
        ctx.lineTo(p.x, H - PAD_BOTTOM)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.beginPath()
        ctx.arc(p.x, p.y, 12, 0, Math.PI * 2)
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.3
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      ctx.beginPath()
      ctx.arc(p.x, p.y, isActive ? 8 : 5, 0, Math.PI * 2)
      ctx.fillStyle = isActive ? color : '#1a1a2e'
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()

      // Month label
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = `9px ${F}`
      ctx.textAlign = 'center'
      ctx.fillText(months[i].month.slice(5) + '月', p.x, H - PAD_BOTTOM + 14)
    })
  }

  function handleCanvasTap(e: any) {
    const touch = e.touches?.[0] || e.detail
    if (!touch) return

    const query = Taro.createSelectorQuery()
    query.select('#evoCurveCanvas').boundingClientRect().exec((res) => {
      if (!res?.[0]) return
      const rect = res[0]
      const dpr = Taro.getSystemInfoSync().pixelRatio || 2
      const scaleX = 320 / rect.width
      const tapX = (touch.clientX - rect.left) * scaleX
      const tapY = (touch.clientY - rect.top) * scaleX

      let closestIdx: number | null = null
      let closestDist = Infinity
      points.forEach((p, i) => {
        const dist = Math.sqrt((tapX - p.x) ** 2 + (tapY - p.y) ** 2)
        if (dist < 20 && dist < closestDist) {
          closestDist = dist
          closestIdx = i
        }
      })

      if (closestIdx !== null) {
        setActiveIndex(prev => prev === closestIdx ? null : closestIdx)
      }
    })
  }

  if (!months.length) return null

  const active = activeIndex !== null ? months[activeIndex] : null
  const activeScore = activeIndex !== null ? points[activeIndex]?.score : null

  return (
    <View className='evo-wrap card-glass'>
      <View className='evo-header'>
        <Text className='evo-title'>📈 品味进化曲线</Text>
        {activeScore !== null && (
          <Text className='evo-energy-badge' style={{ color: getEnergyColor(activeScore), background: getEnergyColor(activeScore) + '15' }}>
            {getEnergyLabel(activeScore)} {activeScore}
          </Text>
        )}
      </View>

      <Canvas
        type='2d'
        id='evoCurveCanvas'
        canvasId='evoCurveCanvas'
        className='evo-canvas'
        style={{ width: '320px', height: '180px' }}
        onTouchStart={handleCanvasTap}
      />

      {active ? (
        <View className='evo-detail animate-fade-in-up'>
          <View className='evo-detail-header'>
            <Text className='evo-detail-month'>{active.month}</Text>
            <Text className='evo-detail-mood' style={{ color: getEnergyColor(activeScore!), background: getEnergyColor(activeScore!) + '15' }}>
              {active.mood}
            </Text>
          </View>
          {active.books?.length > 0 && (
            <Text className='evo-detail-line'>📖 {active.books.join('、')}</Text>
          )}
          {active.movies?.length > 0 && (
            <Text className='evo-detail-line'>🎬 {active.movies.join('、')}</Text>
          )}
          {active.music?.length > 0 && (
            <Text className='evo-detail-line'>🎵 {active.music.join('、')}</Text>
          )}
          {active.tasteShift && (
            <Text className='evo-detail-shift'>{active.tasteShift}</Text>
          )}
          {active.roast && (
            <Text className='evo-detail-roast'>💬 {active.roast}</Text>
          )}
        </View>
      ) : (
        <Text className='evo-hint'>点击曲线上的圆点，查看月度品味详情</Text>
      )}

      {(trend || prediction) && (
        <View className='evo-trend-section'>
          {trend && <Text className='evo-trend-text'>{trend}</Text>}
          {prediction && (
            <Text className='evo-prediction'>🔮 {prediction}</Text>
          )}
        </View>
      )}
    </View>
  )
}
