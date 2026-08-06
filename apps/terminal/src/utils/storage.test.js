import { describe, it, expect, beforeEach } from 'vitest'
import {
  safeLoad,
  safeSave,
  safeGetItem,
  safeSetItem,
  normalizeCode,
  normalizeWatchlist,
  normalizePositions,
  normalizeFundMeta,
  normalizeAlertRules,
  cleanText,
  clampNumber,
  todayISO,
  createId,
} from '@/utils/storage'

describe('storage utils', () => {
  beforeEach(() => localStorage.clear())

  describe('safeLoad / safeSave', () => {
    it('returns normalized fallback when key missing', () => {
      expect(safeLoad('missing', [1, 2])).toEqual([1, 2])
    })

    it('returns fallback on corrupted JSON', () => {
      localStorage.setItem('bad', '{not json')
      expect(safeLoad('bad', 'fb')).toBe('fb')
    })

    it('round-trips through versioned envelope', () => {
      safeSave('k', { a: 1 })
      expect(safeLoad('k', null)).toEqual({ a: 1 })
    })

    it('reads legacy non-versioned payloads', () => {
      localStorage.setItem('legacy', JSON.stringify([1, 2, 3]))
      expect(safeLoad('legacy', [])).toEqual([1, 2, 3])
    })
  })

  describe('safeGetItem / safeSetItem', () => {
    it('swallows quota errors', () => {
      expect(() => safeSetItem('k', 'v')).not.toThrow()
      expect(safeGetItem('k')).toBe('v')
    })
  })

  describe('normalizeCode', () => {
    it('keeps 6 digits', () => {
      expect(normalizeCode('019305')).toBe('019305')
      expect(normalizeCode('SH019305')).toBe('019305')
      expect(normalizeCode('abc')).toBe('')
      expect(normalizeCode('123')).toBe('')
      expect(normalizeCode(null)).toBe('')
    })
  })

  describe('normalizeWatchlist', () => {
    it('dedupes and validates', () => {
      expect(normalizeWatchlist(['019305', '019305', 'bad', '017731'])).toEqual(['019305', '017731'])
      expect(normalizeWatchlist(null, ['019305'])).toEqual(['019305'])
    })
  })

  describe('normalizePositions', () => {
    it('rejects malformed structures', () => {
      expect(normalizePositions(null)).toEqual({})
      expect(normalizePositions([])).toEqual({})
      expect(normalizePositions({ bad: {} })).toEqual({})
      const out = normalizePositions({ '019305': { shares: 100, costPrice: 1.5 } })
      expect(out['019305']).toEqual({ shares: 100, costPrice: 1.5 })
    })

    it('preserves user-set positions including zeroed placeholders', () => {
      // shares/costPrice 都为 0 的"已清仓占位"应保留（原实现静默丢失）
      const out = normalizePositions({ '019305': { shares: 0, costPrice: 0 } })
      expect(out['019305']).toEqual({ shares: 0, costPrice: 0 })
      // 仅丢弃无意义空对象（无 shares/costPrice 字段）
      const out2 = normalizePositions({ '019305': {} })
      expect(out2['019305']).toBeUndefined()
    })

    it('clamps invalid numbers', () => {
      // shares 被夹到 0，costPrice 被夹到 0，但仍保留（字段显式存在）
      const out = normalizePositions({ '019305': { shares: 'x', costPrice: -1 } })
      expect(out['019305']).toEqual({ shares: 0, costPrice: 0 })
    })
  })

  describe('normalizeFundMeta', () => {
    it('truncates and trims text fields', () => {
      const out = normalizeFundMeta({ '019305': { name: '  Test  Fund  ', type: 'Index' } })
      expect(out['019305'].name).toBe('Test Fund')
      expect(out['019305'].type).toBe('Index')
    })

    it('skips invalid entries', () => {
      expect(normalizeFundMeta(null)).toEqual({})
      expect(normalizeFundMeta({ bad: { name: 'x' } })).toEqual({})
    })
  })

  describe('normalizeAlertRules', () => {
    it('fills defaults and validates enums', () => {
      const rules = normalizeAlertRules([{
        id: 'r1',
        name: '茅台提醒',
        symbol: 'SH600519',
        symbolName: '贵州茅台',
        type: 'price',
        op: '>=',
        target: 1750,
      }])
      expect(rules).toHaveLength(1)
      const r = rules[0]
      expect(r.id).toBe('r1')
      expect(r.enabled).toBe(true)
      expect(r.channels).toEqual(['app'])
      expect(r.triggered).toBe(0)
      expect(r.createdAt).toBeTruthy()
      expect(r.lastHit).toBe(false)
    })

    it('falls back bad enums to price/>=', () => {
      const [r] = normalizeAlertRules([{ name: 'x', symbol: 'SH600519', type: 'foo', op: 'bar', target: 1 }])
      expect(r.type).toBe('price')
      expect(r.op).toBe('>=')
    })

    it('dedupes duplicate ids', () => {
      const rules = normalizeAlertRules([
        { id: 'dup', symbol: 'SH600519', target: 1 },
        { id: 'dup', symbol: 'SH600519', target: 2 },
      ])
      expect(rules.map((r) => r.id)).toHaveLength(2)
      expect(new Set(rules.map((r) => r.id)).size).toBe(2)
    })
  })

  describe('helpers', () => {
    it('cleanText collapses whitespace and truncates', () => {
      expect(cleanText('  a   b  ', 10)).toBe('a b')
      expect(cleanText('abcdef', 3)).toBe('abc')
      expect(cleanText(null)).toBe('')
    })

    it('clampNumber clamps to range', () => {
      expect(clampNumber(5, 0, 10)).toBe(5)
      expect(clampNumber(-1, 0, 10)).toBe(0)
      expect(clampNumber(11, 0, 10)).toBe(10)
      expect(clampNumber('x', 2, 4)).toBe(2)
    })

    it('todayISO returns YYYY-MM-DD', () => {
      expect(todayISO(new Date('2026-07-28T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('createId returns unique prefixed ids', () => {
      const a = createId('a')
      const b = createId('a')
      expect(a).not.toBe(b)
      expect(a.startsWith('a-')).toBe(true)
    })
  })
})
