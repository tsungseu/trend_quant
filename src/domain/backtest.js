import { sma, rsi, maxDrawdown } from '@/mock/indicators'
import { round } from '@/mock/_helpers'

/**
 * 基于真实日K的策略回测引擎。
 * @param {Array<{date,open,close,high,low,volume}>} bars
 * @param {object} cfg
 * @returns {{ equity, drawdown, trades, metrics }}
 */
export function runStrategyBacktest(bars, cfg) {
  const closes = bars.map((b) => +b.close)
  if (closes.length < 5) throw new Error('K线数据不足，无法回测')

  const fastN = Math.max(2, Math.min(+cfg.fastMA || 5, 60))
  const slowN = Math.max(fastN + 1, Math.min(+cfg.slowMA || 20, 120))
  const stopLoss = Math.max(0.5, +cfg.stopLoss || 5) / 100
  const takeProfit = Math.max(1, +cfg.takeProfit || 30) / 100
  const posPct = Math.min(1, Math.max(0.1, (+cfg.positionSize || 80) / 100))
  const commission = Math.max(0, +cfg.commission || 0) / 100
  const slippage = Math.max(0, +cfg.slippage || 0) / 100
  const capital0 = Math.max(1000, +cfg.initialCapital || 100000)
  const strategy = cfg.strategy || 'ma'

  const fast = sma(closes, fastN)
  const slow = sma(closes, slowN)
  const rsiArr = rsi(closes, 14)

  let cash = capital0
  let shares = 0
  let entryPrice = 0
  let peakEquity = capital0
  let maxDD = 0
  const equity = []
  const drawdown = []
  const trades = []
  const dailyRets = []

  const warm = Math.max(slowN, 15)
  const base0 = closes[0]

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]
    const price = closes[i]
    const date = bar.date

    // 持仓止盈止损（优先于信号）
    if (shares > 0 && entryPrice > 0 && i >= warm) {
      const pnl = (price - entryPrice) / entryPrice
      if (pnl <= -stopLoss) {
        sell(i, price, '止损卖出')
      } else if (pnl >= takeProfit) {
        sell(i, price, '止盈卖出')
      }
    }

    if (i >= warm) {
      const sig = signalAt(i, strategy, { fast, slow, closes, rsiArr, fastN, slowN })
      if (sig === 'buy' && shares === 0) buy(i, price, reasonBuy(strategy))
      else if (sig === 'sell' && shares > 0) sell(i, price, reasonSell(strategy))
    }

    const equityVal = cash + shares * price
    const prev = equity.length ? equity[equity.length - 1].strategy : capital0
    if (i > 0) dailyRets.push((equityVal - prev) / prev)

    peakEquity = Math.max(peakEquity, equityVal)
    const dd = (equityVal - peakEquity) / peakEquity
    maxDD = Math.min(maxDD, dd)

    const bench = capital0 * (price / base0)
    equity.push({
      date,
      strategy: round(equityVal / capital0, 4),
      benchmark: round(bench / capital0, 4),
    })
    drawdown.push({ date, value: round(dd, 4) })
  }

  // 期末强制平仓，便于统计完整收益
  if (shares > 0) {
    sell(bars.length - 1, closes[closes.length - 1], '期末平仓')
    const equityVal = cash
    const lastEq = equity[equity.length - 1]
    lastEq.strategy = round(equityVal / capital0, 4)
    peakEquity = Math.max(peakEquity, equityVal)
    const dd = (equityVal - peakEquity) / peakEquity
    maxDD = Math.min(maxDD, dd)
    drawdown[drawdown.length - 1].value = round(dd, 4)
  }

  const finalStrat = equity[equity.length - 1]?.strategy || 1
  const finalBench = equity[equity.length - 1]?.benchmark || 1
  const years = Math.max(closes.length / 252, 1 / 252)
  const annRet = Math.pow(finalStrat, 1 / years) - 1
  const benchRet = Math.pow(finalBench, 1 / years) - 1
  const sharpe = calcSharpe(dailyRets)
  const sortino = calcSortino(dailyRets)
  const wins = trades.filter((t) => t.action === '卖出' && t.pnlPct > 0).length
  const closed = trades.filter((t) => t.action === '卖出' && t.pnlPct != null).length
  const winRate = closed ? wins / closed : 0
  const ddInfo = maxDrawdown(equity.map((e) => e.strategy))

  return {
    equity,
    drawdown,
    trades: trades.slice(-30).reverse(),
    metrics: {
      总收益: round((finalStrat - 1) * 100, 2) + '%',
      年化收益: round(annRet * 100, 2) + '%',
      基准年化: round(benchRet * 100, 2) + '%',
      超额收益: round((annRet - benchRet) * 100, 2) + '%',
      最大回撤: round((ddInfo.maxDD || maxDD) * 100, 2) + '%',
      夏普比率: round(sharpe, 2),
      索提诺: round(sortino, 2),
      胜率: round(winRate, 4),
      交易次数: trades.length,
      卡玛比率: round(Math.abs(ddInfo.maxDD || maxDD) > 1e-8 ? annRet / Math.abs(ddInfo.maxDD || maxDD) : 0, 2),
    },
  }

  function buy(i, price, reason) {
    const px = price * (1 + slippage)
    const budget = cash * posPct
    const costRate = 1 + commission
    const qty = Math.floor(budget / (px * costRate))
    if (qty <= 0) return
    const cost = qty * px * costRate
    cash -= cost
    shares += qty
    entryPrice = px
    trades.push({
      date: bars[i].date,
      action: '买入',
      price: round(px, 2),
      qty,
      reason,
      pnlPct: null,
    })
  }

  function sell(i, price, reason) {
    if (shares <= 0) return
    const px = price * (1 - slippage)
    const proceeds = shares * px * (1 - commission)
    const pnlPct = entryPrice > 0 ? (px - entryPrice) / entryPrice : 0
    trades.push({
      date: bars[i].date,
      action: '卖出',
      price: round(px, 2),
      qty: shares,
      reason,
      pnlPct: round(pnlPct, 4),
    })
    cash += proceeds
    shares = 0
    entryPrice = 0
  }
}

function signalAt(i, strategy, ctx) {
  const { fast, slow, closes, rsiArr } = ctx
  if (fast[i] == null || slow[i] == null || fast[i - 1] == null || slow[i - 1] == null) return null

  if (strategy === 'momentum') {
    const look = Math.min(10, i)
    const mom = (closes[i] - closes[i - look]) / closes[i - look]
    if (mom > 0.02 && closes[i] > slow[i] && closes[i - 1] <= slow[i - 1]) return 'buy'
    if ((mom < -0.02 || closes[i] < slow[i]) && closes[i - 1] >= slow[i - 1]) return 'sell'
    return null
  }

  if (strategy === 'grid') {
    // 相对慢线偏离：低吸高抛
    const dev = (closes[i] - slow[i]) / slow[i]
    const prevDev = (closes[i - 1] - slow[i - 1]) / slow[i - 1]
    if (dev < -0.03 && prevDev >= -0.03) return 'buy'
    if (dev > 0.03 && prevDev <= 0.03) return 'sell'
    return null
  }

  if (strategy === 'factor') {
    const prev = fast[i - 1] - slow[i - 1]
    const cur = fast[i] - slow[i]
    const r = rsiArr[i] ?? 50
    if (prev <= 0 && cur > 0 && r < 70) return 'buy'
    if (prev >= 0 && cur < 0 && r > 30) return 'sell'
    return null
  }

  // 默认双均线
  const prev = fast[i - 1] - slow[i - 1]
  const cur = fast[i] - slow[i]
  if (prev <= 0 && cur > 0) return 'buy'
  if (prev >= 0 && cur < 0) return 'sell'
  return null
}

function reasonBuy(strategy) {
  return (
    {
      ma: '金叉买入',
      momentum: '动量转强买入',
      grid: '网格低吸',
      factor: '多因子买入',
    }[strategy] || '信号买入'
  )
}

function reasonSell(strategy) {
  return (
    {
      ma: '死叉卖出',
      momentum: '动量转弱卖出',
      grid: '网格高抛',
      factor: '多因子卖出',
    }[strategy] || '信号卖出'
  )
}

function calcSharpe(dailyRets) {
  if (dailyRets.length < 2) return 0
  const mean = dailyRets.reduce((a, b) => a + b, 0) / dailyRets.length
  const variance = dailyRets.reduce((a, b) => a + (b - mean) ** 2, 0) / (dailyRets.length - 1)
  const std = Math.sqrt(variance)
  if (std < 1e-12) return 0
  return (mean / std) * Math.sqrt(252)
}

function calcSortino(dailyRets) {
  if (dailyRets.length < 2) return 0
  const mean = dailyRets.reduce((a, b) => a + b, 0) / dailyRets.length
  const downside = dailyRets.filter((r) => r < 0)
  if (!downside.length) return mean > 0 ? 3 : 0
  const downVar = downside.reduce((a, b) => a + b * b, 0) / downside.length
  const downStd = Math.sqrt(downVar)
  if (downStd < 1e-12) return 0
  return (mean / downStd) * Math.sqrt(252)
}

/** 将 fetchStockKline 返回的 dataState 规范为 bars */
export function normalizeBars(klineState) {
  const rows = klineState?.data
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error(klineState?.error || '未获取到K线')
  }
  const bars = rows
    .filter((k) => k?.date && Number.isFinite(+k.close) && +k.close > 0)
    .map((k) => ({
      date: k.date,
      open: +k.open || +k.close,
      close: +k.close,
      high: +k.high || +k.close,
      low: +k.low || +k.close,
      volume: +k.volume || 0,
    }))
  if (bars.length < 30) throw new Error(`有效K线过少（${bars.length}），请换更长周期或其它标的`)
  return bars
}

/** 回测标的 -> 行情请求码（A股东财 secid / 美股腾讯码） */
export function resolveKlineCode(symbol) {
  const s = String(symbol || '')
  if (/^us/i.test(s)) return 'us' + s.slice(2).toUpperCase()
  // SH510300 -> 1.510300
  if (/^SH/i.test(s)) return '1.' + s.slice(2)
  if (/^SZ/i.test(s)) return '0.' + s.slice(2)
  return s
}

export function buildAiPrompt({ config, metrics, symbolName, barsCount, dataSource }) {
  return [
    '请基于以下真实日K回测结果，用中文给出简洁投研解读（Markdown）：',
    '1) 一句话总结策略表现',
    '2) 相对买入持有的优劣',
    '3) 风险点（回撤/交易频率/参数敏感）',
    '4) 可尝试的参数或策略改进（2-3条）',
    '声明：不构成投资建议。',
    '',
    `标的：${symbolName}（${config.symbol}）`,
    `策略：${config.strategy}；快线${config.fastMA}/慢线${config.slowMA}；止损${config.stopLoss}%/止盈${config.takeProfit}%；仓位${config.positionSize}%`,
    `周期：${config.period}；样本K线：${barsCount}根；数据源：${dataSource || '行情接口'}`,
    `指标：${JSON.stringify(metrics)}`,
  ].join('\n')
}

export function fallbackAiComment({ config, metrics, symbolName }) {
  const ann = metrics['年化收益']
  const excess = metrics['超额收益']
  const dd = metrics['最大回撤']
  const sharpe = metrics['夏普比率']
  return [
    `**回测解读（本地摘要）**`,
    '',
    `${symbolName} 上运行「${labelStrategy(config.strategy)}」：年化 ${ann}，相对买入持有超额 ${excess}，最大回撤 ${dd}，夏普 ${sharpe}。`,
    '',
    `**观察**`,
    `- 快慢线 ${config.fastMA}/${config.slowMA}，止损 ${config.stopLoss}% / 止盈 ${config.takeProfit}%`,
    `- 交易次数 ${metrics['交易次数']}，胜率 ${(metrics['胜率'] * 100).toFixed(1)}%`,
    '',
    `**建议**`,
    `- 若回撤偏大，可收紧止损或降低仓位`,
    `- 若交易过频，可拉大慢线周期减少噪声`,
    `- 可对比其它周期与海外指数（纳指100/标普500）验证稳健性`,
    '',
    `> 未配置 AI 模型时展示本地摘要。可在「设置」中配置 LLM 获取完整解读。不构成投资建议。`,
  ].join('\n')
}

function labelStrategy(s) {
  return { ma: '双均线择时', grid: '网格交易', momentum: '动量轮动', factor: '多因子选股' }[s] || s
}
