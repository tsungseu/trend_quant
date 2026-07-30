import { canUseProxy, canUseDirect, isDemoMode } from '@/config/runtime'
import * as eastmoney from '@/api/eastmoney'
import { createGateway } from '@/domain/gateway'
import { DATA_QUALITY, DATA_SOURCE, makeDataState, makeUnavailable } from '@/utils/dataQuality'

// 统一数据网关：根据运行模式（direct / proxy）选择实现。
// 上层只通过本文件拿数据，不再直接 import eastmoney，杜绝源字段差异泄漏。
const gateway = createGateway()

const DEMO_MSG = '当前为演示快照模式，未启用真实数据代理'
const NOSCRIPT_MSG = '当前环境未允许第三方直连数据源'

function unavailable(feature, reason) {
  throw new Error(`${feature}不可用：${reason}`)
}

// 把直连（eastmoney）返回的原始值包装为与 proxy 网关一致的 dataState，
// 让上层消费方在任何模式下都拿到统一的 { data, source, quality, ... } 结构。
// 搜索接口除外（始终返回原始数组，调用方期望数组）。
async function wrapDirect(feature, source, quality, fn) {
  try {
    const raw = await fn()
    return makeDataState(raw, { source, quality, asOf: inferAsOf(raw) })
  } catch (e) {
    return makeUnavailable(e, source)
  }
}

// 简易 asOf 推断：取数组/对象里的日期字段，否则留空
function inferAsOf(raw) {
  if (!raw) return ''
  if (Array.isArray(raw) && raw.length) {
    const last = raw[raw.length - 1]
    return last?.date || last?.t || last?.asOf || ''
  }
  return raw?.asOf || raw?.gztime || raw?.date || ''
}

export async function searchFunds(keyword) {
  // 搜索接口固定返回原始数组（调用方按数组处理），不参与 dataState 包装
  const k = String(keyword || '').trim()
  if (!k) return []
  if (canUseProxy() || canUseDirect()) {
    try {
      return await eastmoney.searchFunds(k)
    } catch {
      return []
    }
  }
  return []
}

export async function fetchFundNav(code, days = 252) {
  if (canUseProxy()) return sanitize('基金净值', await gateway.fetchNav(code, days))
  if (canUseDirect()) return wrapDirect('基金净值', DATA_SOURCE.EASTMONEY, DATA_QUALITY.EOD, () => eastmoney.fetchFundNav(code, days))
  unavailable('基金净值', DEMO_MSG)
}

export async function fetchFundEstimate(code) {
  if (canUseProxy()) return sanitize('基金估值', await gateway.fetchEstimate(code))
  if (canUseDirect()) return wrapDirect('基金估值', DATA_SOURCE.SINA, DATA_QUALITY.ESTIMATED, () => eastmoney.fetchFundEstimate(code))
  return makeUnavailable(DEMO_MSG, DATA_SOURCE.LOCAL)
}

export async function fetchFundProfile(code) {
  if (canUseProxy()) return sanitize('基金档案', await gateway.fetchProfile(code))
  if (canUseDirect()) return wrapDirect('基金档案', DATA_SOURCE.EASTMONEY, DATA_QUALITY.EOD, () => eastmoney.fetchFundProfile(code))
  unavailable('基金档案', DEMO_MSG)
}

export async function fetchFundHoldings(code) {
  if (canUseProxy()) return sanitize('基金重仓股', await gateway.fetchHoldings(code))
  if (canUseDirect()) return wrapDirect('基金重仓股', DATA_SOURCE.EASTMONEY, DATA_QUALITY.EOD, () => eastmoney.fetchFundHoldings(code))
  unavailable('基金重仓股', DEMO_MSG)
}

export async function fetchStockKline(secid, days = 180) {
  if (canUseProxy()) return sanitize('股票K线', await gateway.fetchKline(secid, days))
  if (canUseDirect()) return wrapDirect('股票K线', DATA_SOURCE.TENCENT, DATA_QUALITY.EOD, () => eastmoney.fetchStockKline(secid, days))
  unavailable('股票K线', DEMO_MSG)
}

export async function fetchIntraday(secid) {
  if (canUseProxy()) return sanitize('股票分时', await gateway.fetchIntraday(secid))
  if (canUseDirect()) return wrapDirect('股票分时', DATA_SOURCE.TENCENT, DATA_QUALITY.DELAYED, () => eastmoney.fetchIntraday(secid))
  unavailable('股票分时', DEMO_MSG)
}

export async function fetchTencentQuotes(codes) {
  if (!codes?.length) return makeDataState({}, { source: DATA_SOURCE.TENCENT, quality: DATA_QUALITY.UNAVAILABLE, error: 'no codes' })
  if (canUseProxy()) return sanitize('行情', await gateway.fetchQuotes(codes))
  if (canUseDirect()) return wrapDirect('行情', DATA_SOURCE.TENCENT, DATA_QUALITY.DELAYED, () => eastmoney.fetchTencentQuotes(codes))
  return makeUnavailable(NOSCRIPT_MSG, DATA_SOURCE.LOCAL)
}

// 网关返回的是带 quality/source/isFallback 的 dataState；上层消费方需要
// 同时拿到数据与其质量，因此透传整个 state，避免把"不可用"静默变成空结果。
function sanitize(feature, state) {
  if (!state || state.quality === DATA_QUALITY.UNAVAILABLE) {
    return makeUnavailable(state?.error || `${feature}不可用`, state?.source)
  }
  return state
}

// 兼容旧调用方：仍导出原始工具函数
export const toSecid = eastmoney.toSecid
export const toTencentCode = eastmoney.toTencentCode
