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

export const useAccountStore = defineStore('account', () => {
  const info = ref(account)
  const activeRange = ref('1Y')

  const curve = computed(() => equityCurves[activeRange.value] || equityCurves['1Y'])

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
    vsBenchmark,
    periodProfits,
    setRange,
  }
})
