import Taro from '@tarojs/taro'

const DPR = 2
const CARD_W = 375
const PAD = 24
const CONTENT_W = CARD_W - PAD * 2

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

function drawBg(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#0f0c29')
  bg.addColorStop(0.4, '#1a1a2e')
  bg.addColorStop(1, '#0f3460')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  maxLines = 50
): string[] {
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

function drawFooter(ctx: CanvasRenderingContext2D, w: number, y: number): number {
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.beginPath()
  ctx.moveTo(PAD, y)
  ctx.lineTo(w - PAD, y)
  ctx.stroke()
  y += 20

  ctx.font = '10px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#4b5563'
  ctx.fillText('豆瓣书影音 MBTI', PAD, y)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#667eea'
  ctx.fillText('品味即人格 →', w - PAD, y)

  return y + 20
}

function saveCanvasToPreview(canvas: any): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      Taro.canvasToTempFilePath({
        canvas,
        fileType: 'jpg',
        quality: 0.92,
        success: (result) => {
          Taro.hideLoading()
          Taro.previewImage({
            current: result.tempFilePath,
            urls: [result.tempFilePath],
          })
          resolve()
        },
        fail: (err) => {
          console.error('canvasToTempFilePath fail:', err)
          Taro.hideLoading()
          Taro.showToast({ title: '生成失败', icon: 'error' })
          reject(new Error('canvas export failed'))
        }
      })
    }, 500)
  })
}

interface AnalysisCardOpts {
  icon: string
  title: string
  content: string
  mbtiType: string
  doubanName?: string
}

export async function saveAnalysisCard(
  canvasId: string,
  opts: AnalysisCardOpts
) {
  Taro.showLoading({ title: '生成中...' })

  const query = Taro.createSelectorQuery()
  query.select(`#${canvasId}`)
    .fields({ node: true, size: true })
    .exec(async (res) => {
      try {
        if (!res?.[0]?.node) {
          Taro.hideLoading()
          Taro.showToast({ title: '生成失败', icon: 'error' })
          return
        }

        const canvas = res[0].node
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
        const w = CARD_W
        const tempH = 800
        canvas.width = w * DPR
        canvas.height = tempH * DPR
        ctx.scale(DPR, DPR)

        drawBg(ctx, w, tempH)

        let y = 36

        if (opts.doubanName) {
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillStyle = '#6b7280'
          ctx.fillText(`${opts.doubanName} · ${opts.mbtiType}`, w / 2, y)
          y += 24
        }

        ctx.font = 'bold 16px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillStyle = '#e94560'
        ctx.fillText(`${opts.icon} ${opts.title}`, PAD, y)
        y += 28

        ctx.font = '13px sans-serif'
        ctx.fillStyle = '#d1d5db'
        const lines = wrapText(ctx, opts.content, CONTENT_W)
        for (const line of lines) {
          ctx.fillText(line, PAD, y)
          y += 18
        }
        y += 16

        const finalH = drawFooter(ctx, w, y)

        await saveCanvasToPreview(canvas, w * DPR, finalH * DPR)
      } catch (e) {
        console.error('Canvas draw error:', e)
        Taro.hideLoading()
        Taro.showToast({ title: '生成失败', icon: 'error' })
      }
    })
}

interface FullReportOpts {
  mbtiType: string
  mbtiTitle: string
  roast: string
  summary: string
  doubanName?: string
  bookCount: number
  movieCount: number
  musicCount: number
  bookAnalysis?: string
  movieAnalysis?: string
  musicAnalysis?: string
}

export async function saveFullReport(
  canvasId: string,
  opts: FullReportOpts
) {
  Taro.showLoading({ title: '生成完整报告...' })

  const query = Taro.createSelectorQuery()
  query.select(`#${canvasId}`)
    .fields({ node: true, size: true })
    .exec(async (res) => {
      try {
        if (!res?.[0]?.node) {
          Taro.hideLoading()
          Taro.showToast({ title: '生成失败', icon: 'error' })
          return
        }

        const canvas = res[0].node
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
        const w = CARD_W
        const maxH = 2000
        canvas.width = w * DPR
        canvas.height = maxH * DPR
        ctx.scale(DPR, DPR)

        drawBg(ctx, w, maxH)

        let y = 40

        ctx.font = '10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = '#6b7280'
        ctx.fillText(opts.doubanName ? `${opts.doubanName} 的书影音 MBTI` : '书影音 MBTI', w / 2, y)
        y += 36

        const typeGrad = ctx.createLinearGradient(w / 2 - 60, y, w / 2 + 60, y)
        typeGrad.addColorStop(0, '#667eea')
        typeGrad.addColorStop(1, '#e94560')
        ctx.fillStyle = typeGrad
        ctx.font = 'bold 42px sans-serif'
        ctx.fillText(opts.mbtiType, w / 2, y)
        y += 24

        ctx.font = '14px sans-serif'
        ctx.fillStyle = '#e94560'
        ctx.fillText(opts.mbtiTitle, w / 2, y)
        y += 30

        ctx.fillStyle = 'rgba(255,255,255,0.03)'
        rrect(ctx, PAD, y - 10, CONTENT_W, 36, 8)
        ctx.fill()
        ctx.fillStyle = '#9ca3af'
        ctx.font = 'italic 11px sans-serif'
        const roastTrim = opts.roast.length > 50 ? opts.roast.slice(0, 50) + '...' : opts.roast
        ctx.fillText(`"${roastTrim}"`, w / 2, y + 12)
        y += 44

        const stats = [
          { emoji: '📚', val: opts.bookCount, label: '本书' },
          { emoji: '🎬', val: opts.movieCount, label: '部电影' },
          { emoji: '🎵', val: opts.musicCount, label: '首音乐' },
        ].filter(s => s.val > 0)
        const statW = CONTENT_W / stats.length
        stats.forEach((s, i) => {
          const sx = PAD + i * statW + statW / 2
          ctx.fillStyle = 'rgba(255,255,255,0.05)'
          rrect(ctx, PAD + i * statW + 4, y, statW - 8, 44, 6)
          ctx.fill()
          ctx.textAlign = 'center'
          ctx.font = '11px sans-serif'
          ctx.fillStyle = '#fff'
          ctx.fillText(s.emoji, sx, y + 15)
          ctx.font = 'bold 13px sans-serif'
          ctx.fillText(String(s.val), sx, y + 30)
          ctx.font = '9px sans-serif'
          ctx.fillStyle = '#9ca3af'
          ctx.fillText(s.label, sx, y + 42)
        })
        y += 60

        ctx.textAlign = 'left'
        ctx.font = '12px sans-serif'
        ctx.fillStyle = '#9ca3af'
        const summaryLines = wrapText(ctx, opts.summary, CONTENT_W, 4)
        summaryLines.forEach(line => {
          ctx.fillText(line, PAD, y)
          y += 17
        })
        y += 20

        const sections = [
          { icon: '📚', title: '阅读画像', text: opts.bookAnalysis },
          { icon: '🎬', title: '观影画像', text: opts.movieAnalysis },
          { icon: '🎵', title: '音乐画像', text: opts.musicAnalysis },
        ].filter(s => s.text)

        for (const sec of sections) {
          ctx.strokeStyle = 'rgba(255,255,255,0.06)'
          ctx.beginPath()
          ctx.moveTo(PAD, y)
          ctx.lineTo(w - PAD, y)
          ctx.stroke()
          y += 20

          ctx.font = 'bold 14px sans-serif'
          ctx.fillStyle = '#e94560'
          ctx.fillText(`${sec.icon} ${sec.title}`, PAD, y)
          y += 22

          ctx.font = '12px sans-serif'
          ctx.fillStyle = '#d1d5db'
          const lines = wrapText(ctx, sec.text!, CONTENT_W, 20)
          for (const line of lines) {
            ctx.fillText(line, PAD, y)
            y += 17
          }
          y += 16
        }

        const finalH = drawFooter(ctx, w, y)

        await saveCanvasToPreview(canvas, w * DPR, finalH * DPR)
      } catch (e) {
        console.error('Canvas draw error:', e)
        Taro.hideLoading()
        Taro.showToast({ title: '生成失败', icon: 'error' })
      }
    })
}
