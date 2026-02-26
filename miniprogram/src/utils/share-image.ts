import Taro from '@tarojs/taro'

const VERCEL_BASE = 'https://db-mbti.vinex.top'

function parseErrMsg(err: unknown): string {
  if (!err) return '未知错误'
  if (typeof err === 'string') return err
  if (err instanceof Error) return err.message || '未知错误'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = err as any
  return anyErr?.errMsg || anyErr?.message || '未知错误'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function requestSharePng(apiPath: string, body: Record<string, any>, opts?: { timeout?: number; filenamePrefix?: string }) {
  const timeout = opts?.timeout ?? 60000
  const filenamePrefix = opts?.filenamePrefix ?? 'share'

  const res = await Taro.request({
    url: `${VERCEL_BASE}${apiPath}`,
    method: 'POST',
    data: body,
    header: { 'Content-Type': 'application/json' },
    responseType: 'arraybuffer',
    timeout,
  })

  if (res.statusCode !== 200) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = (res.data as any)?.error ? String((res.data as any).error) : `请求失败 (${res.statusCode})`
    throw new Error(msg)
  }

  const fs = Taro.getFileSystemManager()
  const tempPath = `${Taro.env.USER_DATA_PATH}/${filenamePrefix}-${Date.now()}.png`
  fs.writeFileSync(tempPath, res.data, 'binary')
  return tempPath
}

export async function saveToAlbumWithPermission(filePath: string) {
  try {
    const setting = await Taro.getSetting()
    const auth = setting?.authSetting?.['scope.writePhotosAlbum']

    if (auth === false) {
      await Taro.openSetting()
      const setting2 = await Taro.getSetting()
      if (!setting2?.authSetting?.['scope.writePhotosAlbum']) {
        throw new Error('未授权保存到相册')
      }
    } else if (!auth) {
      try {
        await Taro.authorize({ scope: 'scope.writePhotosAlbum' })
      } catch {
        // 用户拒绝后走 openSetting
        await Taro.openSetting()
      }
    }

    await Taro.saveImageToPhotosAlbum({ filePath })
  } catch (err) {
    const msg = parseErrMsg(err)
    const denied = /auth|authorize|permission|denied|未授权|拒绝/i.test(msg)
    throw new Error(denied ? '需要相册权限，请在设置中允许后重试' : msg)
  }
}

