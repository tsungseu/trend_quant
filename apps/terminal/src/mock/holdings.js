import { makeRng, round, rand, randInt } from './_helpers'

// ============================================================
// 持仓 & 交易记录 & 资金流水
// ============================================================

const rng = makeRng(404)

// ---- 当前持仓 ----
export const holdings = [
  { code: 'SH600519', name: '贵州茅台', qty: 200, costPrice: 1542.3, price: 1689.5, sector: '白酒' },
  { code: 'SZ300750', name: '宁德时代', qty: 800, costPrice: 198.6, price: 218.4, sector: '新能源' },
  { code: 'SZ002594', name: '比亚迪', qty: 600, costPrice: 232.1, price: 246.8, sector: '新能源' },
  { code: 'SH601318', name: '中国平安', qty: 3000, costPrice: 45.2, price: 48.32, sector: '保险' },
  { code: 'SH600036', name: '招商银行', qty: 5000, costPrice: 34.8, price: 36.85, sector: '银行' },
  { code: 'SH600276', name: '恒瑞医药', qty: 2000, costPrice: 49.2, price: 47.6, sector: '医药' },
  { code: 'SH600030', name: '中信证券', qty: 4000, costPrice: 24.1, price: 26.15, sector: '券商' },
  { code: 'SH510300', name: '沪深300ETF', qty: 50000, costPrice: 3.98, price: 4.12, sector: '指数基金' },
  { code: 'SZ159915', name: '创业板ETF', qty: 80000, costPrice: 2.42, price: 2.38, sector: '指数基金' },
  { code: 'SZ000858', name: '五粮液', qty: 500, costPrice: 158.4, price: 152.7, sector: '白酒' },
].map((h) => {
  const marketValue = round(h.qty * h.price, 2)
  const costValue = round(h.qty * h.costPrice, 2)
  const profit = round(marketValue - costValue, 2)
  const profitPct = round(profit / costValue, 4)
  return {
    ...h,
    marketValue,
    costValue,
    profit,
    profitPct,
    weight: 0, // 稍后计算
  }
})

// 计算持仓权重
const totalMV = holdings.reduce((s, h) => s + h.marketValue, 0)
holdings.forEach((h) => (h.weight = round(h.marketValue / totalMV, 4)))

// ---- 交易记录 (近30笔) ----
const symbols = holdings.map((h) => ({ code: h.code, name: h.name, price: h.price }))
export const trades = Array.from({ length: 30 }, (_, i) => {
  const sym = symbols[Math.floor(rng() * symbols.length)]
  const isBuy = rng() > 0.45
  const d = new Date('2026-07-17')
  d.setDate(d.getDate() - i)
  const price = round(sym.price * (1 + (rng() - 0.5) * 0.04), 2)
  const qty = randInt(rng, 1, 50) * 100
  return {
    id: 10000 + i,
    date: d.toISOString().slice(0, 10),
    time: `${String(randInt(rng, 9, 14)).padStart(2, '0')}:${String(randInt(rng, 10, 59)).padStart(2, '0')}:${String(randInt(rng, 10, 59)).padStart(2, '0')}`,
    code: sym.code,
    name: sym.name,
    action: isBuy ? '买入' : '卖出',
    price,
    qty,
    amount: round(price * qty, 2),
    fee: round(price * qty * 0.0003, 2),
    status: i < 3 ? '成交' : '成交',
    channel: rng() > 0.6 ? '量化策略' : '手动',
    strategy: rng() > 0.6 ? ['网格交易', '双均线', '动量轮动', '智能定投'][randInt(rng, 0, 3)] : '—',
  }
})

// ---- 资金流水 ----
export const cashflow = Array.from({ length: 16 }, (_, i) => {
  const d = new Date('2026-07-17')
  d.setDate(d.getDate() - i * 2)
  const types = [
    { type: '银证转账', in: true, amount: rand(rng, 5000, 50000) },
    { type: '银证转账', in: false, amount: rand(rng, 5000, 30000) },
    { type: '分红派息', in: true, amount: rand(rng, 200, 3000) },
    { type: '利息收入', in: true, amount: rand(rng, 5, 80) },
    { type: '交易手续费', in: false, amount: rand(rng, 3, 200) },
    { type: '印花税', in: false, amount: rand(rng, 10, 500) },
  ]
  const t = types[Math.floor(rng() * types.length)]
  return {
    date: d.toISOString().slice(0, 10),
    type: t.type,
    income: t.in,
    amount: round(t.amount, 2),
    balance: round(rand(rng, 150000, 280000), 2),
    remark: t.type === '分红派息' ? '贵州茅台 10派259.91' : '—',
  }
})
