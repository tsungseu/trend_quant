import { describe, it, expect } from 'vitest'
import { buildSignals, backtestSignals, sma, rsi, maxDrawdown, macd, atr } from '@/mock/indicators'

// 用稳定净值序列测试
function genNavs(start, drift, n = 60) {
  const out = []
  let v = start
  const today = new Date('2026-07-28')
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    v *= 1 + drift + (Math.sin(i) * 0.005)
    out.push({ date: d.toISOString().slice(0, 10), nav: +v.toFixed(4) })
  }
  return out
}

describe('indicators - pure functions', () => {
  it('sma pads leading nulls', () => {
    const out = sma([1, 2, 3, 4], 2)
    expect(out[0]).toBeNull()
    expect(out[1]).toBe(1.5)
    expect(out[3]).toBe(3.5)
  })

  it('rsi returns bounded values', () => {
    const vals = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i))
    const out = rsi(vals, 14)
    out.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    })
  })

  it('maxDrawdown detects a drawdown', () => {
    const out = maxDrawdown([10, 12, 8, 11, 9])
    expect(out.maxDD).toBeLessThanOrEqual(0)
    expect(out.peakIdx).toBe(1)
    expect(out.troughIdx).toBe(2)
  })

  it('macd produces equal-length arrays', () => {
    const vals = Array.from({ length: 50 }, (_, i) => 100 + i)
    const { dif, dea, hist } = macd(vals)
    expect(dif).toHaveLength(50)
    expect(dea).toHaveLength(50)
    expect(hist).toHaveLength(50)
  })

  it('atr never returns NaN', () => {
    const navs = genNavs(1.5, 0.001, 40)
    const v = atr(navs, 14)
    expect(Number.isFinite(v)).toBe(true)
    expect(v).toBeGreaterThanOrEqual(0)
  })

  it('atr returns 0 on insufficient input', () => {
    expect(atr([], 14)).toBe(0)
    expect(atr([{ nav: 1 }], 14)).toBe(0)
  })
})

describe('buildSignals - shape and finite outputs', () => {
  it('returns full signal object without NaN values', () => {
    const navs = genNavs(1.5, 0.002, 80)
    const fund = { pe: 25, pePct5y: 0.5, themeColor: '#3b82f6' }
    const out = buildSignals(fund, navs)
    expect(out.indicators).toBeTruthy()
    expect(out.signals).toBeTruthy()
    expect(out.series).toBeTruthy()
    expect(out.drawdown).toBeTruthy()
    // 关键字段不能是 NaN
    expect(Number.isFinite(out.indicators.rsi)).toBe(true)
    expect(Number.isFinite(out.signals.score)).toBe(true)
    expect(Number.isFinite(out.signals.buyPoint)).toBe(true)
    expect(Number.isFinite(out.signals.sellPoint)).toBe(true)
    expect(Number.isFinite(out.signals.rewardRisk)).toBe(true)
    // actionText 不应包含"建议买入/卖出"等强投资建议措辞
    expect(out.signals.actionText).not.toContain('建议买入')
    expect(out.signals.actionText).not.toContain('强烈买入')
    expect(out.signals.actionText).not.toContain('建议卖出')
    expect(out.signals.actionText).not.toContain('强烈卖出')
  })

  it('buyLevels/sellLevels have 3 entries each with finite prices', () => {
    const navs = genNavs(1.5, 0.001, 80)
    const out = buildSignals({ pe: 20, pePct5y: 0.4 }, navs)
    expect(out.signals.buyLevels).toHaveLength(3)
    expect(out.signals.sellLevels).toHaveLength(3)
    for (const lv of [...out.signals.buyLevels, ...out.signals.sellLevels]) {
      expect(Number.isFinite(lv.price)).toBe(true)
    }
  })
})

describe('backtestSignals', () => {
  it('returns buy/sell event arrays', () => {
    const navs = genNavs(1, 0.001, 80)
    const ma5 = sma(navs.map((n) => n.nav), 5)
    const ma10 = sma(navs.map((n) => n.nav), 10)
    const { buys, sells } = backtestSignals(navs, ma5, ma10)
    expect(Array.isArray(buys)).toBe(true)
    expect(Array.isArray(sells)).toBe(true)
  })
})
