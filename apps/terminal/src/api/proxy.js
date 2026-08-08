import { runtime } from '@/config/runtime'

// 走代理（proxy 模式）的通用 JSON 请求工具。
// 独立成文件，避免 dataClient <-> gateway 循环依赖。
export async function proxyJSON(path, timeout = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(`${runtime.proxyBase}${path}`, { signal: controller.signal })
    if (!res.ok) throw new Error(`代理请求失败 (HTTP ${res.status})`)
    const json = await res.json()
    return Array.isArray(json) ? json : json?.data ?? json
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error('代理请求超时')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

export default proxyJSON
