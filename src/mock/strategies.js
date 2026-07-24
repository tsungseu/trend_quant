import { makeRng, round, rand, randInt } from './_helpers'

// ============================================================
// 量化策略 + 回测数据
// ============================================================

const rng = makeRng(808)

// ---- 策略清单 ----
export const strategies = [
  {
    id: 'grid',
    name: '网格交易 · 沪深300',
    cn: '网格交易',
    desc: '在设定价格区间内等差/等比分网，低买高卖捕获震荡收益',
    status: 'running',
    market: '沪深300ETF',
    risk: '中低',
    capital: 150000,
    days: 86,
    icon: 'grid',
    color: '#3b82f6',
    params: {
      基准价: 4.12,
      网格间距: '1.5%',
      网格数量: 20,
      每格资金: '7,500',
      止损线: '3.60',
    },
  },
  {
    id: 'ma',
    name: '双均线趋势 · 创业板',
    cn: '双均线',
    desc: 'MA5 上穿 MA20 金叉买入，死叉卖出，捕捉中期趋势',
    status: 'running',
    market: '创业板ETF',
    risk: '中',
    capital: 120000,
    days: 142,
    icon: 'trend',
    color: '#a855f7',
    params: {
      快线: 'MA5',
      慢线: 'MA20',
      止损: '-5%',
      加仓倍数: '1.5x',
      信号确认: '2根K线',
    },
  },
  {
    id: 'momentum',
    name: '动量轮动 · 行业ETF',
    cn: '动量轮动',
    desc: '按近20日涨幅对行业ETF排序，持有前2名，每周调仓',
    status: 'paused',
    market: '多行业ETF',
    risk: '中高',
    capital: 200000,
    days: 213,
    icon: 'rotate',
    color: '#f5b73d',
    params: {
      动量周期: '20日',
      持仓数: 2,
      调仓频率: '每周',
      过滤阈值: '剔除涨幅<0',
      手续费: '0.05%',
    },
  },
  {
    id: 'aip',
    name: '智能定投 · 沪深300',
    cn: '智能定投',
    desc: '根据均线偏离度动态调整每期定投金额，低估多投高估少投',
    status: 'running',
    market: '沪深300ETF',
    risk: '低',
    capital: 80000,
    days: 365,
    icon: 'calendar',
    color: '#22c55e',
    params: {
      定投周期: '每周四',
      基础金额: '1,000',
      均线参考: 'MA250',
      倍数范围: '0.5x ~ 2x',
      止盈: '+30%',
    },
  },
  {
    id: 'pair',
    name: '配对交易 · 茅五',
    cn: '配对交易',
    desc: '基于贵州茅台与五粮液价差的均值回归策略，价差偏离时对冲',
    status: 'stopped',
    market: '白酒股对',
    risk: '中',
    capital: 100000,
    days: 0,
    icon: 'pair',
    color: '#06b6d4',
    params: {
      标的A: '贵州茅台',
      标的B: '五粮液',
      协整窗口: '60日',
      开仓阈值: '2σ',
      平仓阈值: '0.5σ',
    },
  },
  {
    id: 'factor',
    name: '多因子选股 · 价值成长',
    cn: '多因子',
    desc: '综合 PE、ROE、营收增速等因子打分选股，月度调仓',
    status: 'running',
    market: '全市场',
    risk: '中高',
    capital: 250000,
    days: 178,
    icon: 'filter',
    color: '#ef4444',
    params: {
      因子: 'PE/ROE/增速',
      选股数: 10,
      调仓: '月度',
      加权: '等权',
      中性化: '行业中性',
    },
  },
]

// ---- 每个策略的回测数据 ----
function buildBacktest(seed, days = 252) {
  const r = makeRng(seed)
  let stratVal = 1
  let benchVal = 1
  const equity = []
  const drawdown = []
  let peak = 1
  const end = new Date('2026-07-17')

  for (let i = days - 1; i >= 0; i--) {
    const cur = new Date(end)
    cur.setDate(end.getDate() - i)
    const stratShock = (r() - 0.46) * 2
    const benchShock = (r() - 0.49) * 2
    stratVal *= 1 + 0.0009 + 0.011 * stratShock
    benchVal *= 1 + 0.0003 + 0.0095 * benchShock
    peak = Math.max(peak, stratVal)
    equity.push({
      date: cur.toISOString().slice(0, 10),
      strategy: round(stratVal, 4),
      benchmark: round(benchVal, 4),
    })
    drawdown.push({
      date: cur.toISOString().slice(0, 10),
      value: round((stratVal - peak) / peak, 4),
    })
  }

  // 月度收益
  const monthly = []
  for (let m = 11; m >= 0; m--) {
    monthly.push({ ret: round(rand(r, -0.05, 0.08), 4) })
  }

  return { equity, drawdown, monthly }
}

const btCache = {}
strategies.forEach((s, i) => {
  const bt = buildBacktest(s.id.charCodeAt(0) + i * 13)
  btCache[s.id] = {
    ...bt,
    metrics: {
      年化收益: round(rand(rng, 0.12, 0.32), 4),
      基准年化: round(rand(rng, 0.04, 0.1), 4),
      最大回撤: -round(rand(rng, 0.06, 0.16), 4),
      夏普比率: round(rand(rng, 0.9, 2.4), 2),
      索提诺: round(rand(rng, 1.2, 3.1), 2),
      胜率: round(rand(rng, 0.5, 0.7), 4),
      盈亏比: round(rand(rng, 1.2, 2.4), 2),
      交易次数: randInt(rng, 60, 320),
      卡玛比率: round(rand(rng, 1.0, 3.2), 2),
    },
    trades: Array.from({ length: randInt(rng, 8, 14) }, () => {
      const isBuy = rng() > 0.5
      return {
        date: `2026-0${randInt(rng, 1, 6)}-${String(randInt(rng, 1, 28)).padStart(2, '0')}`,
        action: isBuy ? '买入' : '卖出',
        symbol: s.market,
        price: round(rand(rng, 3, 220), 2),
        qty: randInt(rng, 100, 5000),
        pnl: round(rand(rng, -800, 2500) * (isBuy ? 1 : -1), 2),
      }
    }),
  }
})

export function getBacktest(id) {
  return (
    btCache[id] || {
      equity: [],
      drawdown: [],
      monthly: [],
      metrics: {},
      trades: [],
    }
  )
}
