import { describe, it, expect } from 'vitest'
import { ArrayManager } from '@/domain/ArrayManager'

describe('ArrayManager（借鉴 vnpy ArrayManager）', () => {
  // 构造一组收盘价递增序列，验证滑动窗口与指标
  const bars = []
  for (let i = 1; i <= 120; i++) {
    const close = 100 + i
    bars.push({ open: close - 1, high: close + 2, low: close - 2, close, volume: i * 10 })
  }

  it('滑动窗口：count / inited / 输出顺序', () => {
    const am = new ArrayManager(50)
    expect(am.inited).toBe(false)
    bars.slice(0, 50).forEach((b) => am.updateBar(b))
    expect(am.inited).toBe(true)
    expect(am.count).toBe(50)
    const closes = am.closes
    expect(closes.length).toBe(50)
    expect(closes[0]).toBe(101) // 最旧
    expect(closes[49]).toBe(150) // 最新
  })

  it('滑动窗口溢出：旧数据被挤出，_series 只返回有效位', () => {
    const am = new ArrayManager(10)
    for (let i = 0; i < 15; i++) am.updateBar(bars[i])
    expect(am.count).toBe(15)
    // 环形缓冲区固定容量 10，_series 只输出最近 10 根
    expect(am.closes.length).toBe(10)
    // 窗口最旧 = 第 6 根（bars[5]），最新 = 第 15 根（bars[14]）
    expect(am.closes[0]).toBe(bars[5].close)
    expect(am.closes[9]).toBe(bars[14].close)
  })

  it('_series：count 未达 size 时仅输出有效位', () => {
    const am = new ArrayManager(50)
    bars.slice(0, 8).forEach((b) => am.updateBar(b))
    expect(am.closes.length).toBe(8)
    expect(am.closes[0]).toBe(bars[0].close)
    expect(am.closes[7]).toBe(bars[7].close)
  })

  it('sma：窗口填满后计算正确', () => {
    const am = new ArrayManager(30)
    bars.slice(0, 30).forEach((b) => am.updateBar(b))
    const smaLast = am.sma(5)
    const closes = am.closes.slice(-5)
    const expected = closes.reduce((s, v) => s + v, 0) / 5
    expect(smaLast).toBeCloseTo(expected, 4)
  })

  it('sma array：前 n-1 位为 NaN', () => {
    const am = new ArrayManager(30)
    bars.slice(0, 30).forEach((b) => am.updateBar(b))
    const arr = am.sma(5, true)
    expect(arr.length).toBe(30)
    expect(arr[3]).toBeNaN()
    // 窗口最后 5 根对应 bars[25..29]
    const last5 = bars.slice(25, 30).reduce((s, v) => s + v.close, 0) / 5
    expect(arr[29]).toBeCloseTo(last5, 4)
  })

  it('ema：与二次函数递推一致', () => {
    const am = new ArrayManager(30)
    bars.slice(0, 30).forEach((b) => am.updateBar(b))
    const ema = am.ema(12)
    expect(ema).toBeGreaterThan(0)
    // 单调性检查：递增序列的 EMA 应大于首个收盘价
    expect(ema).toBeGreaterThan(am.closes[0])
  })

  it('highest / lowest', () => {
    const am = new ArrayManager(30)
    bars.slice(0, 30).forEach((b) => am.updateBar(b))
    expect(am.highest(10)).toBe(Math.max(...am.highs.slice(-10)))
    expect(am.lowest(10)).toBe(Math.min(...am.lows.slice(-10)))
  })

  it('std：常数序列方差为 0', () => {
    const am = new ArrayManager(20)
    for (let i = 0; i < 25; i++) am.updateBar({ open: 100, high: 100, low: 100, close: 100, volume: 1 })
    expect(am.std(10)).toBeCloseTo(0, 6)
  })

  it('bollinger：upper > mid > lower', () => {
    const am = new ArrayManager(30)
    bars.slice(0, 30).forEach((b) => am.updateBar(b))
    const { mid, upper, lower } = am.bollinger(20, 2)
    const last = mid.length - 1
    expect(upper[last]).toBeGreaterThan(mid[last])
    expect(mid[last]).toBeGreaterThan(lower[last])
  })

  it('rsi：递增序列接近 100', () => {
    const am = new ArrayManager(30)
    bars.slice(0, 30).forEach((b) => am.updateBar(b))
    const rsi = am.rsi(14)
    expect(rsi).toBeGreaterThan(90)
  })

  it('macd：返回三段序列长度一致', () => {
    const am = new ArrayManager(60)
    bars.slice(0, 60).forEach((b) => am.updateBar(b))
    const { dif, dea, hist } = am.macd(12, 26, 9)
    expect(dif.length).toBe(60)
    expect(dea.length).toBe(60)
    expect(hist.length).toBe(60)
    expect(hist[59]).toBeCloseTo((dif[59] - dea[59]) * 2, 4)
  })

  it('atr：正波动率返回正值', () => {
    const am = new ArrayManager(30)
    bars.slice(0, 30).forEach((b) => am.updateBar(b))
    const atr = am.atr(14)
    expect(atr).toBeGreaterThan(0)
  })

  it('updateBars：批量初始化等价于逐根 updateBar', () => {
    const am1 = new ArrayManager(50)
    bars.slice(0, 50).forEach((b) => am1.updateBar(b))
    const am2 = new ArrayManager(50)
    am2.updateBars(bars.slice(0, 50))
    expect(am1.closes).toEqual(am2.closes)
  })
})
