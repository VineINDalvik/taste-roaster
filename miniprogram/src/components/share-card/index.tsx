import React, { useCallback } from 'react'
import { View, Text, Canvas } from '@tarojs/components'
import Taro from '@tarojs/taro'
import type { MBTIDimension, RadarData } from '@/utils/types'
import DimensionBar from '@/components/dimension-bar'
import RadarChart from '@/components/radar-chart'
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

const DIM_LABELS: Record<string, [string, string]> = {
  ie: ['I 内向', 'E 外向'],
  ns: ['N 直觉', 'S 感知'],
  tf: ['T 思维', 'F 情感'],
  jp: ['J 判断', 'P 感知'],
}
const RADAR_KEYS = ['wenqing', 'emo', 'shekong', 'kaogu', 'shangtou', 'chouxiang']
const RADAR_LABELS_CN = ['文青浓度', 'emo指数', '社恐值', '考古癖', '上头指数', '活人感']

const CANVAS_W = 375
const CANVAS_TEMP_H = 1000

export default function ShareCard(props: Props) {
  const {
    mbtiType, mbtiTitle, dimensions, roast, radarData,
    summary, itemCount, doubanName, bookCount, movieCount, musicCount,
    renderTrigger,
  } = props

  const handleSaveImage = useCallback(async () => {
    Taro.showLoading({ title: '生成中...' })

    const query = Taro.createSelectorQuery()
    query.select('#shareCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        try {
          if (!res?.[0]?.node) {
            Taro.hideLoading()
            Taro.showToast({ title: '生成失败', icon: 'error' })
            return
          }

          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = 2
          const w = CANVAS_W
          canvas.width = w * dpr
          canvas.height = CANVAS_TEMP_H * dpr
          ctx.scale(dpr, dpr)

          const contentH = drawShareCard(ctx, w, CANVAS_TEMP_H, props)

          setTimeout(() => {
            Taro.canvasToTempFilePath({
              canvas,
              x: 0,
              y: 0,
              width: w * dpr,
              height: contentH * dpr,
              destWidth: w * dpr,
              destHeight: contentH * dpr,
              fileType: 'jpg',
              quality: 0.92,
              success: (result) => {
                Taro.hideLoading()
                Taro.previewImage({
                  current: result.tempFilePath,
                  urls: [result.tempFilePath],
                })
              },
              fail: (err) => {
                console.error('canvasToTempFilePath fail:', err)
                Taro.hideLoading()
                Taro.showToast({ title: '生成失败', icon: 'error' })
              }
            })
          }, 500)
        } catch (e) {
          console.error('Canvas draw error:', e)
          Taro.hideLoading()
          Taro.showToast({ title: '生成失败', icon: 'error' })
        }
      })
  }, [props])

  if (renderTrigger) {
    return (
      <>
        <Canvas
          type='2d'
          id='shareCanvas'
          canvasId='shareCanvas'
          className='share-canvas-hidden'
          style={{ width: `${CANVAS_W}px`, height: `${CANVAS_TEMP_H}px` }}
        />
        {renderTrigger(handleSaveImage)}
      </>
    )
  }

  return (
    <View className='share-card-wrap'>
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
            <Text className='card-roast'>"{roast}"</Text>
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

      <Canvas
        type='2d'
        id='shareCanvas'
        canvasId='shareCanvas'
        className='share-canvas-hidden'
        style={{ width: `${CANVAS_W}px`, height: `${CANVAS_TEMP_H}px` }}
      />
    </View>
  )
}

// --- Canvas drawing helpers ---

const F = '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", sans-serif'

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines = 20): string[] {
  const lines: string[] = []
  let line = ''
  for (const ch of text) {
    if (ch === '\n') {
      lines.push(line)
      line = ''
      continue
    }
    const test = line + ch
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line)
      line = ch
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, maxLines)
}

const DRAW_RADAR_KEYS: (keyof RadarData)[] = ['wenqing', 'emo', 'shekong', 'kaogu', 'shangtou', 'chouxiang']
const DRAW_RADAR_LABELS = ['文青浓度', 'emo指数', '社恐值', '考古癖', '上头指数', '活人感']
const DIM_FULL: Record<string, [string, string]> = {
  ie: ['I 内向', 'E 外向'],
  ns: ['N 直觉', 'S 感知'],
  tf: ['T 思维', 'F 情感'],
  jp: ['J 判断', 'P 感知'],
}

function drawRadar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, data: RadarData) {
  const n = DRAW_RADAR_KEYS.length
  const getPoint = (i: number, ratio: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    return { x: cx + r * ratio * Math.cos(angle), y: cy + r * ratio * Math.sin(angle) }
  }

  // Grid rings
  for (const s of [0.25, 0.5, 0.75, 1]) {
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const pt = getPoint(i % n, s)
      i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)
    }
    ctx.closePath()
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }

  // Axis lines
  for (let i = 0; i < n; i++) {
    const pt = getPoint(i, 1)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(pt.x, pt.y)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }

  // Data polygon
  ctx.beginPath()
  for (let i = 0; i <= n; i++) {
    const key = DRAW_RADAR_KEYS[i % n]
    const val = (data[key] ?? 50) / 100
    const pt = getPoint(i % n, val)
    i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)
  }
  ctx.closePath()
  ctx.fillStyle = 'rgba(102, 126, 234, 0.2)'
  ctx.fill()
  ctx.strokeStyle = '#667eea'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Data dots
  for (let i = 0; i < n; i++) {
    const key = DRAW_RADAR_KEYS[i]
    const val = (data[key] ?? 50) / 100
    const pt = getPoint(i, val)
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = '#667eea'
    ctx.fill()
  }

  // Labels
  ctx.font = `9px ${F}`
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  for (let i = 0; i < n; i++) {
    const pt = getPoint(i, 1.25)
    ctx.fillText(DRAW_RADAR_LABELS[i], pt.x, pt.y + 3)
  }
}

/**
 * Draws the MBTI share card onto a canvas.
 * Faithfully reproduces the product UI layout.
 * Returns the actual content height (for cropping on export).
 */
function drawShareCard(ctx: CanvasRenderingContext2D, w: number, h: number, p: Props): number {
  const PAD = 28
  const CONTENT_W = w - PAD * 2

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#0f0c29')
  bg.addColorStop(0.3, '#1a1a2e')
  bg.addColorStop(0.6, '#16213e')
  bg.addColorStop(1, '#0f3460')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // Decorative glow spots (like product UI)
  ctx.save()
  ctx.globalAlpha = 0.12
  const glow1 = ctx.createRadialGradient(w - 40, 30, 0, w - 40, 30, 80)
  glow1.addColorStop(0, '#667eea')
  glow1.addColorStop(1, 'transparent')
  ctx.fillStyle = glow1
  ctx.fillRect(0, 0, w, 150)
  const glow2 = ctx.createRadialGradient(40, h - 40, 0, 40, h - 40, 70)
  glow2.addColorStop(0, '#e94560')
  glow2.addColorStop(1, 'transparent')
  ctx.fillStyle = glow2
  ctx.fillRect(0, h - 150, w, 150)
  ctx.restore()

  let y = 44

  // Header label
  ctx.fillStyle = '#6b7280'
  ctx.font = `11px ${F}`
  ctx.textAlign = 'center'
  ctx.letterSpacing = '3px'
  const label = p.doubanName ? `${p.doubanName.toUpperCase()} 的书影音 MBTI` : '书影音 MBTI'
  ctx.fillText(label, w / 2, y)
  ctx.letterSpacing = '0px'
  y += 44

  // MBTI type (large gradient text)
  ctx.font = `bold 52px ${F}`
  const grad = ctx.createLinearGradient(w / 2 - 75, y - 10, w / 2 + 75, y + 10)
  grad.addColorStop(0, '#667eea')
  grad.addColorStop(0.5, '#e94560')
  grad.addColorStop(1, '#f5c518')
  ctx.fillStyle = grad
  ctx.fillText(p.mbtiType, w / 2, y)
  y += 30

  // MBTI title
  ctx.font = `500 16px ${F}`
  ctx.fillStyle = '#e94560'
  const titleLines = wrapText(ctx, p.mbtiTitle, CONTENT_W, 2)
  titleLines.forEach(line => {
    ctx.fillText(line, w / 2, y)
    y += 22
  })
  y += 16

  // Roast box (matching product UI style)
  ctx.font = `13px ${F}`
  const roastLines = wrapText(ctx, `"${p.roast}"`, CONTENT_W - 32, 6)
  const roastLineH = 20
  const roastPadV = 14
  const roastBlockH = roastLines.length * roastLineH + roastPadV * 2
  // Box background
  ctx.fillStyle = 'rgba(255,255,255,0.03)'
  rrect(ctx, PAD, y - roastPadV + 4, CONTENT_W, roastBlockH, 10)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 0.5
  ctx.stroke()
  // Roast text
  ctx.fillStyle = '#d1d5db'
  ctx.textAlign = 'center'
  roastLines.forEach((line, i) => {
    ctx.fillText(line, w / 2, y + 4 + i * roastLineH)
  })
  y += roastBlockH + 16

  // Dimension bars (matching product: "I 内向" / "E 外向" full labels)
  const dims = [
    { key: 'ie', ...p.dimensions.ie },
    { key: 'ns', ...p.dimensions.ns },
    { key: 'tf', ...p.dimensions.tf },
    { key: 'jp', ...p.dimensions.jp },
  ]

  dims.forEach(d => {
    const [leftFull, rightFull] = DIM_FULL[d.key] ?? ['?', '?']
    const leftLetter = leftFull[0]
    const isLeft = d.letter === leftLetter

    // Row: leftLabel ... score% ... rightLabel
    ctx.font = `12px ${F}`
    ctx.textAlign = 'left'
    ctx.fillStyle = isLeft ? '#fff' : '#4b5563'
    if (isLeft) ctx.font = `bold 12px ${F}`
    ctx.fillText(leftFull, PAD, y)

    ctx.font = `12px ${F}`
    ctx.textAlign = 'right'
    ctx.fillStyle = !isLeft ? '#fff' : '#4b5563'
    if (!isLeft) ctx.font = `bold 12px ${F}`
    ctx.fillText(rightFull, w - PAD, y)

    ctx.font = `11px ${F}`
    ctx.textAlign = 'center'
    ctx.fillStyle = '#6b7280'
    ctx.fillText(`${d.score}%`, w / 2, y)
    y += 10

    // Bar
    const barX = PAD
    const barW = CONTENT_W
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    rrect(ctx, barX, y, barW, 6, 3)
    ctx.fill()

    const fillW = barW * (d.score / 100)
    const fillGrad = ctx.createLinearGradient(barX, y, barX + barW, y)
    if (isLeft) {
      fillGrad.addColorStop(0, '#667eea')
      fillGrad.addColorStop(1, '#764ba2')
      ctx.fillStyle = fillGrad
      rrect(ctx, barX, y, fillW, 6, 3)
      ctx.fill()
    } else {
      fillGrad.addColorStop(0, '#e94560')
      fillGrad.addColorStop(1, '#f5c518')
      ctx.fillStyle = fillGrad
      rrect(ctx, barX + barW - fillW, y, fillW, 6, 3)
      ctx.fill()
    }
    y += 22
  })

  y += 10

  // Radar chart (left) + Stats (right) — matching product layout
  const radarSize = 55
  const radarCx = PAD + radarSize + 12
  const radarCy = y + radarSize + 4
  drawRadar(ctx, radarCx, radarCy, radarSize, p.radarData)

  // Stats on the right side
  const statsX = PAD + radarSize * 2 + 36
  const statsW = w - statsX - PAD
  const statItems = [
    { emoji: '📚', val: p.bookCount ?? 0, label: '本书' },
    { emoji: '🎬', val: p.movieCount ?? 0, label: '部电影' },
    { emoji: '🎵', val: p.musicCount ?? 0, label: '首音乐' },
  ].filter(s => s.val > 0)

  let statY = y + 6
  statItems.forEach(s => {
    // Stat row background
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    rrect(ctx, statsX, statY, statsW, 30, 8)
    ctx.fill()

    // Emoji
    ctx.font = `12px ${F}`
    ctx.textAlign = 'left'
    ctx.fillStyle = '#fff'
    ctx.fillText(s.emoji, statsX + 10, statY + 20)

    // Number (bold)
    ctx.font = `bold 16px ${F}`
    ctx.fillStyle = '#fff'
    ctx.fillText(String(s.val), statsX + 30, statY + 20)

    // Label
    const numW = ctx.measureText(String(s.val)).width
    ctx.font = `10px ${F}`
    ctx.fillStyle = '#6b7280'
    ctx.fillText(s.label, statsX + 32 + numW, statY + 20)

    statY += 36
  })

  y = Math.max(radarCy + radarSize + 20, statY + 8)

  // Summary
  ctx.fillStyle = '#9ca3af'
  ctx.font = `12px ${F}`
  ctx.textAlign = 'center'
  const summaryLines = wrapText(ctx, p.summary, CONTENT_W, 8)
  summaryLines.forEach(line => {
    ctx.fillText(line, w / 2, y)
    y += 18
  })
  y += 16

  // Footer divider
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(w - PAD, y)
  ctx.stroke()
  y += 18

  ctx.font = `10px ${F}`
  ctx.textAlign = 'left'
  ctx.fillStyle = '#4b5563'
  ctx.fillText('豆瓣书影音 MBTI', PAD, y)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#667eea'
  ctx.fillText('测测你的书影音 MBTI →', w - PAD, y)

  y += 24

  return y
}
