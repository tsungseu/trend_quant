// 模型网关共享：客户端实例 + 常用格式化。
// 各 Gateway*View 复用，避免重复构造 GatewayClient。

import { GatewayClient } from '@trendquant/gateway-client'

export function createGatewayClient() {
  return new GatewayClient({
    baseUrl: import.meta.env.VITE_GATEWAY_API_URL || undefined,
    fallbackBaseUrl: 'http://localhost:8080',
    getToken: async () => (typeof window !== 'undefined' && window.__TQ_RAG_TOKEN__) || 'dev-token',
  })
}

export function fmtMoney(v, currency = 'CNY') {
  const sym = currency === 'CNY' ? '¥' : '$'
  return sym + Number(v).toFixed(2)
}

export function fmtNum(v) {
  return Number(v).toLocaleString('en-US')
}

export function fmtDate(iso) {
  if (!iso) return '—'
  return String(iso).slice(0, 10)
}

export function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 16)
  const pad = (n) => String(n).padStart(2, '0')
  return `${fmtDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function relativeTime(iso) {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return '刚刚'
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)} 分钟前`
  if (ms < 86_400_000) return `${Math.floor(ms / 3600_000)} 小时前`
  if (ms < 7 * 86_400_000) return `${Math.floor(ms / 86_400_000)} 天前`
  return fmtDate(iso)
}
