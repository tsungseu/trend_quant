export function safeLoad(key, fallback, normalize = (v) => v) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return normalize(fallback)
    const parsed = JSON.parse(raw)
    const data = parsed && typeof parsed === 'object' && 'version' in parsed && 'data' in parsed
      ? parsed.data
      : parsed
    return normalize(data)
  } catch {
    return normalize(fallback)
  }
}

export function safeSave(key, value, version = 1) {
  try {
    localStorage.setItem(key, JSON.stringify({ version, data: value, updatedAt: new Date().toISOString() }))
  } catch {}
}

export function safeGetItem(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

export function normalizeCode(code) {
  const c = String(code || '').replace(/\D/g, '').slice(0, 6)
  return /^\d{6}$/.test(c) ? c : ''
}

export function normalizeWatchlist(value, fallback = []) {
  const input = Array.isArray(value) ? value : fallback
  const out = []
  for (const item of input) {
    const code = normalizeCode(item)
    if (code && !out.includes(code)) out.push(code)
  }
  return out
}

export function normalizePositions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out = {}
  for (const [rawCode, rawPos] of Object.entries(value)) {
    const code = normalizeCode(rawCode)
    if (!code || !rawPos || typeof rawPos !== 'object') continue
    const shares = clampNumber(rawPos.shares, 0, 1e12)
    const costPrice = clampNumber(rawPos.costPrice, 0, 1e6)
    // 保留用户主动设置的仓位（含 shares=0 的"已清仓占位"），仅丢弃无意义空对象
    if (rawPos.shares != null || rawPos.costPrice != null) out[code] = { shares, costPrice }
  }
  return out
}

export function normalizeFundMeta(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out = {}
  for (const [rawCode, meta] of Object.entries(value)) {
    const code = normalizeCode(rawCode)
    if (!code || !meta || typeof meta !== 'object') continue
    out[code] = {
      name: cleanText(meta.name, 80),
      short: cleanText(meta.short || meta.name, 40),
      fullName: cleanText(meta.fullName || meta.name, 120),
      type: cleanText(meta.type || '基金', 40),
      theme: cleanText(meta.theme || meta.type || '基金', 40),
    }
  }
  return out
}

export function normalizeAlertRules(value) {
  if (!Array.isArray(value)) return []
  const out = []
  const ids = new Set()
  for (const rule of value) {
    if (!rule || typeof rule !== 'object') continue
    const id = cleanText(rule.id, 80) || createId('a')
    const safeId = ids.has(id) ? createId('a') : id
    ids.add(safeId)
    const type = ['price', 'pct', 'metric', 'position'].includes(rule.type) ? rule.type : 'price'
    const op = ['>', '<', '>=', '<=', 'cross_up', 'cross_down'].includes(rule.op) ? rule.op : '>='
    const target = rule.target == null || rule.target === '' ? null : Number(rule.target)
    out.push({
      id: safeId,
      name: cleanText(rule.name || '价格提醒', 80),
      symbol: cleanText(rule.symbol, 24),
      symbolName: cleanText(rule.symbolName || rule.symbol, 80),
      type,
      op,
      target: Number.isFinite(target) ? target : null,
      current: rule.current,
      enabled: rule.enabled !== false,
      channels: normalizeChannels(rule.channels),
      createdAt: cleanText(rule.createdAt, 20) || todayISO(),
      triggered: clampNumber(rule.triggered, 0, 1e9),
      source: cleanText(rule.source, 40),
      lastCheckedAt: rule.lastCheckedAt || null,
      lastTriggeredAt: rule.lastTriggeredAt || null,
      lastHit: !!rule.lastHit,
      dataQuality: cleanText(rule.dataQuality, 30),
      dataAsOf: cleanText(rule.dataAsOf, 40),
    })
  }
  return out
}

export function cleanText(value, max = 100) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max)
}

export function clampNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(value)
  if (!Number.isFinite(n)) return min
  return Math.min(Math.max(n, min), max)
}

export function todayISO(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export function createId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ============================================================
// LLM 供应商配置
// ============================================================

// API 格式白名单（对应 src/api/llm.js 适配层）
export const LLM_FORMATS = ['anthropic', 'openai', 'responses']

// 解析逗号/空白分隔的模型名列表，去空白、去空项、截断长度
export function parseModelList(value, max = 50) {
  const raw = Array.isArray(value) ? value.join(',') : String(value || '')
  return raw
    .split(/[\s,，、]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max)
}

// 归一化单个模型项为 { name, modelId, contextWindow }
// 兼容三种输入：
//   - 字符串 'glm-4-plus' -> { name: 'glm-4-plus', modelId: 'glm-4-plus', contextWindow: 0 }
//   - 对象 { modelId: 'glm-4-plus' } -> name 回退 modelId
//   - 对象 { name: 'GLM-5.2', modelId: 'glm-5.2', contextWindow: 1000000 }
export function normalizeModelItem(m) {
  if (typeof m === 'string') {
    const id = cleanText(m, 80)
    if (!id) return null
    return { name: id, modelId: id, contextWindow: 0 }
  }
  if (!m || typeof m !== 'object') return null
  const modelId = cleanText(m.modelId || m.id || m.name, 80)
  if (!modelId) return null
  const name = cleanText(m.name || modelId, 80)
  const contextWindow = clampNumber(m.contextWindow || m.ctx || 0, 0, 100000000)
  return { name, modelId, contextWindow }
}

// LLM 供应商配置校验：仅接受结构正确的对象，密钥只保留（不在日志打印）
export function normalizeLlmProviders(value) {
  if (!Array.isArray(value)) return []
  const out = []
  const ids = new Set()
  for (const p of value) {
    if (!p || typeof p !== 'object') continue
    const name = cleanText(p.name, 40)
    const baseUrl = cleanText(p.baseUrl, 200)
    const apiKey = cleanText(p.apiKey, 400)
    const format = LLM_FORMATS.includes(p.format) ? p.format : 'openai'
    // models 兼容旧字符串数组与新对象数组
    const rawModels = Array.isArray(p.models)
      ? p.models
      : (p.models != null ? parseModelList(p.models) : [])
    const models = rawModels.map(normalizeModelItem).filter(Boolean)
    // model 默认值：优先用旧字段（可能是字符串），回退首个模型的 modelId
    const model = cleanText(p.model || models[0]?.modelId || '', 80)
    if (!name || !baseUrl) continue
    const id = cleanText(p.id, 80) || createId('llm')
    const safeId = ids.has(id) ? createId('llm') : id
    ids.add(safeId)
    out.push({ id: safeId, name, baseUrl, apiKey, format, models, model })
  }
  return out
}

function normalizeChannels(value) {
  const input = Array.isArray(value) ? value : ['app']
  const allowed = new Set(['app', 'sms', 'email'])
  const out = input.filter((item) => allowed.has(item))
  return out.length ? out : ['app']
}
