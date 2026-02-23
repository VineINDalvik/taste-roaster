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

/**
 * Draws the MBTI share card onto a canvas.
 * Returns the actual content height (for cropping on export).
 */
function drawShareCard(ctx: CanvasRenderingContext2D, w: number, h: number, p: Props): number {
  const PAD = 32
  const CONTENT_W = w - PAD * 2

  // Background
  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#0f0c29')
  bg.addColorStop(0.5, '#1a1a2e')
  bg.addColorStop(1, '#0f3460')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  let y = 52

  // Label
  ctx.fillStyle = '#8b95a5'
  ctx.font = `14px ${F}`
  ctx.textAlign = 'center'
  const label = p.doubanName ? `${p.doubanName} 的书影音 MBTI` : '书影音 MBTI'
  ctx.fillText(label, w / 2, y)
  y += 52

  // MBTI type (large)
  ctx.font = `bold 56px ${F}`
  const grad = ctx.createLinearGradient(w / 2 - 80, y, w / 2 + 80, y)
  grad.addColorStop(0, '#667eea')
  grad.addColorStop(0.5, '#e94560')
  grad.addColorStop(1, '#f5c518')
  ctx.fillStyle = grad
  ctx.fillText(p.mbtiType, w / 2, y)
  y += 34

  // MBTI title — wrap if too long
  ctx.font = `17px ${F}`
  ctx.fillStyle = '#e94560'
  const titleLines = wrapText(ctx, p.mbtiTitle, CONTENT_W, 2)
  titleLines.forEach(line => {
    ctx.fillText(line, w / 2, y)
    y += 24
  })
  y += 20

  // Roast — properly wrapped
  ctx.font = `italic 14px ${F}`
  const roastLines = wrapText(ctx, `"${p.roast}"`, CONTENT_W - 28, 5)
  const roastLineH = 22
  const roastBlockH = roastLines.length * roastLineH + 24
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  rrect(ctx, PAD, y - 10, CONTENT_W, roastBlockH, 10)
  ctx.fill()
  ctx.fillStyle = '#d1d5db'
  ctx.textAlign = 'center'
  const roastStartY = y + 8
  roastLines.forEach((line, i) => {
    ctx.fillText(line, w / 2, roastStartY + i * roastLineH)
  })
  y += roastBlockH + 20

  // MBTI dimension bars
  const DIM_LABELS_DRAW: Record<string, [string, string]> = {
    ie: ['I', 'E'], ns: ['N', 'S'], tf: ['T', 'F'], jp: ['J', 'P']
  }
  const dims = [
    { key: 'ie', ...p.dimensions.ie },
    { key: 'ns', ...p.dimensions.ns },
    { key: 'tf', ...p.dimensions.tf },
    { key: 'jp', ...p.dimensions.jp },
  ]

  dims.forEach(d => {
    const [left, right] = DIM_LABELS_DRAW[d.key] ?? ['?', '?']
    const isLeft = d.letter === left
    const barX = PAD + 12
    const barW = CONTENT_W - 24

    ctx.font = `13px ${F}`
    ctx.textAlign = 'left'
    ctx.fillStyle = isLeft ? '#fff' : '#6b7280'
    ctx.fillText(left, barX, y)
    ctx.textAlign = 'right'
    ctx.fillStyle = !isLeft ? '#fff' : '#6b7280'
    ctx.fillText(right, barX + barW, y)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#6b7280'
    ctx.fillText(`${d.score}%`, w / 2, y)
    y += 14

    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    rrect(ctx, barX, y, barW, 7, 3.5)
    ctx.fill()

    const fillW = barW * (d.score / 100)
    const fillGrad = ctx.createLinearGradient(barX, y, barX + barW, y)
    if (isLeft) {
      fillGrad.addColorStop(0, '#667eea')
      fillGrad.addColorStop(1, '#764ba2')
      ctx.fillStyle = fillGrad
      rrect(ctx, barX, y, fillW, 7, 3.5)
      ctx.fill()
    } else {
      fillGrad.addColorStop(0, '#e94560')
      fillGrad.addColorStop(1, '#f5c518')
      ctx.fillStyle = fillGrad
      rrect(ctx, barX + barW - fillW, y, fillW, 7, 3.5)
      ctx.fill()
    }

    y += 26
  })

  y += 14

  // Stats row
  const stats = [
    { emoji: '📚', val: p.bookCount ?? 0, label: '本书' },
    { emoji: '🎬', val: p.movieCount ?? 0, label: '部电影' },
    { emoji: '🎵', val: p.musicCount ?? 0, label: '首音乐' },
  ].filter(s => s.val > 0)

  if (stats.length > 0) {
    const statW = CONTENT_W / stats.length
    stats.forEach((s, i) => {
      const sx = PAD + i * statW + statW / 2
      ctx.fillStyle = 'rgba(255,255,255,0.05)'
      rrect(ctx, PAD + i * statW + 4, y, statW - 8, 58, 8)
      ctx.fill()

      ctx.font = `14px ${F}`
      ctx.textAlign = 'center'
      ctx.fillStyle = '#fff'
      ctx.fillText(s.emoji, sx, y + 20)
      ctx.font = `bold 18px ${F}`
      ctx.fillText(String(s.val), sx, y + 40)
      ctx.font = `11px ${F}`
      ctx.fillStyle = '#9ca3af'
      ctx.fillText(s.label, sx, y + 54)
    })
    y += 76
  }

  // Summary — wrapped
  ctx.fillStyle = '#9ca3af'
  ctx.font = `13px ${F}`
  ctx.textAlign = 'center'
  const summaryLines = wrapText(ctx, p.summary, CONTENT_W, 10)
  summaryLines.forEach(line => {
    ctx.fillText(line, w / 2, y)
    y += 20
  })
  y += 20

  // Footer
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(w - PAD, y)
  ctx.stroke()
  y += 22

  ctx.font = `12px ${F}`
  ctx.textAlign = 'left'
  ctx.fillStyle = '#4b5563'
  ctx.fillText('豆瓣书影音 MBTI', PAD, y)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#667eea'
  ctx.fillText('测测你的书影音 MBTI →', w - PAD, y)

  y += 32

  return y
}
