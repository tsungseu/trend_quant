import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchFundNav, fetchFundHoldings, fetchFundEstimate, fetchFundProfile } from '@/api/dataClient'
import { funds as fundMeta } from '@/mock/funds'
import { runtime } from '@/config/runtime'
import { DATA_QUALITY, DATA_SOURCE, makeDataState, makeUnavailable, isTradableQuality } from '@/utils/dataQuality'
import { safeLoad, safeSave, normalizeCode, normalizeWatchlist, normalizePositions, normalizeFundMeta, cleanText, clampNumber } from '@/utils/storage'

// ---- localStorage 持久化（自选 + 仓位）----
const WL_KEY = 'quant-fund-watchlist'
const POS_KEY = 'quant-fund-positions'
const META_KEY = 'quant-fund-meta'

const defaultCodes = fundMeta.map((f) => f.code)
const defaultPositions = {
  '019305': { shares: 50000, costPrice: 1.52 },
  '017731': { shares: 20000, costPrice: 3.62 },
  '019018': { shares: 8000, costPrice: 7.80 },
  '018230': { shares: 30000, costPrice: 1.95 },
}

function dataSource() {
  return runtime.dataMode === 'proxy' ? DATA_SOURCE.GATEWAY : DATA_SOURCE.EASTMONEY
}

function estimateSource() {
  return runtime.dataMode === 'proxy' ? DATA_SOURCE.GATEWAY : DATA_SOURCE.SINA
}

function emptyNavSlot() {
  return {
    navs: [],
    data: [],
    loading: false,
    error: null,
    updatedAt: null,
    fetchedAt: null,
    asOf: '',
    source: DATA_SOURCE.LOCAL,
    quality: DATA_QUALITY.UNAVAILABLE,
    isFallback: false,
  }
}

// 基金 store：真实净值 + 自选 + 仓位 + 数据质量
export const useFundsStore = defineStore('funds', () => {
  // byCode[code] = { navs:[{date,nav,changePct}], loading, error, updatedAt, source, quality, asOf }
  const byCode = ref({})
  const loaded = ref(false)

  const watchlist = ref(safeLoad(WL_KEY, defaultCodes, (v) => normalizeWatchlist(v, defaultCodes)))
  const positions = ref(safeLoad(POS_KEY, defaultPositions, normalizePositions))

  const metaCache = ref(safeLoad(META_KEY, {}, normalizeFundMeta))
  const holdingsCache = ref({}) // code -> data state
  const estimateCache = ref({}) // code -> data state
  const profileCache = ref({}) // code -> data state

  const navInFlight = new Map()
  const estimateInFlight = new Map()
  const holdingsInFlight = new Map()
  const profileInFlight = new Map()
  const requestSeq = {}

  // ---- 持久化 ----
  function persistWL() { safeSave(WL_KEY, watchlist.value) }
  function persistPos() { safeSave(POS_KEY, positions.value) }
  function persistMeta() { safeSave(META_KEY, metaCache.value) }

  function ensure(rawCode) {
    const code = normalizeCode(rawCode) || String(rawCode || '')
    if (!byCode.value[code]) byCode.value[code] = emptyNavSlot()
    return byCode.value[code]
  }

  // ---- 净值拉取 ----
  async function fetchOne(rawCode, days = 252, options = {}) {
    const code = normalizeCode(rawCode)
    if (!code) throw new Error('invalid fund code')
    if (!options.force && navInFlight.has(code)) return navInFlight.get(code)

    const task = (async () => {
      const slot = ensure(code)
      const seq = (requestSeq[code] || 0) + 1
      requestSeq[code] = seq
      slot.loading = true
      slot.error = null
      try {
        const navs = await fetchFundNav(code, days)
        const clean = Array.isArray(navs)
          ? navs.filter((n) => n?.date && Number.isFinite(+n.nav) && +n.nav > 0).map((n) => ({ ...n, nav: +n.nav }))
          : []
        if (!clean.length) throw new Error('no nav data for ' + code)
        if (requestSeq[code] !== seq) return slot
        const state = makeDataState(clean, {
          source: dataSource(),
          quality: DATA_QUALITY.EOD,
          asOf: clean[clean.length - 1]?.date || '',
        })
        Object.assign(slot, state, { navs: clean, data: clean, loading: false, error: null })
      } catch (e) {
        if (requestSeq[code] !== seq) return slot
        slot.error = e.message || 'fetch failed'
        if (!slot.navs?.length) {
          Object.assign(slot, makeUnavailable(slot.error, dataSource()), { navs: [], data: [], loading: false })
        } else {
          slot.quality = DATA_QUALITY.CACHED
          slot.isFallback = false
          slot.loading = false
        }
        console.warn('[funds] fetch', code, 'failed:', e.message)
      } finally {
        if (requestSeq[code] === seq) slot.loading = false
      }
      return slot
    })()

    navInFlight.set(code, task)
    try { return await task } finally { if (navInFlight.get(code) === task) navInFlight.delete(code) }
  }

  async function fetchAll(days = 252, options = {}) {
    // 仅首次未加载时用 defaultCodes 兜底；用户主动清空 watchlist 后保持空，不再拉默认基金
    const codes = (!loaded.value && !watchlist.value.length ? defaultCodes : watchlist.value).map(normalizeCode).filter(Boolean)
    const toFetch = options.force || !loaded.value
      ? codes
      : codes.filter((c) => !byCode.value[c]?.navs?.length)
    await Promise.allSettled(toFetch.map((c) => fetchOne(c, days, options)))
    await Promise.allSettled(codes.map((c) => fetchEstimate(c, options)))
    loaded.value = true
  }

  async function refresh(code, days = 252) {
    return fetchOne(code, days, { force: true })
  }

  async function hydrateFund(code, options = {}) {
    const c = normalizeCode(code)
    if (!c) return []
    return Promise.allSettled([
      fetchOne(c, 252, options),
      fetchEstimate(c, options),
      fetchHoldings(c, options),
      fetchProfile(c, options),
    ])
  }

  function navSeries(code) {
    return byCode.value[code]?.navs || []
  }

  function navMeta(code) {
    return byCode.value[code] || null
  }

  // ---- 重仓股缓存（真实数据）----
  async function fetchHoldings(rawCode, options = {}) {
    const code = normalizeCode(rawCode)
    if (!code) return null
    if (!options.force && holdingsInFlight.has(code)) return holdingsInFlight.get(code)
    const task = (async () => {
      const prev = holdingsCache.value[code]
      holdingsCache.value[code] = { ...(prev || makeUnavailable(null, dataSource())), loading: true, error: null }
      try {
        const rows = await fetchFundHoldings(code)
        const data = Array.isArray(rows)
          ? rows.filter((h) => h?.name && Number.isFinite(+h.weight) && +h.weight >= 0 && +h.weight <= 100)
          : []
        if (!data.length) throw new Error('no holdings data for ' + code)
        holdingsCache.value[code] = makeDataState(data, {
          source: dataSource(),
          quality: DATA_QUALITY.EOD,
          asOf: new Date().toISOString().slice(0, 10),
        })
      } catch (e) {
        holdingsCache.value[code] = prev?.data?.length
          ? { ...prev, loading: false, error: e.message, quality: DATA_QUALITY.CACHED }
          : { ...makeUnavailable(e, dataSource()), data: [], loading: false }
      }
      return holdingsCache.value[code]
    })()
    holdingsInFlight.set(code, task)
    try { return await task } finally { if (holdingsInFlight.get(code) === task) holdingsInFlight.delete(code) }
  }
  function getHoldings(code) {
    return holdingsCache.value[code]?.data || []
  }
  function getHoldingsMeta(code) {
    return holdingsCache.value[code] || null
  }

  // ---- 实时估值缓存（QDII 无估值）----
  async function fetchEstimate(rawCode, options = {}) {
    const code = normalizeCode(rawCode)
    if (!code) return null
    if (!options.force && estimateInFlight.has(code)) return estimateInFlight.get(code)
    const task = (async () => {
      try {
        const d = await fetchFundEstimate(code)
        if (d && Number.isFinite(+d.gsz) && +d.gsz > 0) {
          const payload = { code, gsz: +d.gsz, gszzl: +d.gszzl || 0, gztime: d.gztime, name: d.name || '' }
          estimateCache.value[code] = makeDataState(payload, {
            source: estimateSource(),
            quality: DATA_QUALITY.ESTIMATED,
            asOf: d.gztime || '',
          })
        } else {
          estimateCache.value[code] = makeUnavailable('估值暂不可用', estimateSource())
        }
      } catch (e) {
        estimateCache.value[code] = makeUnavailable(e, estimateSource())
      }
      return estimateCache.value[code]
    })()
    estimateInFlight.set(code, task)
    try { return await task } finally { if (estimateInFlight.get(code) === task) estimateInFlight.delete(code) }
  }
  function getEstimate(code) {
    const state = estimateCache.value[code]
    return state?.quality === DATA_QUALITY.UNAVAILABLE ? null : (state?.data || null)
  }
  function getEstimateMeta(code) {
    return estimateCache.value[code] || null
  }

  // ---- 基金档案缓存（真实信息）----
  async function fetchProfile(rawCode, options = {}) {
    const code = normalizeCode(rawCode)
    if (!code) return null
    if (!options.force && profileInFlight.has(code)) return profileInFlight.get(code)
    const task = (async () => {
      try {
        const p = await fetchFundProfile(code)
        if (p) {
          profileCache.value[code] = makeDataState(p, {
            source: dataSource(),
            quality: DATA_QUALITY.EOD,
            asOf: p.scaleDate || '',
          })
        } else {
          profileCache.value[code] = makeUnavailable('档案暂不可用', dataSource())
        }
      } catch (e) {
        profileCache.value[code] = makeUnavailable(e, dataSource())
      }
      return profileCache.value[code]
    })()
    profileInFlight.set(code, task)
    try { return await task } finally { if (profileInFlight.get(code) === task) profileInFlight.delete(code) }
  }
  function getProfile(code) {
    const state = profileCache.value[code]
    return state?.quality === DATA_QUALITY.UNAVAILABLE ? null : (state?.data || null)
  }
  function getProfileMeta(code) {
    return profileCache.value[code] || null
  }

  // ---- 自选管理 ----
  function isWatched(code) {
    return watchlist.value.includes(normalizeCode(code))
  }
  function addWatch(rawCode, meta) {
    const code = normalizeCode(rawCode)
    if (!code) return null
    if (!watchlist.value.includes(code)) {
      watchlist.value.push(code)
      persistWL()
    }
    if (meta) {
      metaCache.value[code] = {
        name: cleanText(meta.name || meta.short || meta.fullName || code, 80),
        short: cleanText(meta.short || meta.name || code, 40),
        fullName: cleanText(meta.fullName || meta.name || meta.short || code, 120),
        type: cleanText(meta.type || '基金', 40),
        theme: cleanText(meta.theme || meta.type || '基金', 40),
      }
      persistMeta()
    }
    return hydrateFund(code)
  }
  function getMeta(code) {
    return metaCache.value[code] || null
  }
  function removeWatch(rawCode) {
    const code = normalizeCode(rawCode)
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
  function setPosition(rawCode, shares, costPrice) {
    const code = normalizeCode(rawCode)
    if (!code) return
    positions.value[code] = {
      shares: clampNumber(shares, 0, 1e12),
      costPrice: clampNumber(costPrice, 0, 1e6),
    }
    persistPos()
  }
  function clearPosition(rawCode) {
    const code = normalizeCode(rawCode)
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
      const nav = +navResolver(code) || 0
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

  function canUseForAlert(code) {
    return isTradableQuality(byCode.value[code])
  }

  return {
    byCode,
    loaded,
    watchlist,
    positions,
    metaCache,
    getMeta,
    ensure,
    fetchOne,
    fetchAll,
    refresh,
    hydrateFund,
    navSeries,
    navMeta,
    holdingsCache,
    fetchHoldings,
    getHoldings,
    getHoldingsMeta,
    estimateCache,
    fetchEstimate,
    getEstimate,
    getEstimateMeta,
    profileCache,
    fetchProfile,
    getProfile,
    getProfileMeta,
    isWatched,
    addWatch,
    removeWatch,
    toggleWatch,
    getPosition,
    setPosition,
    clearPosition,
    portfolioSummary,
    canUseForAlert,
  }
})
