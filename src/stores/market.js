import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { stocks as stockList, sectors } from '@/mock/market'
import { fetchStockKline, fetchIntraday, fetchQuote, toSecid, fetchTencentQuotes } from '@/api/eastmoney'

export const useMarketStore = defineStore('market', () => {
  const stocks = ref(stockList.map((s) => ({ ...s })))
  const sectorList = ref(sectors)
  const activeCode = ref('SH600519')
  const live = ref(true) // 是否实时刷新（模拟）

  // 真实 K线 / 分时 缓存：code -> { klines, intraday, loading, error }
  const realKlines = ref({})
  const realIntraday = ref({})
  const klineLoading = ref(false)

  // 顶栏指数真实快照
  const indexSnapshot = ref({}) // code -> {price, change, changePct, name}
  const indexLoaded = ref(false)
  let indexTimer = null

  const activeStock = computed(() =>
    stocks.value.find((s) => s.code === activeCode.value)
  )

  function select(code) {
    activeCode.value = code
    // 选中后自动拉真实 K线（不阻塞）
    fetchKline(code)
  }

  // ---- 真实 K线 ----
  async function fetchKline(code, days = 180) {
    const secid = toSecid(code)
    klineLoading.value = true
    try {
      const klines = await fetchStockKline(secid, days)
      realKlines.value[code] = { klines, loading: false, error: null, updatedAt: Date.now() }
      // 同步更新该股票的最新价/涨跌
      const s = stocks.value.find((x) => x.code === code)
      if (s && klines.length) {
        const last = klines[klines.length - 1]
        const prev = klines[klines.length - 2]
        if (last && prev) {
          s.price = round(last.close)
          s.prevClose = round(prev.close)
          s.change = round(last.close - prev.close)
          s.changePct = round((last.close - prev.close) / prev.close, 4)
          s.high = round(last.high)
          s.low = round(last.low)
          s.open = round(last.open)
        }
      }
    } catch (e) {
      console.warn('[market] fetchKline', code, 'failed:', e.message)
      if (!realKlines.value[code]) realKlines.value[code] = { klines: [], loading: false, error: e.message }
    } finally {
      klineLoading.value = false
    }
  }

  // ---- 真实分时 ----
  async function fetchRealIntraday(code) {
    const secid = toSecid(code)
    try {
      const { ticks, prevClose } = await fetchIntraday(secid)
      realIntraday.value[code] = { ticks, prevClose, error: null }
    } catch (e) {
      console.warn('[market] fetchIntraday', code, 'failed:', e.message)
      if (!realIntraday.value[code]) realIntraday.value[code] = { ticks: [], prevClose: 0, error: e.message }
    }
  }

  // ---- 顶栏指数快照（腾讯行情批量，稳定不限频）----
  // 上证/创业板/深成指/纳指/恒生
  const indexCodes = ['SH000001', 'SZ399006', 'SZ399001']
  let indexFetching = false

  async function fetchAllIndices() {
    if (indexFetching) return
    indexFetching = true
    try {
      const quotes = await fetchTencentQuotes(indexCodes)
      for (const code of indexCodes) {
        const q = quotes[code]
        if (q && q.price) {
          indexSnapshot.value[code] = q
          const s = stocks.value.find((x) => x.code === code)
          if (s) {
            s.price = q.price
            s.change = q.change
            s.changePct = q.changePct
            s.prevClose = q.prevClose
          }
        }
      }
      indexLoaded.value = true
    } catch (e) {
      // 静默
    } finally {
      indexFetching = false
    }
  }

  function startIndexSync() {
    if (indexTimer) return
    fetchAllIndices()
    // 低频同步（60s），避免触发东财限频
    indexTimer = setInterval(fetchAllIndices, 60000)
  }
  function stopIndexSync() {
    if (indexTimer) {
      clearInterval(indexTimer)
      indexTimer = null
    }
  }

  // ---- 自选股实时跳动（小幅扰动，保持"活"感）----
  let tickTimer = null
  function startLive() {
    if (tickTimer) return
    tickTimer = setInterval(() => {
      stocks.value = stocks.value.map((s) => {
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
  }

  function toggleLive() {
    live.value = !live.value
    if (live.value) startLive()
    else stopLive()
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
