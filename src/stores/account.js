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

export const useAccountStore = defineStore('account', () => {
  const info = ref(accountInfo)
  const activeRange = ref('1Y')

  const curve = computed(() => equityCurves[activeRange.value] || equityCurves['1Y'])

  // 真实沪深300 净值曲线（按日期对齐，起点归一化 1.0）
  const hs300Curve = ref([]) // [{date, value}] 净值化
  const hs300Quality = ref(DATA_QUALITY.UNAVAILABLE)
  const hs300Loaded = ref(false)

  // 合并后的基准：真实沪深300 + 模拟纳指100
  // 仅在沪深300 真实数据覆盖足够时才叠加；否则降级为纯模拟（已标注）
  const vsBenchmarkMerged = computed(() => {
    const real = hs300Curve.value
    const realMap = new Map(real.map((p) => [p.date, p.value]))
    const mockMap = new Map(vsBenchmark.map((p) => [p.date, p]))
    const dates = curve.value.map((p) => p.date)
    const covered = dates.filter((d) => realMap.has(d)).length
    const hasReal = hs300Loaded.value && covered >= Math.ceil(dates.length / 2)
    return dates.map((d) => {
      const mock = mockMap.get(d)
      const hs = realMap.get(d)
      return {
        date: d,
        mine: mock?.mine ?? 1,
        hs300: hasReal && hs != null ? hs : (mock?.hs300 ?? null),
        hs300Real: hasReal && hs != null,
        ndx100: mock?.ndx100 ?? null,
      }
    })
  })

  // 暴露给视图：是否使用了真实沪深300
  const benchmarkHasRealHs300 = computed(() => {
    const dates = curve.value.map((p) => p.date)
    const realMap = new Map(hs300Curve.value.map((p) => [p.date, p.value]))
    const covered = dates.filter((d) => realMap.has(d)).length
    return hs300Loaded.value && covered >= Math.ceil(dates.length / 2)
  })

  async function loadBenchmark() {
    if (hs300Loaded.value) return
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
    hs300Quality,
    periodProfits,
    setRange,
    loadBenchmark,
  }
})
