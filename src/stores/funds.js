import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchFundNav, fetchFundHoldings, fetchFundEstimate, fetchFundProfile } from '@/api/eastmoney'
import { funds as fundMeta } from '@/mock/funds'

// ---- localStorage 持久化（自选 + 仓位）----
const WL_KEY = 'quant-fund-watchlist'
const POS_KEY = 'quant-fund-positions'

const loadJSON = (k, fb) => {
  try {
    const v = localStorage.getItem(k)
    return v ? JSON.parse(v) : fb
  } catch {
    return fb
  }
}
const saveJSON = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {}
}

// 基金 store：真实净值（东方财富）+ 自选 + 仓位
export const useFundsStore = defineStore('funds', () => {
  // byCode[code] = { navs:[{date,nav,changePct}], loading, error, updatedAt }
  const byCode = ref({})
  const loaded = ref(false)

  // 自选基金代码列表（持久化）。默认包含 4 只核心基金
  const watchlist = ref(loadJSON(WL_KEY, fundMeta.map((f) => f.code)))
  // 仓位：{ [code]: { shares, costPrice } }（持仓份额 + 成本净值，持久化）
  const positions = ref(loadJSON(POS_KEY, {
    '019305': { shares: 50000, costPrice: 1.52 },
    '017731': { shares: 20000, costPrice: 3.62 },
    '019018': { shares: 8000, costPrice: 7.80 },
    '018230': { shares: 30000, costPrice: 1.95 },
  }))

  // ---- 持久化 ----
  function persistWL() { saveJSON(WL_KEY, watchlist.value) }
  function persistPos() { saveJSON(POS_KEY, positions.value) }

  function ensure(code) {
    if (!byCode.value[code]) {
      byCode.value[code] = { navs: [], loading: false, error: null, updatedAt: null }
    }
    return byCode.value[code]
  }

  // ---- 净值拉取 ----
  async function fetchOne(code, days = 252) {
    const slot = ensure(code)
    slot.loading = true
    slot.error = null
    try {
      const navs = await fetchFundNav(code, days)
      slot.navs = navs
      slot.updatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ')
      slot.error = null
    } catch (e) {
      slot.error = e.message || 'fetch failed'
      console.warn('[funds] fetch', code, 'failed:', e.message)
    } finally {
      slot.loading = false
    }
  }

  async function fetchAll(days = 252) {
    // 拉取所有自选基金的真实净值 + 实时估值
    const codes = watchlist.value.length ? watchlist.value : fundMeta.map((f) => f.code)
    const toFetch = loaded.value
      ? codes.filter((c) => !byCode.value[c]?.navs?.length)
      : codes
    await Promise.all(toFetch.map((c) => fetchOne(c, days)))
    // 实时估值（fundgz，QDII 无估值自动降级）
    await Promise.all(codes.map((c) => fetchEstimate(c)))
    loaded.value = true
  }

  async function refresh(code, days = 252) {
    return fetchOne(code, days)
  }

  function navSeries(code) {
    return byCode.value[code]?.navs || []
  }

  // ---- 重仓股缓存（真实数据）----
  const holdingsCache = ref({}) // code -> { data, loading, error, updatedAt }
  async function fetchHoldings(code) {
    const slot = holdingsCache.value[code] || { data: [], loading: false, error: null, updatedAt: null }
    holdingsCache.value[code] = { ...slot, loading: true }
    try {
      const data = await fetchFundHoldings(code)
      holdingsCache.value[code] = { data, loading: false, error: null, updatedAt: Date.now() }
    } catch (e) {
      holdingsCache.value[code] = { data: slot.data || [], loading: false, error: e.message, updatedAt: slot.updatedAt }
    }
  }
  function getHoldings(code) {
    return holdingsCache.value[code]?.data || []
  }

  // ---- 实时估值缓存（fundgz，QDII 无估值）----
  const estimateCache = ref({}) // code -> { gsz, gszzl, gztime } | null
  async function fetchEstimate(code) {
    const d = await fetchFundEstimate(code)
    if (d) {
      estimateCache.value[code] = { gsz: +d.gsz, gszzl: +d.gszzl, gztime: d.gztime, name: d.name }
    } else {
      estimateCache.value[code] = null
    }
  }
  function getEstimate(code) {
    return estimateCache.value[code] || null
  }

  // ---- 基金档案缓存（真实信息）----
  const profileCache = ref({}) // code -> { type, scale, manager, fee, ... }
  async function fetchProfile(code) {
    try {
      const p = await fetchFundProfile(code)
      if (p) profileCache.value[code] = p
    } catch (e) {
      // 静默降级用配置值
    }
  }
  function getProfile(code) {
    return profileCache.value[code] || null
  }

  // ---- 自选管理 ----
  function isWatched(code) {
    return watchlist.value.includes(code)
  }
  function addWatch(code) {
    if (!watchlist.value.includes(code)) {
      watchlist.value.push(code)
      persistWL()
      // 自动拉净值
      if (!byCode.value[code]?.navs?.length) fetchOne(code)
    }
  }
  function removeWatch(code) {
    watchlist.value = watchlist.value.filter((c) => c !== code)
    persistWL()
  }
  function toggleWatch(code) {
    if (isWatched(code)) removeWatch(code)
    else addWatch(code)
  }

  // ---- 仓位管理 ----
  function getPosition(code) {
    return positions.value[code] || null
  }
  function setPosition(code, shares, costPrice) {
    positions.value[code] = { shares: +shares || 0, costPrice: +costPrice || 0 }
    persistPos()
  }
  function clearPosition(code) {
    delete positions.value[code]
    persistPos()
  }
  // 持仓汇总（需传入 navResolver: code -> 当前净值）
  function portfolioSummary(navResolver) {
    let marketValue = 0
    let costValue = 0
    const items = []
    for (const [code, pos] of Object.entries(positions.value)) {
      if (!pos.shares) continue
      const nav = navResolver(code)
      const mv = pos.shares * nav
      const cv = pos.shares * pos.costPrice
      marketValue += mv
      costValue += cv
      items.push({ code, shares: pos.shares, costPrice: pos.costPrice, nav, marketValue: mv, costValue: cv, profit: mv - cv, profitPct: cv ? (mv - cv) / cv : 0 })
    }
    items.sort((a, b) => b.marketValue - a.marketValue)
    items.forEach((it) => (it.weight = marketValue ? it.marketValue / marketValue : 0))
    return {
      items,
      marketValue,
      costValue,
      profit: marketValue - costValue,
      profitPct: costValue ? (marketValue - costValue) / costValue : 0,
      count: items.length,
    }
  }

  return {
    byCode,
    loaded,
    watchlist,
    positions,
    ensure,
    fetchOne,
    fetchAll,
    refresh,
    navSeries,
    holdingsCache,
    fetchHoldings,
    getHoldings,
    estimateCache,
    fetchEstimate,
    getEstimate,
    profileCache,
    fetchProfile,
    getProfile,
    isWatched,
    addWatch,
    removeWatch,
    toggleWatch,
    getPosition,
    setPosition,
    clearPosition,
    portfolioSummary,
  }
})
