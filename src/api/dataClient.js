import { runtime, canUseDirect, canUseProxy, isDemoMode } from '@/config/runtime'
import * as eastmoney from '@/api/eastmoney'

const proxyURL = (path) => `${runtime.proxyBase}${path}`

async function proxyJSON(path, timeout = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(proxyURL(path), { signal: controller.signal })
    if (!res.ok) throw new Error(`代理请求失败 (HTTP ${res.status})`)
    return await res.json()
  } catch (e) {
    // 把 abort 转成可读的中文超时提示，避免裸 DOMException 直达 UI
    if (e?.name === 'AbortError') throw new Error('代理请求超时')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

function unavailable(feature) {
  const reason = isDemoMode()
    ? '当前为演示快照模式，未启用真实数据代理'
    : '当前环境未允许第三方直连数据源'
  throw new Error(`${feature}不可用：${reason}`)
}

export async function searchFunds(keyword) {
  const k = String(keyword || '').trim()
  if (!k) return []
  if (canUseProxy()) {
    const data = await proxyJSON(`/fund/search?keyword=${encodeURIComponent(k)}`)
    return Array.isArray(data) ? data : data?.data || []
  }
  if (canUseDirect()) return eastmoney.searchFunds(k)
  return []
}

export async function fetchFundNav(code, days = 252) {
  if (canUseProxy()) {
    const data = await proxyJSON(`/fund/nav?code=${encodeURIComponent(code)}&days=${days}`)
    return Array.isArray(data) ? data : data?.data || []
  }
  if (canUseDirect()) return eastmoney.fetchFundNav(code, days)
  unavailable('基金净值')
}

export async function fetchFundEstimate(code) {
  if (canUseProxy()) {
    const data = await proxyJSON(`/fund/estimate?code=${encodeURIComponent(code)}`, 6000)
    return data?.data ?? data ?? null
  }
  if (canUseDirect()) return eastmoney.fetchFundEstimate(code)
  return null
}

export async function fetchFundProfile(code) {
  if (canUseProxy()) {
    const data = await proxyJSON(`/fund/profile?code=${encodeURIComponent(code)}`)
    return data?.data ?? data ?? null
  }
  if (canUseDirect()) return eastmoney.fetchFundProfile(code)
  unavailable('基金档案')
}

export async function fetchFundHoldings(code) {
  if (canUseProxy()) {
    const data = await proxyJSON(`/fund/holdings?code=${encodeURIComponent(code)}`)
    return Array.isArray(data) ? data : data?.data || []
  }
  if (canUseDirect()) return eastmoney.fetchFundHoldings(code)
  unavailable('基金重仓股')
}

export async function fetchStockKline(secid, days = 180) {
  if (canUseProxy()) {
    const data = await proxyJSON(`/market/kline?secid=${encodeURIComponent(secid)}&days=${days}`)
    return Array.isArray(data) ? data : data?.data || []
  }
  if (canUseDirect()) return eastmoney.fetchStockKline(secid, days)
  unavailable('股票K线')
}

export async function fetchIntraday(secid) {
  if (canUseProxy()) {
    const data = await proxyJSON(`/market/intraday?secid=${encodeURIComponent(secid)}`)
    return data?.data ?? data
  }
  if (canUseDirect()) return eastmoney.fetchIntraday(secid)
  unavailable('股票分时')
}

export async function fetchTencentQuotes(codes) {
  if (!codes?.length) return {}
  if (canUseProxy()) {
    const data = await proxyJSON(`/market/quotes?codes=${encodeURIComponent(codes.join(','))}`, 6000)
    return data?.data ?? data ?? {}
  }
  if (canUseDirect()) return eastmoney.fetchTencentQuotes(codes)
  return {}
}

export const toSecid = eastmoney.toSecid
export const toTencentCode = eastmoney.toTencentCode
