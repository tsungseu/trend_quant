import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  account,
  equityCurves,
  keyMetrics,
  monthlyReturns,
  dailyReturns,
  todayBreakdown,
  vsBenchmark,
  periodProfits,
} from '@/mock/account'
import { fetchStockKline } from '@/api/dataClient'
import { DATA_QUALITY } from '@/utils/dataQuality'

// 账户核心数据来自 @/mock/account（历史样例/快照），并非实时真实账户。
// 为避免被误认为真实持仓，显式标注来源与质量，供 UI 展示“模拟/快照”提示。
const MOCK_ACCOUNT_META = {
  source: 'local',
  quality: DATA_QUALITY.MOCK,
  isFallback: true,
  asOf: null,
  fetchedAt: null,
}
const accountInfo = computed(() => ({ ...account, ...MOCK_ACCOUNT_META }))

// 沪深300 真实日K（腾讯 ifzq，东财 secid 1.000300）
const HS300_SECID = '1.000300'
// 纳斯达克100 真实日K（腾讯 ifzq，腾讯代码 usNDX；secidToTencent 无法识别 us，故直接写腾讯码）
const NDX100_SECID = 'usNDX'

export const useAccountStore = defineStore('account', () => {
  const info = ref(accountInfo)
  const activeRange = ref('1Y')

  const curve = computed(() => equityCurves[activeRange.value] || equityCurves['1Y'])

  // 真实沪深300 净值曲线（按日期对齐，起点归一化 1.0）
  const hs300Curve = ref([]) // [{date, value}] 净值化
  const hs300Quality = ref(DATA_QUALITY.UNAVAILABLE)
  const hs300Loaded = ref(false)

  // 真实纳斯达克100 净值曲线（按日期对齐，起点归一化 1.0）
  const ndx100Curve = ref([]) // [{date, value}] 净值化
  const ndx100Quality = ref(DATA_QUALITY.UNAVAILABLE)
  const ndx100Loaded = ref(false)

  // 合并后的基准：真实沪深300 + 真实纳指100。
  // 真实行情只有交易日，而组合曲线含周末/节假日，这些非交易日若回退到 mock，
  // 因 mock 与真实归一化基准不同，会在周末→周一拼接处产生垂直跳变（尖刺）。
  // 正确做法：真实段启用时，对非交易日 forward-fill 上一个交易日的真实值
  // （市场休市，价格不变，符合现实），不再混入 mock，保证曲线连续。
  // 仅当真实数据覆盖不足一半区间时，才整体降级为 mock。
  const vsBenchmarkMerged = computed(() => {
    const hsMap = new Map(hs300Curve.value.map((p) => [p.date, p.value]))
    const ndxMap = new Map(ndx100Curve.value.map((p) => [p.date, p.value]))
    const mockMap = new Map(vsBenchmark.map((p) => [p.date, p]))
    const dates = curve.value.map((p) => p.date)
    const hsCovered = dates.filter((d) => hsMap.has(d)).length
    const ndxCovered = dates.filter((d) => ndxMap.has(d)).length
    const hasRealHs = hs300Loaded.value && hsCovered >= Math.ceil(dates.length / 2)
    const hasRealNdx = ndx100Loaded.value && ndxCovered >= Math.ceil(dates.length / 2)

    // 预排真实数据为有序数组，便于按日期 forward-fill
    const hsSorted = [...hsMap.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
    const ndxSorted = [...ndxMap.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
    // 用区间起点之前最近一个交易日的真实值初始化游标，
    // 使区间首个点（若为非交易日）也能从真实数据 forward-fill，避免头部回退 mock 造成跳变
    const firstDate = dates[0]
    let lastHs = pickLe(hsSorted, firstDate)
    let lastNdx = pickLe(ndxSorted, firstDate)
    return dates.map((d) => {
      const mock = mockMap.get(d)
      // 真实段：有当日数据用当日；否则在已有真实数据后用上一交易日 forward-fill（休市价格不变）
      let hs = null, hsReal = false
      if (hasRealHs) {
        const v = hsMap.get(d)
        if (v != null) { hs = v; lastHs = v; hsReal = true }
        else if (lastHs != null) { hs = lastHs; hsReal = true }
      }
      let ndx = null, ndxReal = false
      if (hasRealNdx) {
        const v = ndxMap.get(d)
        if (v != null) { ndx = v; lastNdx = v; ndxReal = true }
        else if (lastNdx != null) { ndx = lastNdx; ndxReal = true }
      }
      return {
        date: d,
        mine: mock?.mine ?? 1,
        hs300: hsReal ? hs : (mock?.hs300 ?? null),
        hs300Real: hsReal,
        ndx100: ndxReal ? ndx : (mock?.ndx100 ?? null),
        ndx100Real: ndxReal,
      }
    })
  })

  // 取已排序的 [date, value] 数组中 date <= target 的最后一项的 value（用于 back-fill 区间头部）
  function pickLe(sorted, target) {
    let v = null
    for (const [d, val] of sorted) {
      if (d <= target) v = val
      else break
    }
    return v
  }

  // 暴露给视图：是否使用了真实沪深300 / 真实纳斯达克100
  const benchmarkHasRealHs300 = computed(() => {
    const dates = curve.value.map((p) => p.date)
    const realMap = new Map(hs300Curve.value.map((p) => [p.date, p.value]))
    const covered = dates.filter((d) => realMap.has(d)).length
    return hs300Loaded.value && covered >= Math.ceil(dates.length / 2)
  })
  const benchmarkHasRealNdx = computed(() => {
    const dates = curve.value.map((p) => p.date)
    const realMap = new Map(ndx100Curve.value.map((p) => [p.date, p.value]))
    const covered = dates.filter((d) => realMap.has(d)).length
    return ndx100Loaded.value && covered >= Math.ceil(dates.length / 2)
  })

  async function loadBenchmark() {
    if (hs300Loaded.value && ndx100Loaded.value) return
    // 沪深300 真实日K
    if (!hs300Loaded.value) {
      try {
        const klineState = await fetchStockKline(HS300_SECID, 252)
        const klines = klineState?.data
        if (!Array.isArray(klines) || !klines.length) throw new Error(klineState?.error || 'no hs300 kline')
        const clean = klines
          .filter((k) => k?.date && Number.isFinite(+k.close))
          .map((k) => ({ date: k.date, close: +k.close }))
        if (clean.length < 2) throw new Error('hs300 too short')
        const base = clean[0].close
        hs300Curve.value = clean.map((k) => ({ date: k.date, value: +(k.close / base).toFixed(4) }))
        hs300Quality.value = DATA_QUALITY.EOD
      } catch (e) {
        hs300Quality.value = DATA_QUALITY.UNAVAILABLE
        console.warn('[account] 沪深300 真实数据获取失败，降级为模拟基准：', e.message)
      } finally {
        hs300Loaded.value = true
      }
    }
    // 纳斯达克100 真实日K
    if (!ndx100Loaded.value) {
      try {
        const klineState = await fetchStockKline(NDX100_SECID, 252)
        const klines = klineState?.data
        if (!Array.isArray(klines) || !klines.length) throw new Error(klineState?.error || 'no ndx100 kline')
        const clean = klines
          .filter((k) => k?.date && Number.isFinite(+k.close))
          .map((k) => ({ date: k.date, close: +k.close }))
        if (clean.length < 2) throw new Error('ndx100 too short')
        const base = clean[0].close
        ndx100Curve.value = clean.map((k) => ({ date: k.date, value: +(k.close / base).toFixed(4) }))
        ndx100Quality.value = DATA_QUALITY.EOD
      } catch (e) {
        ndx100Quality.value = DATA_QUALITY.UNAVAILABLE
        console.warn('[account] 纳斯达克100 真实数据获取失败，降级为模拟基准：', e.message)
      } finally {
        ndx100Loaded.value = true
      }
    }
  }

  // 区间内收益
  const rangeProfit = computed(() => {
    const c = curve.value
    if (!c || c.length < 2) return { abs: 0, pct: 0 }
    const first = c[0].value
    const last = c[c.length - 1].value
    return {
      abs: +(last - first).toFixed(2),
      pct: +((last - first) / first).toFixed(4),
    }
  })

  function setRange(r) {
    activeRange.value = r
  }

  return {
    info,
    activeRange,
    curve,
    rangeProfit,
    keyMetrics,
    monthlyReturns,
    dailyReturns,
    todayBreakdown,
    vsBenchmark: vsBenchmarkMerged,
    benchmarkHasRealHs300,
    benchmarkHasRealNdx,
    hs300Quality,
    ndx100Quality,
    periodProfits,
    setRange,
    loadBenchmark,
  }
})
