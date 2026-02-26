const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const VERCEL_BASE = 'https://vinex.top'

exports.main = async (event) => {
  const { path, method = 'POST', body, binary = false } = event

  try {
    const config = {
      url: `${VERCEL_BASE}${path}`,
      method,
      timeout: 115000,
      headers: { 'Content-Type': 'application/json' },
    }

    if (method !== 'GET' && body) {
      config.data = body
    }

    if (binary) {
      config.responseType = 'arraybuffer'
    }

    const res = await axios(config)

    if (binary) {
      const fileName = `share/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`
      const uploadRes = await cloud.uploadFile({
        cloudPath: fileName,
        fileContent: Buffer.from(res.data),
      })
      return { _fileID: uploadRes.fileID }
    }

    return res.data
  } catch (err) {
    const status = err.response?.status
    const data = err.response?.data
    if (data && typeof data === 'object') {
      return { error: data.error || `请求失败 (${status})`, status }
    }
    return { error: err.message || '网络请求失败' }
  }
}
