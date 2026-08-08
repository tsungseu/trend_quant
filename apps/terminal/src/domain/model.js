// ============================================================
// 数据模型归一化层（借鉴 vnpy.trader.object 的设计哲学）
//
// vnpy 中每个网关（CTP / 恒生 / IB / 飞马 ...）都遵循同一套
// BaseData 派生结构：TickData / BarData / OrderData / ...
// 每个数据对象都带：symbol / exchange / gateway_name / 业务字段，
// 上层（策略/风控/账户）完全不关心数据来自哪个网关。
//
// 本项目面临的同类问题是：东方财富 / 腾讯 / 新浪 三套源字段命名不同
// （东财 qfqday 是 [date,o,c,h,l,v]，腾讯分时是 "t p v amt" 字符串，
// 新浪估值 worth/worth_rate ...）。这里定义统一的归一化模型 + 转换器，
// 让 dataClient 对外只产出 {symbol, datetime, ohlc, volume} 形态。
// ============================================================

import { DATA_SOURCE, DATA_QUALITY, makeDataState } from '@/utils/dataQuality'

// ---- 统一 Bar 模型 ----
// 对应 vnpy 的 BarData：固定字段，来源无关的 OHLCV 容器
export function normalizeBar(raw, { symbol, source = DATA_SOURCE.LOCAL, quality = DATA_QUALITY.DERIVED } = {}) {
  const num = (v) => {
    const x = Number(v)
    return Number.isFinite(x) ? x : 0
  }
  const bar = {
    symbol: symbol || raw.symbol || '',
    datetime: raw.date || raw.datetime || raw.t || '',
    open: num(raw.open ?? raw.o),
    high: num(raw.high ?? raw.h),
    low: num(raw.low ?? raw.l),
    close: num(raw.close ?? raw.c),
    volume: num(raw.volume ?? raw.vol ?? raw.v),
    source,
    quality,
  }
  // 数据来源溯源（类似 vnpy 的 gateway_name），便于上层降级/审计
  return makeDataState(bar, {
    source,
    quality,
    asOf: bar.datetime,
    fetchedAt: raw.fetchedAt || undefined,
  })
}

// ---- 腾讯日K -> 归一化 Bar[] ----
// 腾讯 qfqday/day 行格式：[date, open, close, high, low, volume]
export function fromTencentKline(rows, symbol) {
  if (!Array.isArray(rows)) return []
  return rows
    .map((r) => normalizeBar(
      { date: r[0], open: r[1], close: r[2], high: r[3], low: r[4], volume: r[5] },
      { symbol, source: DATA_SOURCE.TENCENT, quality: DATA_QUALITY.EOD },
    ))
    .filter((b) => b.data.datetime)
}

// ---- 腾讯分时 -> 归一化 Tick 序列 ----
// 腾讯分时格式："0930 12.99 382 49621800.00" -> t/price/vol/amount
// 这里统一为 { datetime, price, avg, volume } 的分钟序列（不受字段差异污染）
export function fromTencentIntraday(block, symbol) {
  const tcode = symbol
  const data = block?.data?.data
  if (!Array.isArray(data) || !data.length) return makeDataState([], {
    source: DATA_SOURCE.TENCENT,
    quality: DATA_QUALITY.UNAVAILABLE,
    isFallback: true,
    error: 'no intraday',
  })
  let cumAmt = 0
  let cumVol = 0
  const ticks = data.map((s) => {
    const parts = String(s).split(' ')
    const price = Number(parts[1])
    const vol = Number(parts[2])
    const amount = Number(parts[3])
    cumVol += Number.isFinite(vol) ? vol : 0
    cumAmt += Number.isFinite(amount) ? amount : 0
    const avg = cumVol > 0 ? cumAmt / cumVol / 100 : price // 成交额元 / 成交量手(100股)
    return {
      datetime: parts[0],
      price: Number.isFinite(price) ? price : 0,
      avg: Number.isFinite(avg) ? avg : 0,
      volume: Number.isFinite(vol) ? vol : 0,
    }
  })
  const prevClose = Number(block?.qt?.[tcode]?.[4]) || (ticks[0]?.price || 0)
  return makeDataState(
    { ticks, prevClose },
    { source: DATA_SOURCE.TENCENT, quality: DATA_QUALITY.VERIFIED, asOf: ticks[ticks.length - 1]?.datetime || '' },
  )
}

// ---- 新浪基金估值 -> 归一化估算模型 ----
export function fromSinaEstimate(raw, code) {
  const d = raw?.result?.data
  if (!d || !d.worth) return makeDataState(null, {
    source: DATA_SOURCE.SINA,
    quality: DATA_QUALITY.UNAVAILABLE,
    isFallback: true,
    error: 'no estimate',
  })
  const wd = d.worth_date || ''
  const gztime = wd.length === 8 ? `${wd.slice(0, 4)}-${wd.slice(4, 6)}-${wd.slice(6, 8)}` : wd
  return makeDataState(
    {
      code,
      nav: Number(d.worth) || 0,
      changePct: Number((d.worth_rate || 0) * 100).toFixed(2),
      asOf: gztime,
      name: d.desc?.text_base || '',
    },
    { source: DATA_SOURCE.SINA, quality: DATA_QUALITY.ESTIMATED, asOf: gztime },
  )
}

// ---- 东财基金净值 lsjz -> 归一化 NAV[] ----
// 东财返回 {date, nav, changePct}
export function fromEastmoneyNav(list, code) {
  if (!Array.isArray(list) || !list.length) return makeDataState([], {
    source: DATA_SOURCE.EASTMONEY,
    quality: DATA_QUALITY.UNAVAILABLE,
    isFallback: true,
    error: 'no nav',
  })
  const navs = list.map((it) => ({
    symbol: code,
    date: it.date || it.FSRQ,
    nav: Number(it.nav ?? it.DWJZ) || 0,
    changePct: it.changePct != null ? Number(it.changePct) : (it.JZZZL != null ? Number(it.JZZZL) / 100 : 0),
  })).filter((n) => n.date)
  return makeDataState(navs, {
    source: DATA_SOURCE.EASTMONEY,
    quality: DATA_QUALITY.EOD,
    asOf: navs[navs.length - 1]?.date || '',
  })
}

export default {
  normalizeBar,
  fromTencentKline,
  fromTencentIntraday,
  fromSinaEstimate,
  fromEastmoneyNav,
}
