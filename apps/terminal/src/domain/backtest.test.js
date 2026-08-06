import { describe, it, expect } from 'vitest'
import {
  runStrategyBacktest,
  normalizeBars,
  resolveKlineCode,
  buildAiPrompt,
  fallbackAiComment,
} from './backtest'

function makeBars(n = 120, start = 100) {
  const bars = []
  let px = start
  const d0 = new Date('2025-01-02')
  for (let i = 0; i < n; i++) {
    // 先跌后涨，制造若干交叉
    const shock = i < 40 ? -0.004 : i < 80 ? 0.006 : -0.002
    px = px * (1 + shock + ((i % 7) - 3) * 0.001)
    const date = new Date(d0)
    date.setDate(d0.getDate() + i)
    bars.push({
      date: date.toISOString().slice(0, 10),
      open: px,
      close: px,
      high: px * 1.01,
      low: px * 0.99,
      volume: 1000,
    })
  }
  return bars
}

describe('resolveKlineCode', () => {
  it('转换 A股与美股代码', () => {
    expect(resolveKlineCode('SH510300')).toBe('1.510300')
    expect(resolveKlineCode('SZ159915')).toBe('0.159915')
    expect(resolveKlineCode('usNDX')).toBe('usNDX')
    expect(resolveKlineCode('usINX')).toBe('usINX')
  })
})

describe('normalizeBars', () => {
  it('从 dataState 提取有效 bars', () => {
    const bars = normalizeBars({ data: makeBars(40) })
    expect(bars.length).toBe(40)
  })
  it('数据不足时抛错', () => {
    expect(() => normalizeBars({ data: makeBars(5), error: 'x' })).toThrow(/过少|未获取/)
  })
})

describe('runStrategyBacktest', () => {
  it('双均线回测产出净值与指标', () => {
    const bars = makeBars(150)
    const out = runStrategyBacktest(bars, {
      strategy: 'ma',
      fastMA: 5,
      slowMA: 20,
      stopLoss: 8,
      takeProfit: 25,
      positionSize: 80,
      commission: 0.03,
      slippage: 0.05,
      initialCapital: 100000,
    })
    expect(out.equity.length).toBe(bars.length)
    expect(out.drawdown.length).toBe(bars.length)
    expect(out.metrics['年化收益']).toMatch(/%$/)
    expect(out.metrics['最大回撤']).toMatch(/%$/)
    expect(out.equity[0].strategy).toBeCloseTo(1, 1)
    expect(out.equity[0].benchmark).toBeCloseTo(1, 1)
  })

  it('动量/网格/因子策略可运行', () => {
    const bars = makeBars(100)
    for (const strategy of ['momentum', 'grid', 'factor']) {
      const out = runStrategyBacktest(bars, { strategy, fastMA: 5, slowMA: 20, positionSize: 100 })
      expect(out.equity.length).toBe(100)
    }
  })
})

describe('AI prompt helpers', () => {
  it('构建提示与本地摘要', () => {
    const metrics = {
      年化收益: '12.3%',
      基准年化: '8.1%',
      超额收益: '4.2%',
      最大回撤: '-9.5%',
      夏普比率: 1.2,
      索提诺: 1.5,
      胜率: 0.55,
      交易次数: 12,
      卡玛比率: 1.1,
    }
    const cfg = { symbol: 'usNDX', strategy: 'ma', fastMA: 5, slowMA: 20, stopLoss: 5, takeProfit: 30, positionSize: 80, period: '1Y' }
    const prompt = buildAiPrompt({ config: cfg, metrics, symbolName: '纳斯达克100', barsCount: 252, dataSource: 'yahoo' })
    expect(prompt).toContain('纳斯达克100')
    expect(prompt).toContain('不构成投资建议')
    const fb = fallbackAiComment({ config: cfg, metrics, symbolName: '纳斯达克100' })
    expect(fb).toContain('回测解读')
  })
})
