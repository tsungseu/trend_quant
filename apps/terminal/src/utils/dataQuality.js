export const DATA_QUALITY = {
  VERIFIED: 'verified',
  DELAYED: 'delayed',
  EOD: 'eod',
  CACHED: 'cached',
  DERIVED: 'derived',
  ESTIMATED: 'estimated',
  MOCK: 'mock',
  UNAVAILABLE: 'unavailable',
}

export const DATA_SOURCE = {
  EASTMONEY: 'eastmoney',
  TENCENT: 'tencent',
  SINA: 'sina',
  GATEWAY: 'gateway',
  MOCK: 'mock',
  LOCAL: 'local',
}

const TRADABLE_QUALITIES = new Set([
  DATA_QUALITY.VERIFIED,
  DATA_QUALITY.DELAYED,
  DATA_QUALITY.EOD,
  DATA_QUALITY.CACHED,
  DATA_QUALITY.DERIVED,
  DATA_QUALITY.ESTIMATED,
])

const RELIABLE_QUALITIES = new Set([
  DATA_QUALITY.VERIFIED,
  DATA_QUALITY.DELAYED,
  DATA_QUALITY.EOD,
  DATA_QUALITY.CACHED,
])

export function nowISO() {
  return new Date().toISOString()
}

export function todayISO(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

// 把 ISO 时间格式式化为本地"YYYY-MM-DD HH:MM"（中国用户友好，避免 UTC 差 8 小时）
function formatLocal(iso) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function makeDataState(data, meta = {}) {
  const fetchedAt = meta.fetchedAt || nowISO()
  return {
    data,
    source: meta.source || DATA_SOURCE.LOCAL,
    quality: meta.quality || DATA_QUALITY.UNAVAILABLE,
    asOf: meta.asOf || inferAsOf(data) || '',
    fetchedAt,
    updatedAt: meta.updatedAt || formatLocal(fetchedAt),
    isFallback: !!meta.isFallback,
    error: meta.error || null,
  }
}

export function makeUnavailable(error, source = DATA_SOURCE.LOCAL) {
  const message = error instanceof Error ? error.message : String(error || '数据不可用')
  return makeDataState(null, {
    source,
    quality: DATA_QUALITY.UNAVAILABLE,
    isFallback: true,
    error: message,
  })
}

export function makeMock(data, asOf = '') {
  return makeDataState(data, {
    source: DATA_SOURCE.MOCK,
    quality: DATA_QUALITY.MOCK,
    asOf: asOf || inferAsOf(data) || '',
    isFallback: true,
  })
}

export function isTradableQuality(meta) {
  const q = extractQuality(meta)
  return TRADABLE_QUALITIES.has(q) && q !== DATA_QUALITY.MOCK && q !== DATA_QUALITY.UNAVAILABLE
}

export function isReliableQuality(meta) {
  const q = extractQuality(meta)
  return RELIABLE_QUALITIES.has(q)
}

export function isFresh(meta, ttlMs) {
  if (!meta || !ttlMs) return false
  // 只信任 ISO 格式的 fetchedAt；updatedAt 是本地展示串（非标准格式），不参与时间计算避免跨浏览器/时区解析错误
  const time = Date.parse(meta.fetchedAt || '')
  return Number.isFinite(time) && Date.now() - time <= ttlMs
}

export function qualityLabel(meta) {
  const q = extractQuality(meta)
  const source = meta?.source || ''
  const sourceLabel = {
    eastmoney: '东方财富',
    tencent: '腾讯行情',
    sina: '新浪估值',
    gateway: '数据代理',
    mock: '历史快照',
    local: '本地数据',
  }[source] || '数据源'

  const quality = {
    verified: '真实数据',
    delayed: '延迟数据',
    eod: '日终净值',
    cached: '缓存数据',
    derived: '派生数据',
    estimated: '估算数据',
    mock: '历史快照',
    unavailable: '数据不可用',
  }[q] || '未知状态'

  if (q === DATA_QUALITY.UNAVAILABLE) return quality
  if (q === DATA_QUALITY.MOCK) return quality
  return `${sourceLabel} · ${quality}`
}

export function qualityClass(meta) {
  const q = extractQuality(meta)
  if (q === DATA_QUALITY.MOCK || q === DATA_QUALITY.UNAVAILABLE) return 'fallback'
  if (q === DATA_QUALITY.CACHED || q === DATA_QUALITY.DERIVED || q === DATA_QUALITY.ESTIMATED) return 'warn'
  return 'real'
}

export function dataSourceHint(meta) {
  if (!meta) return '数据状态未知'
  const label = qualityLabel(meta)
  const asOf = meta.asOf ? ` · 截至 ${meta.asOf}` : ''
  const error = meta.error ? ` · ${meta.error}` : ''
  return `${label}${asOf}${error}`
}

export function extractQuality(meta) {
  return meta?.quality || meta?.meta?.quality || DATA_QUALITY.UNAVAILABLE
}

function inferAsOf(data) {
  if (Array.isArray(data) && data.length) {
    const last = data[data.length - 1]
    return last?.date || last?.time || last?.gztime || ''
  }
  return data?.date || data?.time || data?.gztime || ''
}
