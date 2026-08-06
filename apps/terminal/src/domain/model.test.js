import { describe, it, expect } from 'vitest'
import {
  normalizeBar,
  fromTencentKline,
  fromTencentIntraday,
  fromSinaEstimate,
  fromEastmoneyNav,
} from '@/domain/model'
import { DATA_SOURCE, DATA_QUALITY, extractQuality } from '@/utils/dataQuality'

describe('数据模型归一化（借鉴 vnpy object 设计）', () => {
  it('normalizeBar：收口不同字段名为统一 OHLCV', () => {
    const state = normalizeBar(
      { date: '2026-07-01', open: 10, high: 11, low: 9, close: 10.5, volume: 1000 },
      { symbol: '1.600519', source: DATA_SOURCE.EASTMONEY, quality: DATA_QUALITY.EOD },
    )
    const b = state.data
    expect(b.symbol).toBe('1.600519')
    expect(b.datetime).toBe('2026-07-01')
    expect(b.open).toBe(10)
    expect(b.high).toBe(11)
    expect(b.low).toBe(9)
    expect(b.close).toBe(10.5)
    expect(b.volume).toBe(1000)
    expect(state.source).toBe(DATA_SOURCE.EASTMONEY)
    expect(extractQuality(state)).toBe(DATA_QUALITY.EOD)
  })

  it('normalizeBar：NaN 兜底为 0', () => {
    const b = normalizeBar({ date: '2026-07-01', open: 'x', high: null, low: undefined, close: NaN, volume: 'NaN' }).data
    expect(b.open).toBe(0)
    expect(b.high).toBe(0)
    expect(Number.isFinite(b.close)).toBe(true)
  })

  it('fromTencentKline：腾讯 [date,o,c,h,l,v] 行转归一化 Bar[]', () => {
    const rows = [
      ['2026-07-01', 10, 10.5, 11, 9, 100],
      ['2026-07-02', 10.5, 11, 11.5, 10, 120],
    ]
    const states = fromTencentKline(rows, 'sh600519')
    expect(states.length).toBe(2)
    expect(states[0].data.close).toBe(10.5)
    expect(states[0].data.high).toBe(11)
    expect(states[0].data.low).toBe(9)
    expect(states[0].source).toBe(DATA_SOURCE.TENCENT)
    expect(extractQuality(states[0])).toBe(DATA_QUALITY.EOD)
  })

  it('fromTencentKline：空输入返回空数组', () => {
    expect(fromTencentKline(null, 'x')).toEqual([])
  })

  it('fromTencentIntraday：分时字符串转 {ticks, prevClose}', () => {
    const block = {
      data: { data: ['0930 12.00 100 1200000.00', '0931 12.10 80 960000.00'] },
      qt: { sh600519: [0, 0, 0, 0, 11.9, 0] },
    }
    const state = fromTencentIntraday(block, 'sh600519')
    const { ticks, prevClose } = state.data
    expect(ticks.length).toBe(2)
    expect(ticks[0].price).toBe(12)
    expect(ticks[0].avg).toBeCloseTo(1200000 / 100 / 100, 2)
    expect(prevClose).toBe(11.9)
    expect(extractQuality(state)).toBe(DATA_QUALITY.VERIFIED)
  })

  it('fromTencentIntraday：无数据返回 unavailable', () => {
    const state = fromTencentIntraday({}, 'x')
    expect(extractQuality(state)).toBe(DATA_QUALITY.UNAVAILABLE)
    expect(state.data).toEqual([])
  })

  it('fromSinaEstimate：新浪估值收口为估算模型', () => {
    const raw = { result: { data: { worth: 1.234, worth_rate: 0.0123, worth_date: '20260723', desc: { text_base: '测试基金' } } } }
    const state = fromSinaEstimate(raw, '000001')
    const d = state.data
    expect(d.nav).toBe(1.234)
    expect(d.changePct).toBeCloseTo(1.23, 2)
    expect(d.asOf).toBe('2026-07-23')
    expect(extractQuality(state)).toBe(DATA_QUALITY.ESTIMATED)
    expect(state.source).toBe(DATA_SOURCE.SINA)
  })

  it('fromSinaEstimate：无 worth 返回 unavailable', () => {
    const state = fromSinaEstimate({ result: {} }, '000001')
    expect(extractQuality(state)).toBe(DATA_QUALITY.UNAVAILABLE)
  })

  it('fromEastmoneyNav：东财 lsjz 收口为 NAV[]', () => {
    const list = [
      { date: '2026-07-01', nav: 1.1, changePct: 0.01 },
      { date: '2026-07-02', nav: 1.12, changePct: 0.018 },
    ]
    const state = fromEastmoneyNav(list, '000001')
    const navs = state.data
    expect(navs.length).toBe(2)
    expect(navs[0].nav).toBe(1.1)
    expect(navs[1].changePct).toBeCloseTo(0.018, 4)
    expect(extractQuality(state)).toBe(DATA_QUALITY.EOD)
    expect(state.asOf).toBe('2026-07-02')
  })

  it('fromEastmoneyNav：空输入返回 unavailable', () => {
    const state = fromEastmoneyNav([], '000001')
    expect(extractQuality(state)).toBe(DATA_QUALITY.UNAVAILABLE)
  })
})
