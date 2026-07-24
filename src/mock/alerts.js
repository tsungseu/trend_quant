import { makeRng, round, rand, randInt, pick } from './_helpers'

// ============================================================
// 预警中心：预警规则 + 触发记录
// ============================================================

const rng = makeRng(5566)

// 预警类型与比较运算
// type: price(价格) | pct(涨跌幅) | metric(技术指标) | position(仓位)
// op: '>' | '<' | '>=' | '<=' | 'cross_up' | 'cross_down'

export const alertRules = [
  {
    id: 'a1',
    name: '茅台止盈提醒',
    symbol: 'SH600519',
    symbolName: '贵州茅台',
    type: 'price',
    op: '>=',
    target: 1750,
    current: 1689.5,
    enabled: true,
    channels: ['app', 'sms'],
    createdAt: '2026-06-12',
    triggered: 0,
  },
  {
    id: 'a2',
    name: '宁德跌破止损',
    symbol: 'SZ300750',
    symbolName: '宁德时代',
    type: 'price',
    op: '<=',
    target: 198,
    current: 218.4,
    enabled: true,
    channels: ['app', 'sms', 'email'],
    createdAt: '2026-05-28',
    triggered: 1,
  },
  {
    id: 'a3',
    name: '大盘跌幅预警',
    symbol: 'SH000001',
    symbolName: '上证指数',
    type: 'pct',
    op: '<=',
    target: -0.02,
    current: 0.0031,
    enabled: true,
    channels: ['app'],
    createdAt: '2026-07-01',
    triggered: 0,
  },
  {
    id: 'a4',
    name: '招商银行金叉',
    symbol: 'SH600036',
    symbolName: '招商银行',
    type: 'metric',
    metric: 'MA5/MA20',
    op: 'cross_up',
    target: null,
    current: 'MA5<MA20',
    enabled: true,
    channels: ['app'],
    createdAt: '2026-06-20',
    triggered: 0,
  },
  {
    id: 'a5',
    name: '单只仓位过高',
    symbol: 'SH600519',
    symbolName: '贵州茅台',
    type: 'position',
    op: '>=',
    target: 0.25,
    current: 0.184,
    enabled: false,
    channels: ['app'],
    createdAt: '2026-04-15',
    triggered: 2,
  },
  {
    id: 'a6',
    name: '创业板大涨',
    symbol: 'SZ399006',
    symbolName: '创业板指',
    type: 'pct',
    op: '>=',
    target: 0.03,
    current: -0.0045,
    enabled: true,
    channels: ['app', 'email'],
    createdAt: '2026-07-08',
    triggered: 0,
  },
  {
    id: 'a7',
    name: '比亚迪放量突破',
    symbol: 'SZ002594',
    symbolName: '比亚迪',
    type: 'metric',
    metric: '成交量',
    op: '>=',
    target: 1000000,
    current: 620000,
    enabled: true,
    channels: ['app'],
    createdAt: '2026-06-30',
    triggered: 0,
  },
]

// 触发记录（历史）
const opText = { '>': '高于', '<': '低于', '>=': '不低于', '<=': '不高于', cross_up: '上穿', cross_down: '下穿' }
const typeText = { price: '价格', pct: '涨跌幅', metric: '指标', position: '仓位' }

export const alertHistory = Array.from({ length: 14 }, (_, i) => {
  const rule = pick(rng, alertRules)
  const d = new Date('2026-07-21')
  d.setDate(d.getDate() - i)
  d.setHours(randInt(rng, 9, 15), randInt(rng, 0, 59))
  const isPct = rule.type === 'pct'
  const isPos = rule.type === 'position'
  const triggered = isPct
    ? rule.target * (1 + (rng() - 0.5) * 0.2)
    : rule.type === 'price'
    ? rule.target * (1 + (rng() - 0.5) * 0.01)
    : isPos
    ? rule.target
    : rule.target
  return {
    id: 'h' + i,
    ruleId: rule.id,
    ruleName: rule.name,
    symbol: rule.symbol,
    symbolName: rule.symbolName,
    type: rule.type,
    typeText: typeText[rule.type],
    opText: opText[rule.op] || '触发',
    target: rule.target,
    triggered: round(triggered, isPct || isPos ? 4 : 2),
    severity: i < 2 ? 'high' : i < 7 ? 'medium' : 'low',
    status: i === 0 ? 'unread' : 'read',
    time: d.toISOString().slice(0, 16).replace('T', ' '),
    action: pick(rng, ['已查看', '已处理', '已忽略', '—']),
  }
})

export const alertTypeOptions = [
  { value: 'price', label: '价格' },
  { value: 'pct', label: '涨跌幅' },
  { value: 'metric', label: '技术指标' },
  { value: 'position', label: '仓位' },
]

export const alertOpOptions = [
  { value: '>=', label: '≥ (不低于)' },
  { value: '<=', label: '≤ (不高于)' },
  { value: 'cross_up', label: '向上突破' },
  { value: 'cross_down', label: '向下跌破' },
]

export const channelOptions = [
  { value: 'app', label: 'App 推送' },
  { value: 'sms', label: '短信' },
  { value: 'email', label: '邮件' },
]

export const fmtAlertTarget = (rule) => {
  if (rule.type === 'price') return rule.target
  if (rule.type === 'pct') return (rule.target * 100).toFixed(2) + '%'
  if (rule.type === 'position') return (rule.target * 100).toFixed(1) + '%'
  return rule.target
}

export const fmtAlertCurrent = (rule) => {
  const c = rule.current
  if (rule.type === 'pct') return (c * 100).toFixed(2) + '%'
  if (rule.type === 'position') return (c * 100).toFixed(1) + '%'
  if (rule.type === 'metric') return c
  return c
}
