import { makeRng, round, rand } from './_helpers'

// ============================================================
// 账户总览：资产、收益曲线、资产配置、关键指标
// ============================================================

const rng = makeRng(303)

// ---- 资产快照 ----
export const account = {
  totalAssets: 1286450.36, // 总资产
  available: 186230.5, // 可用资金
  marketValue: 1100219.86, // 持仓市值
  todayProfit: 12856.42, // 今日盈亏
  todayProfitPct: 0.0101, // +1.01%
  totalProfit: 286450.36, // 累计收益
  totalProfitPct: 0.2864, // +28.64%
  annualizedReturn: 0.2317, // 年化 +23.17%
  maxDrawdown: -0.0864, // 最大回撤 -8.64%
  sharpe: 1.82, // 夏普
  volatility: 0.164, // 年化波动率
  // 配置比例
  allocations: [
    { name: '股票', value: 642300, color: '#3b82f6' },
    { name: '基金', value: 285600, color: '#a855f7' },
    { name: '量化策略', value: 172319, color: '#f5b73d' },
    { name: '现金', value: 186230, color: '#22c55e' },
  ],
}

// ---- 净值/收益曲线生成 ----
// 区间: 1日 / 1周 / 1月 / 3月 / 1年 / 成立以来
const buildCurve = (days, startVal, drift, vol, seed) => {
  const r = makeRng(seed)
  const out = []
  let v = startVal
  const end = new Date('2026-07-17')
  for (let i = days - 1; i >= 0; i--) {
    const cur = new Date(end)
    cur.setDate(end.getDate() - i)
    const shock = (r() - 0.48) * 2 // 略偏正，体现长期盈利
    v = v * (1 + drift + vol * shock)
    out.push({ date: cur.toISOString().slice(0, 10), value: round(v, 2) })
  }
  // 末端对齐到真实总资产
  const last = out[out.length - 1].value
  const ratio = account.totalAssets / last
  return out.map((p) => ({ ...p, value: round(p.value * ratio, 2) }))
}

export const equityCurves = {
  '1D': buildCurve(1, account.totalAssets * 0.99, 0, 0.004, 11),
  '1W': buildCurve(7, account.totalAssets * 0.985, 0.002, 0.006, 22),
  '1M': buildCurve(30, account.totalAssets * 0.96, 0.0014, 0.009, 33),
  '3M': buildCurve(90, account.totalAssets * 0.9, 0.0012, 0.011, 44),
  '1Y': buildCurve(252, account.totalAssets * 0.78, 0.001, 0.013, 55),
  ALL: buildCurve(504, account.totalAssets * 0.62, 0.0009, 0.014, 66),
}

// ---- 月度收益热力图 (近12个月) ----
export const monthlyReturns = (() => {
  const r = makeRng(77)
  const months = []
  const end = new Date('2026-07-17')
  for (let i = 11; i >= 0; i--) {
    const d = new Date(end)
    d.setMonth(d.getMonth() - i)
    months.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      ret: round(rand(r, -0.06, 0.09), 4),
    })
  }
  return months
})()

// ---- 关键指标（卡片用）----
export const keyMetrics = [
  { label: '累计收益率', value: '+28.64%', tone: 'up', sub: '近2年' },
  { label: '年化收益率', value: '+23.17%', tone: 'up', sub: '时间加权' },
  { label: '最大回撤', value: '-8.64%', tone: 'down', sub: '2025-09' },
  { label: '夏普比率', value: '1.82', tone: 'flat', sub: 'Sharpe' },
  { label: '胜率', value: '62.4%', tone: 'up', sub: '近60笔' },
  { label: '盈亏比', value: '1.85', tone: 'up', sub: 'Profit/Loss' },
]
