const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const VERCEL_BASE = 'https://app-theta-puce.vercel.app'

exports.main = async (event) => {
  const { path, method = 'POST', body } = event

  try {
    const res = await axios({
      url: `${VERCEL_BASE}${path}`,
      method,
      data: body,
      timeout: 55000,
      headers: { 'Content-Type': 'application/json' },
    })
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
