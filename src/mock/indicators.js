import { round } from './_helpers'

// ============================================================
// 技术指标计算 + 买卖信号引擎
// 纯前端计算，基于净值序列与基础信息
// ============================================================

// ---- 简单移动平均 ----
export function sma(values, n) {
  const out = []
  for (let i = 0; i < values.length; i++) {
    if (i < n - 1) {
      out.push(null)
      continue
    }
    let sum = 0
    for (let j = 0; j < n; j++) sum += values[i - j]
    out.push(round(sum / n, 4))
  }
  return out
}

// ---- RSI（相对强弱指数，默认14）----
export function rsi(values, n = 14) {
  const out = []
  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      out.push(50)
      continue
    }
    const change = values[i] - values[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0
    if (i <= n) {
      avgGain = (avgGain * (i - 1) + gain) / i
      avgLoss = (avgLoss * (i - 1) + loss) / i
    } else {
      avgGain = (avgGain * (n - 1) + gain) / n
      avgLoss = (avgLoss * (n - 1) + loss) / n
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    out.push(round(100 - 100 / (1 + rs), 2))
  }
  return out
}

// ---- 最大回撤 ----
export function maxDrawdown(values) {
  let peak = values[0]
  let maxDD = 0
  let peakIdx = 0
  let troughIdx = 0
  let ddStart = 0
  let ddEnd = 0
  values.forEach((v, i) => {
    if (v > peak) {
      peak = v
      peakIdx = i
    }
    const dd = (v - peak) / peak
    if (dd < maxDD) {
      maxDD = dd
      ddStart = peakIdx
      troughIdx = i
    }
  })
  // 回撤修复：当前净值相对峰值的位置
  const current = values[values.length - 1]
  const recoveryFromTrough = (current - values[troughIdx]) / values[troughIdx]
  return {
    maxDD: round(maxDD, 4),
    peakIdx,
    troughIdx,
    ddStart,
    ddEnd: troughIdx,
    recoveryFromTrough: round(recoveryFromTrough, 4), // 从底部反弹幅度
  }
}

// ---- 布林带（用于超买超卖）----
export function bollinger(values, n = 20, k = 2) {
  const mid = sma(values, n)
  const upper = []
  const lower = []
  for (let i = 0; i < values.length; i++) {
    if (i < n - 1) {
      upper.push(null)
      lower.push(null)
      continue
    }
    let sum = 0
    const m = mid[i]
    for (let j = 0; j < n; j++) sum += Math.pow(values[i - j] - m, 2)
    const std = Math.sqrt(sum / n)
    upper.push(round(m + k * std, 4))
    lower.push(round(m - k * std, 4))
  }
  return { mid, upper, lower }
}

// ---- MACD（指数平滑异同移动平均）----
// DIF = EMA12 - EMA26, DEA = EMA(DIF,9), MACD柱 = (DIF-DEA)*2
export function macd(values, fast = 12, slow = 26, signal = 9) {
  const ema = (arr, n) => {
    const k = 2 / (n + 1)
    const out = []
    let prev
    for (let i = 0; i < arr.length; i++) {
      if (prev == null) prev = arr[i]
      else prev = arr[i] * k + prev * (1 - k)
      out.push(prev)
    }
    return out
  }
  const emaFast = ema(values, fast)
  const emaSlow = ema(values, slow)
  const dif = values.map((_, i) => emaFast[i] - emaSlow[i])
  const dea = ema(dif, signal)
  const hist = dif.map((d, i) => (d - dea[i]) * 2)
  return { dif, dea, hist }
}

// ---- ATR（真实波幅，用于动态止损/买卖点）----
// 基金净值日波动远小于股票，用"日涨跌幅绝对值"度量
// 用中位数而非均值，抗极端波动日污染
export function atr(navs, period = 20) {
  if (navs.length < 2) return 0
  const rets = []
  for (let i = 1; i < navs.length; i++) {
    const prev = navs[i - 1].nav
    if (prev) rets.push(Math.abs(navs[i].nav - prev) / prev)
  }
  const slice = rets.slice(-period).sort((a, b) => a - b)
  const medianPct = slice.length ? slice[Math.floor(slice.length / 2)] : 0
  const last = navs[navs.length - 1].nav
  return medianPct * last
}

// ============================================================
// 买卖信号引擎 v2 —— 多维量化打分 + ATR 动态点位 + 分批建仓
// 维度：趋势(均线) + 动量(MACD) + 超买超卖(RSI) + 估值(PE分位) + 回撤修复
// 点位：基于 ATR（适配各基金自身波动率），非固定百分比
// ============================================================
export function buildSignals(fund, navs) {
  const values = navs.map((n) => n.nav)
  const last = values[values.length - 1]
  const ma5 = sma(values, 5)
  const ma10 = sma(values, 10)
  const ma20 = sma(values, 20)
  const ma60 = sma(values, 60)
  const rsiArr = rsi(values, 14)
  const boll = bollinger(values, 20)
  const mdd = maxDrawdown(values)
  const macdData = macd(values)
  const atrVal = atr(navs, 14)

  const lastMA5 = ma5[ma5.length - 1]
  const lastMA10 = ma10[ma10.length - 1]
  const lastMA20 = ma20[ma20.length - 1]
  const lastMA60 = ma60[ma60.length - 1]
  const lastRSI = rsiArr[rsiArr.length - 1]
  const lastDIF = macdData.dif[macdData.dif.length - 1]
  const lastDEA = macdData.dea[macdData.dea.length - 1]
  const lastHist = macdData.hist[macdData.hist.length - 1]
  const prevHist = macdData.hist[macdData.hist.length - 2]

  // ---- 检测 MA 金叉/死叉（近5日）----
  let maCross = null
  for (let i = values.length - 1; i >= Math.max(1, values.length - 5); i--) {
    if (ma5[i - 1] != null && ma10[i - 1] != null) {
      const prevDiff = ma5[i - 1] - ma10[i - 1]
      const curDiff = ma5[i] - ma10[i]
      if (prevDiff <= 0 && curDiff > 0) { maCross = 'golden'; break }
      if (prevDiff >= 0 && curDiff < 0) { maCross = 'dead'; break }
    }
  }
  // MACD 金叉/死叉（DIF 上穿/下穿 DEA）
  let macdCross = null
  if (macdData.dif.length >= 2) {
    const i = macdData.dif.length - 1
    if (macdData.dif[i - 1] <= macdData.dea[i - 1] && macdData.dif[i] > macdData.dea[i]) macdCross = 'golden'
    else if (macdData.dif[i - 1] >= macdData.dea[i - 1] && macdData.dif[i] < macdData.dea[i]) macdCross = 'dead'
  }

  // ---- 各维度打分（买入倾向 +，卖出倾向 -）----
  const reasons = []
  let score = 0

  // 1) 均线趋势（权重 30%）
  if (lastMA5 > lastMA10 && lastMA10 > lastMA20) {
    score += 1.5
    reasons.push({ tag: '多头排列', tone: 'buy', text: 'MA5>MA10>MA20，多头排列，中期趋势向上' })
  } else if (lastMA5 < lastMA10 && lastMA10 < lastMA20) {
    score -= 1.5
    reasons.push({ tag: '空头排列', tone: 'sell', text: 'MA5<MA10<MA20，空头排列，中期趋势向下' })
  } else {
    reasons.push({ tag: '均线纠缠', tone: 'hold', text: '短中期均线纠缠，趋势不明朗' })
  }
  // 价格相对 MA60（长期趋势分水岭）
  if (last > lastMA60) {
    score += 0.5
  } else {
    score -= 0.5
  }
  if (maCross === 'golden') {
    score += 1.0
    reasons.push({ tag: '✨金叉', tone: 'buy', text: 'MA5 上穿 MA10，短期金叉买入信号' })
  } else if (maCross === 'dead') {
    score -= 1.0
    reasons.push({ tag: '💀死叉', tone: 'sell', text: 'MA5 下穿 MA10，短期死叉卖出信号' })
  }

  // 2) MACD 动量（权重 25%）
  if (lastDIF > lastDEA && lastHist > 0) {
    score += 1.0
    if (lastHist > prevHist) {
      reasons.push({ tag: 'MACD红柱放大', tone: 'buy', text: 'DIF>DEA 且红柱放大，多头动能增强' })
    } else {
      reasons.push({ tag: 'MACD多头', tone: 'buy', text: 'DIF>DEA，多头动能延续' })
    }
  } else if (lastDIF < lastDEA && lastHist < 0) {
    score -= 1.0
    if (lastHist < prevHist) {
      reasons.push({ tag: 'MACD绿柱放大', tone: 'sell', text: 'DIF<DEA 且绿柱放大，空头动能增强' })
    } else {
      reasons.push({ tag: 'MACD空头', tone: 'sell', text: 'DIF<DEA，空头动能延续' })
    }
  }
  if (macdCross === 'golden') {
    score += 0.8
    reasons.push({ tag: 'MACD金叉', tone: 'buy', text: 'MACD DIF 上穿 DEA，动量转多' })
  } else if (macdCross === 'dead') {
    score -= 0.8
    reasons.push({ tag: 'MACD死叉', tone: 'sell', text: 'MACD DIF 下穿 DEA，动量转空' })
  }

  // 3) RSI 超买超卖（权重 15%）
  if (lastRSI < 30) {
    score += 1.2
    reasons.push({ tag: 'RSI超卖', tone: 'buy', text: `RSI=${lastRSI}，超卖区域，短线反弹概率大` })
  } else if (lastRSI > 70) {
    score -= 1.2
    reasons.push({ tag: 'RSI超买', tone: 'sell', text: `RSI=${lastRSI}，超买区域，短线回调风险高` })
  } else if (lastRSI < 40) {
    score += 0.4
    reasons.push({ tag: 'RSI偏弱', tone: 'buy', text: `RSI=${lastRSI}，偏弱区域，接近超卖` })
  } else if (lastRSI > 60) {
    score -= 0.4
    reasons.push({ tag: 'RSI偏强', tone: 'sell', text: `RSI=${lastRSI}，偏强区域，接近超买` })
  } else {
    reasons.push({ tag: 'RSI中性', tone: 'hold', text: `RSI=${lastRSI}，处于中性区间` })
  }

  // 4) PE 估值分位（权重 20%）—— 决定安全边际，长期最关键
  if (fund.pePct5y <= 0.2) {
    score += 1.5
    reasons.push({ tag: '极度低估', tone: 'buy', text: `PE分位 ${Math.round(fund.pePct5y * 100)}%，历史极低位置，安全边际充足` })
  } else if (fund.pePct5y <= 0.4) {
    score += 0.8
    reasons.push({ tag: '估值偏低', tone: 'buy', text: `PE分位 ${Math.round(fund.pePct5y * 100)}%，低于历史中位，具配置价值` })
  } else if (fund.pePct5y >= 0.85) {
    score -= 1.5
    reasons.push({ tag: '极度高估', tone: 'sell', text: `PE分位 ${Math.round(fund.pePct5y * 100)}%，历史极高位，泡沫风险大` })
  } else if (fund.pePct5y >= 0.65) {
    score -= 0.8
    reasons.push({ tag: '估值偏高', tone: 'sell', text: `PE分位 ${Math.round(fund.pePct5y * 100)}%，高于历史中位，性价比下降` })
  } else {
    reasons.push({ tag: '估值合理', tone: 'hold', text: `PE分位 ${Math.round(fund.pePct5y * 100)}%，估值处于合理区间` })
  }

  // 5) 回撤修复度（权重 10%）
  const ddPct = Math.round(mdd.maxDD * 100)
  if (mdd.recoveryFromTrough > 0.08 && ddPct < -10) {
    score += 0.6
    reasons.push({ tag: '底部修复', tone: 'buy', text: `最大回撤 ${ddPct}%，已从底部反弹 ${Math.round(mdd.recoveryFromTrough * 100)}%` })
  } else if (mdd.recoveryFromTrough < -0.05) {
    score -= 0.4
    reasons.push({ tag: '持续探底', tone: 'sell', text: '净值持续走低，未见企稳信号' })
  }

  // ---- 综合评级（-6 ~ +6）----
  let action, actionLevel, actionText
  if (score >= 3.0) { action = 'buy'; actionLevel = 'strong'; actionText = '强烈买入' }
  else if (score >= 1.5) { action = 'buy'; actionLevel = 'normal'; actionText = '建议买入' }
  else if (score >= 0.5) { action = 'buy'; actionLevel = 'light'; actionText = '可逢低轻仓' }
  else if (score <= -3.0) { action = 'sell'; actionLevel = 'strong'; actionText = '强烈卖出' }
  else if (score <= -1.5) { action = 'sell'; actionLevel = 'normal'; actionText = '建议卖出' }
  else if (score <= -0.5) { action = 'sell'; actionLevel = 'light'; actionText = '可逢高减仓' }
  else { action = 'hold'; actionLevel = 'normal'; actionText = '观望持有' }

  // ============================================================
  // 买卖点位 —— 基于 ATR 动态计算（适配各基金波动率）
  // ATR 越大（高波动）→ 止损/买卖区间越宽，避免被正常波动洗出
  // ============================================================
  const a = atrVal || last * 0.01 // 兜底：日波动幅度的价格级
  const bollLower = boll.lower[boll.lower.length - 1]
  const bollUpper = boll.upper[boll.upper.length - 1]
  // 买卖档按 ATR 倍数，但单档偏离封顶 ±15%，避免高波动基金档位过宽
  const clamp = (price, ref, maxPct) => {
    const lo = ref * (1 - maxPct)
    const hi = ref * (1 + maxPct)
    return round(Math.min(Math.max(price, lo), hi), 4)
  }
  // 买入三档（3/5/8 倍日波动，或触及布林下轨，封顶 -15%）
  const buyPoint = round(last - 4 * a, 4)
  const buyLevels = [
    { label: '首仓(30%)', price: clamp(last - 3 * a, last, 0.15) },
    { label: '加仓(30%)', price: clamp(last - 5 * a, last, 0.15) },
    { label: '重仓(40%)', price: clamp(Math.min(last - 8 * a, bollLower), last, 0.15) },
  ]
  // 卖出三档（4/6/9 倍日波动，或触及布林上轨，封顶 +15%）
  const sellPoint = round(last + 5 * a, 4)
  const sellLevels = [
    { label: '减仓(30%)', price: clamp(last + 4 * a, last, 0.15) },
    { label: '减仓(30%)', price: clamp(last + 6 * a, last, 0.15) },
    { label: '清仓(40%)', price: clamp(Math.max(last + 9 * a, bollUpper), last, 0.15) },
  ]
  // 止损：首仓价下方 5 倍日波动，封顶 -15%
  const stopLoss = clamp(buyLevels[0].price - 5 * a, last, 0.15)
  // 止盈：盈亏比 2:1，且至少高于当前价 +3%（保证正期望），封顶 +15%
  const risk = buyLevels[0].price - stopLoss
  let takeProfit = clamp(buyLevels[0].price + 2 * Math.abs(risk), last, 0.15)
  takeProfit = round(Math.max(takeProfit, last * 1.03), 4)
  const rewardRisk = Math.abs((takeProfit - buyLevels[0].price) / Math.abs(buyLevels[0].price - stopLoss) || 1)

  return {
    indicators: {
      ma5: lastMA5,
      ma10: lastMA10,
      ma20: lastMA20,
      ma60: lastMA60,
      rsi: lastRSI,
      bollUpper: bollUpper,
      bollLower: bollLower,
      macd: { dif: lastDIF, dea: lastDEA, hist: lastHist },
      atr: round(a, 4),
    },
    series: {
      ma5, ma10, ma20, rsi: rsiArr,
      bollMid: boll.mid, bollUpper: boll.upper, bollLower: boll.lower,
      macdDif: macdData.dif, macdDea: macdData.dea, macdHist: macdData.hist,
    },
    drawdown: mdd,
    cross: { maCross, macdCross },
    signals: {
      score: round(score, 2),
      action,
      actionLevel,
      actionText,
      reasons,
      // 主买卖点（向后兼容）
      buyPoint,
      sellPoint,
      stopLoss,
      takeProfit,
      // 分批建仓档位（新）
      buyLevels,
      sellLevels,
      rewardRisk: round(rewardRisk, 2),
      currentPrice: last,
      downsideToBuy: round((buyPoint - last) / last, 4),
      upsideToSell: round((sellPoint - last) / last, 4),
    },
  }
}

// ---- 历史买卖点回溯（在净值图上标注）----
// 模拟 MA5/MA10 金叉死叉序列，返回买卖事件
export function backtestSignals(navs, ma5, ma10) {
  const buys = []
  const sells = []
  for (let i = 1; i < navs.length; i++) {
    if (ma5[i - 1] == null || ma10[i - 1] == null) continue
    const prev = ma5[i - 1] - ma10[i - 1]
    const cur = ma5[i] - ma10[i]
    if (prev <= 0 && cur > 0) {
      buys.push({ coord: [navs[i].date, navs[i].nav], value: navs[i].nav })
    } else if (prev >= 0 && cur < 0) {
      sells.push({ coord: [navs[i].date, navs[i].nav], value: navs[i].nav })
    }
  }
  return { buys, sells }
}
