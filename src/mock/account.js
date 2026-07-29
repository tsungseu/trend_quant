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

// ---- 每日收益序列（近 1 年，用于收益日历热力图）----
// 基于 1Y 曲线相邻日差值派生，保证与收益走势一致；周末/节假日无数据
export const dailyReturns = (() => {
  const curve = equityCurves['1Y']
  const out = []
  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1].value
    const cur = curve[i].value
    if (prev > 0) {
      out.push({
        date: curve[i].date,
        ret: round((cur - prev) / prev, 4),
        profit: round(cur - prev, 2),
      })
    }
  }
  return out
})()

// ---- 跟市场对比：本组合 vs 沪深300 vs 纳斯达克100（近1年，净值化）----
export const vsBenchmark = (() => {
  const r = makeRng(99)
  const mine = equityCurves['1Y']
  // 基准起点均 1.0：沪深300 年化约 +8% 波动小；纳斯达克100 年化约 +18% 波动大
  let bv300 = 1.0
  let bvNdx = 1.0
  return mine.map((p, i) => {
    if (i === 0) return { date: p.date, mine: 1.0, hs300: 1.0, ndx100: 1.0 }
    const shock = (r() - 0.5) * 2
    bv300 = bv300 * (1 + 0.0003 + 0.0095 * shock)
    // 纳指100：更高漂移、更大波动，偶有急涨
    const nshock = (r() - 0.47) * 2
    bvNdx = bvNdx * (1 + 0.0007 + 0.014 * nshock)
    return {
      date: p.date,
      mine: round(p.value / mine[0].value, 4),
      hs300: round(bv300, 4),
      ndx100: round(bvNdx, 4),
    }
  })
})()

// ---- 各时间维度收益金额（昨日/本周/本月/本年，用于顶部卡片与日历切换）----
// 取自曲线区间收益，并按"展示金额"调整（让数字有感知度）
export const periodProfits = (() => {
  const calc = (key) => {
    const c = equityCurves[key]
    if (!c || c.length < 2) return 0
    return round(c[c.length - 1].value - c[0].value, 2)
  }
  return {
    day: calc('1D'),     // 昨日
    week: calc('1W'),    // 本周
    month: calc('1M'),   // 本月
    year: calc('1Y'),    // 本年
  }
})()

// ---- 当日收益明细（各品种贡献）----
// 按资产配置比例 + 今日整体盈亏拆分到各品种，模拟真实持仓贡献
export const todayBreakdown = (() => {
  const total = account.todayProfit
  const totalAlloc = account.allocations.reduce((s, a) => s + a.value, 0)
  const r = makeRng(88)
  // 各品种按市值占比 + 随机扰动分摊今日盈亏
  return account.allocations.map((a) => {
    const baseRatio = a.value / totalAlloc
    // 加权 ±40% 扰动，让贡献不完全按比例
    const factor = 0.6 + r() * 0.8
    const contribution = round(total * baseRatio * factor, 2)
    const pct = round(contribution / a.value, 4)
    return {
      name: a.name,
      color: a.color,
      value: a.value,
      contribution,
      contributionPct: pct,
      trend: round(rand(r, -0.015, 0.02), 4), // 该品种今日涨跌幅
    }
  }).sort((a, b) => b.contribution - a.contribution)
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
