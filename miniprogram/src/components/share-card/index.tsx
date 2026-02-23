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
const RADAR_KEYS = ['depth', 'breadth', 'uniqueness', 'emotionSensitivity', 'timeSpan']
const RADAR_LABELS_CN = ['深度', '广度', '独特性', '情感力', '时代感']

export default function ShareCard(props: Props) {
  const {
    mbtiType, mbtiTitle, dimensions, roast, radarData,
    summary, itemCount, doubanName, bookCount, movieCount, musicCount,
    renderTrigger,
  } = props

  const handleSaveImage = useCallback(async () => {
    try {
      Taro.showLoading({ title: '生成中...' })

      const query = Taro.createSelectorQuery()
      query.select('#shareCanvas')
        .fields({ node: true, size: true })
        .exec(async (res) => {
          if (!res?.[0]?.node) {
            Taro.hideLoading()
            Taro.showToast({ title: '生成失败', icon: 'error' })
            return
          }

          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = 1.5
          const w = 500
          const h = 750
          canvas.width = w * dpr
          canvas.height = h * dpr
          ctx.scale(dpr, dpr)

          drawShareCard(ctx, w, h, props)

          setTimeout(() => {
            Taro.canvasToTempFilePath({
              canvas,
              width: w * dpr,
              height: h * dpr,
              destWidth: w * dpr,
              destHeight: h * dpr,
              fileType: 'png',
              success: (result) => {
                Taro.hideLoading()
                Taro.saveImageToPhotosAlbum({
                  filePath: result.tempFilePath,
                  success: () => Taro.showToast({ title: '已保存到相册', icon: 'success' }),
                  fail: () => {
                    Taro.showToast({ title: '请授权相册权限', icon: 'none' })
                  }
                })
              },
              fail: () => {
                Taro.hideLoading()
                Taro.showToast({ title: '生成失败', icon: 'error' })
              }
            })
          }, 150)
        })
    } catch {
      Taro.hideLoading()
      Taro.showToast({ title: '保存失败', icon: 'error' })
    }
  }, [props])

  if (renderTrigger) {
    return (
      <>
        <Canvas
          type='2d'
          id='shareCanvas'
          canvasId='shareCanvas'
          className='share-canvas-hidden'
          style={{ width: '500px', height: '750px' }}
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
            <Text className='card-footer-left'>基于 {itemCount} 条书影音数据</Text>
            <Text className='card-footer-right'>测测你的书影音 MBTI →</Text>
          </View>
        </View>
      </View>

      <Canvas
        type='2d'
        id='shareCanvas'
        canvasId='shareCanvas'
        className='share-canvas-hidden'
        style={{ width: '500px', height: '750px' }}
      />
    </View>
  )
}

function drawShareCard(ctx: CanvasRenderingContext2D, w: number, h: number, p: Props) {
  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#0f0c29')
  bg.addColorStop(0.5, '#1a1a2e')
  bg.addColorStop(1, '#0f3460')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  let y = 40

  ctx.fillStyle = '#6b7280'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  const label = p.doubanName ? `${p.doubanName} 的书影音 MBTI` : '书影音 MBTI'
  ctx.fillText(label, w / 2, y)
  y += 40

  ctx.font = 'bold 48px sans-serif'
  const grad = ctx.createLinearGradient(w / 2 - 70, y, w / 2 + 70, y)
  grad.addColorStop(0, '#667eea')
  grad.addColorStop(0.5, '#e94560')
  grad.addColorStop(1, '#f5c518')
  ctx.fillStyle = grad
  ctx.fillText(p.mbtiType, w / 2, y)
  y += 26

  ctx.font = '14px sans-serif'
  ctx.fillStyle = '#e94560'
  ctx.fillText(p.mbtiTitle, w / 2, y)
  y += 30

  ctx.fillStyle = 'rgba(255,255,255,0.03)'
  const roastW = w - 50
  ctx.fillRect(25, y - 12, roastW, 38)
  ctx.fillStyle = '#d1d5db'
  ctx.font = 'italic 11px sans-serif'
  ctx.fillText(`"${p.roast.slice(0, 45)}${p.roast.length > 45 ? '...' : ''}"`, w / 2, y + 10)
  y += 50

  const dims = [
    { key: 'ie', ...p.dimensions.ie },
    { key: 'ns', ...p.dimensions.ns },
    { key: 'tf', ...p.dimensions.tf },
    { key: 'jp', ...p.dimensions.jp },
  ]
  const DIM_LABELS_DRAW: Record<string, [string, string]> = {
    ie: ['I', 'E'], ns: ['N', 'S'], tf: ['T', 'F'], jp: ['J', 'P']
  }

  dims.forEach(d => {
    const [left, right] = DIM_LABELS_DRAW[d.key] ?? ['?', '?']
    const isLeft = d.letter === left
    const barX = 40
    const barW = w - 80

    ctx.font = '10px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillStyle = isLeft ? '#fff' : '#6b7280'
    ctx.fillText(left, barX, y)
    ctx.textAlign = 'right'
    ctx.fillStyle = !isLeft ? '#fff' : '#6b7280'
    ctx.fillText(right, barX + barW, y)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#4b5563'
    ctx.fillText(`${d.score}%`, w / 2, y)
    y += 12

    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.beginPath()
    ctx.roundRect(barX, y, barW, 5, 2.5)
    ctx.fill()

    const fillW = barW * (d.score / 100)
    const fillGrad = ctx.createLinearGradient(barX, y, barX + barW, y)
    if (isLeft) {
      fillGrad.addColorStop(0, '#667eea')
      fillGrad.addColorStop(1, '#764ba2')
      ctx.fillStyle = fillGrad
      ctx.beginPath()
      ctx.roundRect(barX, y, fillW, 5, 2.5)
      ctx.fill()
    } else {
      fillGrad.addColorStop(0, '#e94560')
      fillGrad.addColorStop(1, '#f5c518')
      ctx.fillStyle = fillGrad
      ctx.beginPath()
      ctx.roundRect(barX + barW - fillW, y, fillW, 5, 2.5)
      ctx.fill()
    }

    y += 20
  })

  y += 8

  const stats = [
    { emoji: '📚', val: p.bookCount ?? 0, label: '本书' },
    { emoji: '🎬', val: p.movieCount ?? 0, label: '部电影' },
    { emoji: '🎵', val: p.musicCount ?? 0, label: '首音乐' },
  ]
  const statW = (w - 60) / 3
  stats.forEach((s, i) => {
    const sx = 30 + i * statW + statW / 2
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.beginPath()
    ctx.roundRect(30 + i * statW + 3, y, statW - 6, 48, 6)
    ctx.fill()

    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#fff'
    ctx.fillText(s.emoji, sx, y + 16)
    ctx.font = 'bold 14px sans-serif'
    ctx.fillText(String(s.val), sx, y + 33)
    ctx.font = '9px sans-serif'
    ctx.fillStyle = '#9ca3af'
    ctx.fillText(s.label, sx, y + 45)
  })
  y += 65

  ctx.fillStyle = '#9ca3af'
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  const summaryLines = wrapText(ctx, p.summary, w - 60)
  summaryLines.forEach(line => {
    ctx.fillText(line, w / 2, y)
    y += 16
  })
  y += 12

  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.beginPath()
  ctx.moveTo(25, y)
  ctx.lineTo(w - 25, y)
  ctx.stroke()
  y += 16

  ctx.font = '9px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#4b5563'
  ctx.fillText(`基于 ${p.itemCount} 条书影音数据`, 25, y)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#667eea'
  ctx.fillText('测测你的书影音 MBTI →', w - 25, y)
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const ch of text) {
    const test = line + ch
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line)
      line = ch
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, 4)
}
