import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { alertRules as initialRules, alertHistory } from '@/mock/alerts'

const RULES_KEY = 'quant-alert-rules'
const NOTIF_KEY = 'quant-alert-notifs'
const load = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb } catch { return fb } }
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

export const useAlertsStore = defineStore('alerts', () => {
  // 合并：mock 初始规则 + localStorage 用户自建规则（去重）
  const savedRules = load(RULES_KEY, [])
  const savedCodes = new Set(savedRules.map((r) => r.id))
  const baseRules = initialRules.filter((r) => !savedCodes.has(r.id))
  const rules = ref([...savedRules, ...baseRules.map((r) => ({ ...r }))])
  const history = ref([...alertHistory])
  const fundNotifs = ref(load(NOTIF_KEY, []))

  // 持久化
  watch(rules, (v) => save(RULES_KEY, v), { deep: true })
  watch(fundNotifs, (v) => save(NOTIF_KEY, v), { deep: true })

  const activeCount = computed(() => rules.value.filter((r) => r.enabled).length)
  const unreadCount = computed(() => fundNotifs.value.filter((n) => !n.read).length)
  const todayTriggered = computed(() => {
    const today = '2026-07-21'
    return history.value.filter((h) => h.time.startsWith(today)).length
  })

  function toggle(id) {
    const r = rules.value.find((x) => x.id === id)
    if (r) r.enabled = !r.enabled
  }

  function remove(id) {
    rules.value = rules.value.filter((r) => r.id !== id)
  }

  function addRule(rule) {
    rules.value.unshift({
      id: 'a' + Date.now(),
      triggered: 0,
      createdAt: '2026-07-21',
      ...rule,
    })
  }

  function markAllRead() {
    history.value.forEach((h) => (h.status = 'read'))
    fundNotifs.value.forEach((n) => (n.read = true))
  }

  // 检查基金买卖点预警（由 App.vue 周期调用，传入 {code, name, price}[]）
  // 对 type=price 且 source=fund-signal 的规则，价格触及 target 时触发通知
  function checkFundAlerts(fundPrices) {
    if (!fundPrices?.length) return
    const triggered = []
    for (const r of rules.value) {
      if (!r.enabled || r.type !== 'price') continue
      const fp = fundPrices.find((f) => f.code === r.symbol)
      if (!fp) continue
      const hit =
        (r.op === '>=' && fp.price >= r.target) ||
        (r.op === '<=' && fp.price <= r.target)
      if (hit) {
        // 标记触发，生成通知（去重：同一规则5分钟内只通知一次）
        const last = fundNotifs.value.find((n) => n.ruleId === r.id)
        const now = Date.now()
        if (last && now - last.ts < 5 * 60 * 1000) continue
        r.triggered = (r.triggered || 0) + 1
        r.current = fp.price
        const isBuy = r.name.includes('买入') || r.name.includes('止损')
        const notif = {
          id: 'fn' + now,
          ruleId: r.id,
          code: r.symbol,
          name: r.symbolName,
          msg: `${r.symbolName} 现价 ${fp.price.toFixed(4)} ${r.op === '<=' ? '跌破' : '突破'} ${r.target}（${r.name}）`,
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          level: isBuy ? 'buy' : 'sell',
          ts: now,
          read: false,
        }
        fundNotifs.value.unshift(notif)
        triggered.push(notif)
        if (fundNotifs.value.length > 50) fundNotifs.value = fundNotifs.value.slice(0, 50)
      }
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
