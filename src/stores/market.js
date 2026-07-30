import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { stocks as stockList, sectors } from '@/mock/market'
import { fetchStockKline, fetchIntraday, toSecid, fetchTencentQuotes } from '@/api/dataClient'
import { runtime } from '@/config/runtime'
import { DATA_QUALITY, DATA_SOURCE, makeDataState, makeUnavailable } from '@/utils/dataQuality'

export const useMarketStore = defineStore('market', () => {
  const stocks = ref(stockList.map((s) => ({ ...s, source: DATA_SOURCE.MOCK, quality: DATA_QUALITY.MOCK, isFallback: true })))
  const sectorList = ref(sectors)
  const activeCode = ref('SH600519')
  const live = ref(runtime.enableMockLive)

  // 真实 K线 / 分时 缓存：code -> { data/klines/ticks, loading, error, source, quality }
  const realKlines = ref({})
  const realIntraday = ref({})
  const klineLoading = ref(false)

  // 顶栏指数快照
  const indexSnapshot = ref({}) // code -> {data, price, change, changePct, name, quality}
  const indexLoaded = ref(false)
  let indexTimer = null
  let tickTimer = null
  let indexFetching = false
  const klineInFlight = new Map()
  const intradayInFlight = new Map()

  const activeStock = computed(() =>
    stocks.value.find((s) => s.code === activeCode.value)
  )

  function select(code) {
    activeCode.value = code
    fetchKline(code)
  }

  function sourceForMarket() {
    return runtime.dataMode === 'proxy' ? DATA_SOURCE.GATEWAY : DATA_SOURCE.EASTMONEY
  }
  // K线/分时现走腾讯 ifzq（东财 push2his 反爬严重），数据源标注腾讯
  function sourceForKline() {
    return runtime.dataMode === 'proxy' ? DATA_SOURCE.GATEWAY : DATA_SOURCE.TENCENT
  }
  // 指数快照走腾讯 qt.gtimg.cn
  function sourceForIndex() {
    return runtime.dataMode === 'proxy' ? DATA_SOURCE.GATEWAY : DATA_SOURCE.TENCENT
  }

  // ---- 真实 K线 ----
  async function fetchKline(code, days = 180, options = {}) {
    const secid = toSecid(code)
    if (!secid) return null
    if (!options.force && klineInFlight.has(code)) return klineInFlight.get(code)
    const task = (async () => {
      klineLoading.value = true
      const prev = realKlines.value[code]
      realKlines.value[code] = { ...(prev || makeUnavailable(null, sourceForKline())), loading: true, error: null, klines: prev?.klines || [] }
      try {
        const klineState = await fetchStockKline(secid, days)
        const klines = klineState?.data
        const clean = Array.isArray(klines)
          ? klines.filter((k) => k?.date && Number.isFinite(+k.close) && Number.isFinite(+k.open))
          : []
        if (!clean.length) throw new Error(klineState?.error || ('no kline for ' + code))
        const state = makeDataState(clean, {
          source: sourceForKline(),
          quality: DATA_QUALITY.EOD,
          asOf: clean[clean.length - 1]?.date || '',
        })
        realKlines.value[code] = { ...state, klines: clean, loading: false, error: null }
        const s = stocks.value.find((x) => x.code === code)
        if (s && clean.length) {
          const last = clean[clean.length - 1]
          const prevBar = clean[clean.length - 2]
          if (last && prevBar) {
            s.price = round(last.close)
            s.prevClose = round(prevBar.close)
            s.change = round(last.close - prevBar.close)
            s.changePct = round((last.close - prevBar.close) / prevBar.close, 4)
            s.high = round(last.high)
            s.low = round(last.low)
            s.open = round(last.open)
            s.source = sourceForKline()
            s.quality = DATA_QUALITY.EOD
            s.isFallback = false
          }
        }
      } catch (e) {
        console.warn('[market] fetchKline', code, 'failed:', e.message)
        realKlines.value[code] = prev?.klines?.length
          ? { ...prev, loading: false, error: e.message, quality: DATA_QUALITY.CACHED }
          : { ...makeUnavailable(e, sourceForKline()), klines: [], loading: false }
      } finally {
        klineLoading.value = false
      }
      return realKlines.value[code]
    })()
    klineInFlight.set(code, task)
    try { return await task } finally { if (klineInFlight.get(code) === task) klineInFlight.delete(code) }
  }

  // ---- 真实分时 ----
  async function fetchRealIntraday(code, options = {}) {
    const secid = toSecid(code)
    if (!secid) return null
    if (!options.force && intradayInFlight.has(code)) return intradayInFlight.get(code)
    const task = (async () => {
      const prev = realIntraday.value[code]
      try {
        const intradayState = await fetchIntraday(secid)
        const intraday = intradayState?.data || {}
        const ticks = intraday.ticks
        const prevClose = intraday.prevClose
        const clean = Array.isArray(ticks) ? ticks.filter((t) => t?.t && Number.isFinite(+t.price)) : []
        if (!clean.length) throw new Error(intradayState?.error || ('no intraday for ' + code))
        const state = makeDataState({ ticks: clean, prevClose }, {
          source: sourceForKline(),
          quality: DATA_QUALITY.DELAYED,
          asOf: clean[clean.length - 1]?.t || '',
        })
        realIntraday.value[code] = { ...state, ticks: clean, prevClose, error: null }
      } catch (e) {
        console.warn('[market] fetchIntraday', code, 'failed:', e.message)
        realIntraday.value[code] = prev?.ticks?.length
          ? { ...prev, error: e.message, quality: DATA_QUALITY.CACHED }
          : { ...makeUnavailable(e, sourceForKline()), ticks: [], prevClose: 0 }
      }
      return realIntraday.value[code]
    })()
    intradayInFlight.set(code, task)
    try { return await task } finally { if (intradayInFlight.get(code) === task) intradayInFlight.delete(code) }
  }

  // ---- 顶栏指数快照（腾讯行情批量）----
  const indexCodes = ['SH000001', 'SZ399006', 'SZ399001']

  async function fetchAllIndices() {
    if (indexFetching) return
    indexFetching = true
    try {
      const quotesState = await fetchTencentQuotes(indexCodes)
      const rawQuotes = quotesState?.data || {}
      // proxy 网关把每个 code 包成 dataState；direct/eastmoney 返回扁平 quote。
      // 这里统一拍平为 { code: quote } 形态。
      const quotes = {}
      for (const [k, v] of Object.entries(rawQuotes)) {
        quotes[k] = v && typeof v === 'object' && 'data' in v && v.data ? v.data : v
      }
      // 腾讯返回空对象（失败/限频）也算"请求已发出"，不再让指数停留在可跳动的 mock 状态
      const gotAny = quotes && Object.keys(quotes).length > 0
      for (const code of indexCodes) {
        const q = quotes[code]
        const s = stocks.value.find((x) => x.code === code)
        if (q && q.price) {
          const state = makeDataState(q, {
            source: sourceForIndex(),
            quality: DATA_QUALITY.DELAYED,
            asOf: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          })
          indexSnapshot.value[code] = { ...state, ...q }
          if (s) {
            s.price = q.price
            s.change = q.change
            s.changePct = q.changePct
            s.prevClose = q.prevClose
            s.source = state.source
            s.quality = state.quality
            s.isFallback = false
          }
        } else if (gotAny && s) {
          // 请求成功但该指数无数据：标记为不可用，避免被 startLive 当成 mock 跳动伪造实时
          s.quality = DATA_QUALITY.UNAVAILABLE
          s.isFallback = true
        }
      }
      indexLoaded.value = Object.keys(indexSnapshot.value).length > 0
    } catch {
      // 静默降级；指数保持原状态（首次加载时为 mock，但 enableMockLive 默认关闭不会跳动）
    } finally {
      indexFetching = false
    }
  }

  function startIndexSync() {
    if (indexTimer) return
    fetchAllIndices()
    indexTimer = setInterval(fetchAllIndices, 60000)
  }
  function stopIndexSync() {
    if (indexTimer) {
      clearInterval(indexTimer)
      indexTimer = null
    }
  }

  // ---- 演示行情跳动：仅在显式开启时作用于 mock 数据 ----
  function startLive() {
    if (!runtime.enableMockLive || tickTimer) return
    live.value = true
    tickTimer = setInterval(() => {
      stocks.value = stocks.value.map((s) => {
        // 仅跳动明确的 mock 个股数据；指数和已标真实/不可用的不跳动，避免顶栏伪造实时
        if (s.isIndex) return s
        if (s.quality !== DATA_QUALITY.MOCK || s.isFallback === false) return s
        const shock = (Math.random() - 0.5) * 2
        const newPrice = +(s.price * (1 + 0.0006 * shock)).toFixed(2)
        const change = +(newPrice - s.prevClose).toFixed(2)
        return {
          ...s,
          price: newPrice,
          change,
          changePct: +(change / s.prevClose).toFixed(4),
          high: Math.max(s.high, newPrice),
          low: Math.min(s.low, newPrice),
        }
      })
    }, 2500)
  }

  function stopLive() {
    if (tickTimer) {
      clearInterval(tickTimer)
      tickTimer = null
    }
    live.value = false
  }

  // toggleLive：未开启 mock 模式时显式置 false，给 UI 明确反馈（原实现静默失效）
  function toggleLive() {
    if (!runtime.enableMockLive) { live.value = false; return }
    if (tickTimer) stopLive()
    else startLive()
  }

  function round(n, d = 2) {
    const p = Math.pow(10, d)
    return Math.round(n * p) / p
  }

  return {
    stocks,
    sectorList,
    activeCode,
    activeStock,
    live,
    realKlines,
    realIntraday,
    klineLoading,
    indexSnapshot,
    indexLoaded,
    select,
    fetchKline,
    fetchRealIntraday,
    fetchAllIndices,
    startIndexSync,
    stopIndexSync,
    startLive,
    stopLive,
    toggleLive,
  }
})
