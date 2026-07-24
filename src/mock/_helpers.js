// ============================================================
// Mock 数据生成辅助工具
// 使用线性同余法 (LCG) 实现"带种子的伪随机"，保证每次刷新数据一致
// ============================================================

export function makeRng(seed = 20260717) {
  let state = seed % 2147483647
  if (state <= 0) state += 2147483646
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

// 区间随机浮点 [min, max]
export const rand = (rng, min, max) => min + rng() * (max - min)

// 区间随机整数 [min, max]
export const randInt = (rng, min, max) => Math.floor(rand(rng, min, max + 1))

// 从数组随机取一项
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)]

// 数字保留 n 位小数
export const round = (n, digits = 2) => {
  const p = Math.pow(10, digits)
  return Math.round(n * p) / p
}

// 数字千分位格式化
export const fmtThousands = (n) =>
  n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

// 人民币金额格式化（带 ¥）
export const fmtMoney = (n, digits = 2) =>
  '¥' + fmtThousands(round(n, digits).toFixed(digits))

// 百分比格式化：传入小数 (0.12 -> "+12.00%")
export const fmtPct = (ratio, digits = 2) => {
  const pct = round(ratio * 100, digits)
  return (ratio > 0 ? '+' : '') + pct.toFixed(digits) + '%'
}

// 涨跌符号
export const sign = (n) => (n > 0 ? '+' : '')

// 生成日期数组 (向前 days 天)，格式 YYYY-MM-DD
export const genDates = (days, end = new Date('2026-07-17')) => {
  const arr = []
  const d = new Date(end)
  for (let i = days - 1; i >= 0; i--) {
    const cur = new Date(d)
    cur.setDate(d.getDate() - i)
    arr.push(cur.toISOString().slice(0, 10))
  }
  return arr
}

// 几何布朗运动生成价格序列，返回 {date, close, ...}[]
export function genPriceSeries({
  rng,
  days,
  startPrice,
  drift = 0.0004, // 日均漂移
  vol = 0.018, // 日波动率
  end,
}) {
  const dates = genDates(days, end)
  let price = startPrice
  return dates.map((date) => {
    const shock = (rng() - 0.5) * 2
    price = price * (1 + drift + vol * shock)
    const open = price * (1 + (rng() - 0.5) * 0.01)
    const close = price
    const high = Math.max(open, close) * (1 + rng() * 0.012)
    const low = Math.min(open, close) * (1 - rng() * 0.012)
    const volume = randInt(rng, 50000, 800000)
    return { date, open: round(open), close: round(close), high: round(high), low: round(low), volume }
  })
}

// 根据日K生成累计净值曲线（startValue=1）
export const toEquityCurve = (series) => {
  let v = 1
  return series.map((p) => {
    v = v * (1 + (p.close - p.open) / p.open)
    return { date: p.date, value: round(v, 4) }
  })
}

// ---- 图表主题色（跟随深/浅主题，JS 读取 CSS 变量）----
// 视图里 axisLabel/splitLine 等用 chartTheme() 获取颜色对象
export function chartTheme() {
  const v = (n, fb) => {
    const c = getComputedStyle(document.documentElement).getPropertyValue(n).trim()
    return c || fb
  }
  return {
    label: v('--chart-label', '#5d6b8a'),
    axis: v('--chart-axis', 'rgba(148,163,184,0.15)'),
    split: v('--chart-split', 'rgba(148,163,184,0.06)'),
    secondary: v('--text-secondary', '#9aa7c2'),
    tertiary: v('--text-tertiary', '#5d6b8a'),
  }
}
