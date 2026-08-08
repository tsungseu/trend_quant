import { describe, it, expect } from 'vitest'
import { round, fmtThousands, fmtMoney, fmtPct, sign, genDates, makeRng } from '@/mock/_helpers'

describe('mock helpers - NaN guards', () => {
  it('round handles non-numeric input', () => {
    expect(round(NaN)).toBe(0)
    expect(round(undefined)).toBe(0)
    expect(round('abc')).toBe(0)
    expect(round(1.2345, 2)).toBe(1.23)
    expect(round(1.5, 0)).toBe(2)
  })

  it('fmtThousands falls back to 0', () => {
    expect(fmtThousands(NaN)).toBe('0')
    expect(fmtThousands(null)).toBe('0')
    expect(fmtThousands('abc')).toBe('0')
    expect(fmtThousands(1234567)).toBe('1,234,567')
  })

  it('fmtMoney formats with ¥ and never returns NaN', () => {
    expect(fmtMoney(1234.5)).toBe('¥1,234.50')
    expect(fmtMoney(NaN)).toBe('¥0.00')
    expect(fmtMoney(undefined)).toBe('¥0.00')
  })

  it('fmtPct formats ratios and guards against NaN', () => {
    expect(fmtPct(0.12)).toBe('+12.00%')
    expect(fmtPct(-0.05)).toBe('-5.00%')
    expect(fmtPct(0)).toBe('0.00%')
    expect(fmtPct(undefined)).toBe('0.00%')
    expect(fmtPct('abc')).toBe('0.00%')
  })

  it('sign returns + only for positive numbers', () => {
    expect(sign(1)).toBe('+')
    expect(sign(0)).toBe('')
    expect(sign(-1)).toBe('')
    expect(sign(NaN)).toBe('')
  })

  it('genDates produces consecutive ISO dates', () => {
    const arr = genDates(3, new Date('2026-07-28'))
    expect(arr).toHaveLength(3)
    expect(arr[0]).toBe('2026-07-26')
    expect(arr[2]).toBe('2026-07-28')
  })

  it('makeRng is deterministic for the same seed', () => {
    const a = makeRng(123)
    const b = makeRng(123)
    expect(a()).toBe(b())
    const r = makeRng(1)
    const v = r()
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(1)
  })
})
