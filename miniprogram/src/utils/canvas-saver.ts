import Taro from '@tarojs/taro'

const VERCEL_BASE = 'https://app-theta-puce.vercel.app'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchImageAndPreview(apiPath: string, body: Record<string, any>) {
  Taro.showLoading({ title: '生成中...' })

  try {
    const res = await Taro.request({
      url: `${VERCEL_BASE}${apiPath}`,
      method: 'POST',
      data: body,
      header: { 'Content-Type': 'application/json' },
      responseType: 'arraybuffer',
      timeout: 30000,
    })

    if (res.statusCode !== 200) {
      throw new Error(`Server error ${res.statusCode}`)
    }

    const fs = Taro.getFileSystemManager()
    const tempPath = `${Taro.env.USER_DATA_PATH}/share-${Date.now()}.png`
    fs.writeFileSync(tempPath, res.data, 'binary')

    Taro.hideLoading()
    Taro.previewImage({
      current: tempPath,
      urls: [tempPath],
    })
  } catch (e) {
    console.error('Image generation failed:', e)
    Taro.hideLoading()
    Taro.showToast({ title: '生成失败', icon: 'error' })
  }
}

interface AnalysisCardOpts {
  icon: string
  title: string
  content: string
  mbtiType: string
  doubanName?: string
}

export async function saveAnalysisCard(
  _canvasId: string,
  opts: AnalysisCardOpts
) {
  await fetchImageAndPreview('/api/share-analysis', {
    icon: opts.icon,
    title: opts.title,
    content: opts.content,
    mbtiType: opts.mbtiType,
    doubanName: opts.doubanName,
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
  _canvasId: string,
  opts: FullReportOpts
) {
  await fetchImageAndPreview('/api/share-report', opts)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CompareShareOpts {
  personA: any
  personB: any
  comparison: any
}

export async function saveCompareShare(
  _canvasId: string,
  opts: CompareShareOpts
) {
  await fetchImageAndPreview('/api/share-compare', opts)
}
