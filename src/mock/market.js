import { makeRng, rand, round, genPriceSeries } from './_helpers'

// ============================================================
// 行情数据：自选股票/指数清单 + 个股K线/分时
// ============================================================

const rng = makeRng(101)

// 个股/指数主清单
export const stocks = [
  { code: 'SH600519', name: '贵州茅台', sector: '白酒', basePrice: 1689.5 },
  { code: 'SH601318', name: '中国平安', sector: '保险', basePrice: 48.32 },
  { code: 'SZ000858', name: '五粮液', sector: '白酒', basePrice: 152.7 },
  { code: 'SH600036', name: '招商银行', sector: '银行', basePrice: 36.85 },
  { code: 'SZ300750', name: '宁德时代', sector: '新能源', basePrice: 218.4 },
  { code: 'SH600276', name: '恒瑞医药', sector: '医药', basePrice: 47.6 },
  { code: 'SZ002594', name: '比亚迪', sector: '新能源', basePrice: 246.8 },
  { code: 'SH600030', name: '中信证券', sector: '券商', basePrice: 26.15 },
  { code: 'SH000001', name: '上证指数', sector: '指数', basePrice: 3187.2, isIndex: true },
  { code: 'SZ399006', name: '创业板指', sector: '指数', basePrice: 2084.6, isIndex: true },
]

// 为每只标的生成一段近 180 日 K 线 + 当前价/涨跌
const klineCache = {}
const intradayCache = {}

stocks.forEach((s) => {
  const sr = makeRng(
    s.code.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + 7
  )
  // 用更小的起点生成，模拟长期走势
  const series = genPriceSeries({
    rng: sr,
    days: 180,
    startPrice: s.basePrice * 0.82,
    drift: 0.0016,
    vol: s.isIndex ? 0.011 : 0.02,
  })
  klineCache[s.code] = series

  // 取最后一日为"今天"，前收 = 昨日 close
  const last = series[series.length - 1]
  const prevClose = series[series.length - 2].close
  s.prevClose = round(prevClose)
  s.price = round(last.close)
  s.open = round(last.open)
  s.high = round(last.high)
  s.low = round(last.low)
  s.change = round(s.price - prevClose)
  s.changePct = round((s.price - prevClose) / prevClose, 4)
  s.volume = last.volume
  s.amount = round(last.volume * last.close)
  s.marketCap = round(s.price * rand(sr, 1e8, 5e9)) // 流通市值（亿元）

  // 当日分时（4小时交易 -> 240根 1分钟 -> 压缩成 48 个 5分钟点）
  const ticks = []
  let p = s.open
  const baseLine = prevClose
  for (let i = 0; i < 48; i++) {
    p = p * (1 + (sr() - 0.5) * 0.006 + (baseLine - p) / baseLine * 0.01)
    const hh = Math.max(p, baseLine) + sr() * 0.002 * p
    const ll = Math.min(p, baseLine) - sr() * 0.002 * p
    ticks.push({
      t: `${String(9 + Math.floor(i / 24)).padStart(2, '0')}:${String((i % 24) * 5).padStart(2, '0')}`,
      price: round(p),
      avg: round((p + baseLine) / 2 + (sr() - 0.5) * 0.5),
      vol: Math.round(rand(sr, 1000, 9000)),
      high: round(hh),
      low: round(ll),
    })
  }
  // 收盘价校正为真实最新价
  ticks[ticks.length - 1].price = s.price
  intradayCache[s.code] = { ticks, prevClose }
})

export function getKlines(code) {
  return klineCache[code] || []
}

export function getIntraday(code) {
  return intradayCache[code] || { ticks: [], prevClose: 0 }
}

export function getStock(code) {
  return stocks.find((s) => s.code === code)
}

// 三大指数快照（顶部展示）
export const indices = stocks
  .filter((s) => s.isIndex)
  .map((s) => ({
    code: s.code,
    name: s.name,
    price: s.price,
    change: s.change,
    changePct: s.changePct,
  }))

// 市场板块涨幅榜
export const sectors = [
  { name: '半导体', changePct: 0.0382, lead: '北方华创' },
  { name: '白酒', changePct: 0.0215, lead: '贵州茅台' },
  { name: '新能源车', changePct: 0.0164, lead: '比亚迪' },
  { name: '医药生物', changePct: 0.0093, lead: '恒瑞医药' },
  { name: '券商', changePct: -0.0045, lead: '中信证券' },
  { name: '房地产', changePct: -0.0127, lead: '万科A' },
  { name: '煤炭', changePct: -0.0203, lead: '中国神华' },
  { name: '银行', changePct: 0.0031, lead: '招商银行' },
]
