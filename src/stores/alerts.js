import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { alertRules as initialRules, alertHistory } from '@/mock/alerts'
import { safeLoad, safeSave, normalizeAlertRules, createId, todayISO } from '@/utils/storage'
import { DATA_QUALITY, isFresh, isTradableQuality } from '@/utils/dataQuality'

const RULES_KEY = 'quant-alert-rules'
const NOTIF_KEY = 'quant-alert-notifs'
const PRICE_TTL = 10 * 60 * 1000

function normalizeNotifs(value) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 50).filter((n) => n && typeof n === 'object').map((n) => ({
    id: n.id || createId('fn'),
    ruleId: n.ruleId || '',
    code: n.code || n.symbol || '',
    name: n.name || n.symbolName || '',
    msg: n.msg || '',
    time: n.time || '',
    level: n.level === 'sell' ? 'sell' : 'buy',
    ts: Number.isFinite(+n.ts) ? +n.ts : Date.now(),
    read: !!n.read,
  }))
}

export const useAlertsStore = defineStore('alerts', () => {
  // 合并：mock 初始规则 + localStorage 用户自建规则（去重）
  const savedRules = safeLoad(RULES_KEY, [], normalizeAlertRules)
  const savedCodes = new Set(savedRules.map((r) => r.id))
  const baseRules = normalizeAlertRules(initialRules).filter((r) => !savedCodes.has(r.id))
  const rules = ref([...savedRules, ...baseRules])
  const history = ref([...alertHistory])
  const fundNotifs = ref(safeLoad(NOTIF_KEY, [], normalizeNotifs))

  watch(rules, (v) => safeSave(RULES_KEY, normalizeAlertRules(v)), { deep: true })
  watch(fundNotifs, (v) => safeSave(NOTIF_KEY, normalizeNotifs(v)), { deep: true })

  const activeCount = computed(() => rules.value.filter((r) => r.enabled).length)
  const unreadCount = computed(() => fundNotifs.value.filter((n) => !n.read).length + history.value.filter((h) => h.status === 'unread').length)
  const todayTriggered = computed(() => {
    const today = todayISO()
    const hist = history.value.filter((h) => String(h.time || '').startsWith(today)).length
    const live = fundNotifs.value.filter((n) => {
      const d = new Date(n.ts || 0)
      return Number.isFinite(d.getTime()) && todayISO(d) === today
    }).length
    return hist + live
  })

  function toggle(id) {
    const r = rules.value.find((x) => x.id === id)
    if (r) r.enabled = !r.enabled
  }

  function remove(id) {
    rules.value = rules.value.filter((r) => r.id !== id)
  }

  function addRule(rule) {
    const normalized = normalizeAlertRules([{
      id: createId('a'),
      triggered: 0,
      createdAt: todayISO(),
      enabled: true,
      channels: ['app'],
      ...rule,
    }])[0]
    if (!normalized) return null
    const duplicate = rules.value.find((r) =>
      r.symbol === normalized.symbol &&
      r.type === normalized.type &&
      r.op === normalized.op &&
      r.target === normalized.target &&
      r.source === normalized.source
    )
    if (duplicate) return duplicate
    rules.value.unshift(normalized)
    return normalized
  }

  function markAllRead() {
    history.value.forEach((h) => (h.status = 'read'))
    fundNotifs.value.forEach((n) => (n.read = true))
  }

  // 检查基金价格提醒（由 App.vue 周期调用，传入 {code, name, price, meta}[]）
  function checkFundAlerts(fundPrices) {
    if (!fundPrices?.length) return []
    const triggered = []
    const now = Date.now()
    for (const r of rules.value) {
      if (!r.enabled || r.type !== 'price') continue
      const fp = fundPrices.find((f) => f.code === r.symbol)
      if (!fp || !Number.isFinite(+fp.price)) continue
      const meta = fp.meta || { quality: fp.dataQuality, fetchedAt: fp.fetchedAt, asOf: fp.asOf }
      r.lastCheckedAt = new Date(now).toISOString()
      r.dataQuality = meta?.quality || ''
      r.dataAsOf = meta?.asOf || ''
      // 真实提醒只接受新鲜且非 mock/unavailable 的价格
      if (!isTradableQuality(meta) || !isFresh(meta, PRICE_TTL) && meta?.quality !== DATA_QUALITY.EOD) continue

      const hit =
        (r.op === '>=' && fp.price >= r.target) ||
        (r.op === '<=' && fp.price <= r.target) ||
        (r.op === '>' && fp.price > r.target) ||
        (r.op === '<' && fp.price < r.target)

      if (!hit) {
        r.lastHit = false
        continue
      }
      // 阈值状态机：持续命中不重复提醒，需先离开阈值再触发
      if (r.lastHit) continue

      r.lastHit = true
      r.lastTriggeredAt = new Date(now).toISOString()
      r.triggered = (r.triggered || 0) + 1
      r.current = fp.price
      const isLow = r.name.includes('低位') || r.name.includes('风险线') || r.op === '<='
      const notif = {
        id: createId('fn'),
        ruleId: r.id,
        code: r.symbol,
        name: r.symbolName,
        msg: `${r.symbolName} 价格 ${fp.price.toFixed(4)} ${r.op === '<=' || r.op === '<' ? '触及/跌破' : '触及/突破'} ${r.target}（${r.name}）`,
        time: new Date(now).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        level: isLow ? 'buy' : 'sell',
        ts: now,
        read: false,
      }
      fundNotifs.value.unshift(notif)
      triggered.push(notif)
      if (fundNotifs.value.length > 50) fundNotifs.value = fundNotifs.value.slice(0, 50)
    }
    return triggered
  }

  const unreadFundNotifs = computed(() => fundNotifs.value.filter((n) => !n.read).length)

  return {
    rules,
    history,
    fundNotifs,
    unreadFundNotifs,
    activeCount,
    unreadCount,
    todayTriggered,
    toggle,
    remove,
    addRule,
    markAllRead,
    checkFundAlerts,
  }
})
