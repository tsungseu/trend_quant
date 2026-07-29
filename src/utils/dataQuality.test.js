import { describe, it, expect } from 'vitest'
import {
  DATA_QUALITY,
  DATA_SOURCE,
  makeDataState,
  makeUnavailable,
  makeMock,
  isTradableQuality,
  isReliableQuality,
  isFresh,
  qualityLabel,
  qualityClass,
  extractQuality,
} from '@/utils/dataQuality'

describe('dataQuality', () => {
  describe('makeDataState', () => {
    it('uses defaults when no meta provided', () => {
      const s = makeDataState([1, 2, 3])
      expect(s.data).toEqual([1, 2, 3])
      expect(s.source).toBe(DATA_SOURCE.LOCAL)
      expect(s.quality).toBe(DATA_QUALITY.UNAVAILABLE)
      expect(s.fetchedAt).toBeTruthy()
      expect(s.updatedAt).toContain(' ')
      expect(s.isFallback).toBe(false)
      expect(s.error).toBeNull()
    })

    it('respects meta overrides', () => {
      const s = makeDataState({ date: '2026-07-28' }, {
        source: DATA_SOURCE.EASTMONEY,
        quality: DATA_QUALITY.EOD,
        asOf: '2026-07-28',
        isFallback: true,
        error: 'nope',
      })
      expect(s.source).toBe(DATA_SOURCE.EASTMONEY)
      expect(s.quality).toBe(DATA_QUALITY.EOD)
      expect(s.asOf).toBe('2026-07-28')
      expect(s.isFallback).toBe(true)
      expect(s.error).toBe('nope')
    })

    it('infers asOf from array last item', () => {
      const s = makeDataState([{ date: '2026-07-01' }, { date: '2026-07-28' }])
      expect(s.asOf).toBe('2026-07-28')
    })
  })

  describe('makeUnavailable', () => {
    it('wraps errors into unavailable state', () => {
      const s = makeUnavailable(new Error('boom'), DATA_SOURCE.EASTMONEY)
      expect(s.quality).toBe(DATA_QUALITY.UNAVAILABLE)
      expect(s.source).toBe(DATA_SOURCE.EASTMONEY)
      expect(s.error).toBe('boom')
      expect(s.isFallback).toBe(true)
    })

    it('handles non-Error input', () => {
      expect(makeUnavailable(null).error).toBe('数据不可用')
      expect(makeUnavailable(undefined).error).toBe('数据不可用')
    })
  })

  describe('makeMock', () => {
    it('tags mock state', () => {
      const s = makeMock([1], '2026-07-28')
      expect(s.quality).toBe(DATA_QUALITY.MOCK)
      expect(s.source).toBe(DATA_SOURCE.MOCK)
      expect(s.isFallback).toBe(true)
      expect(s.asOf).toBe('2026-07-28')
    })
  })

  describe('quality predicates', () => {
    it('isTradableQuality accepts tradable qualities only', () => {
      expect(isTradableQuality({ quality: DATA_QUALITY.EOD })).toBe(true)
      expect(isTradableQuality({ quality: DATA_QUALITY.ESTIMATED })).toBe(true)
      expect(isTradableQuality({ quality: DATA_QUALITY.DELAYED })).toBe(true)
      expect(isTradableQuality({ quality: DATA_QUALITY.MOCK })).toBe(false)
      expect(isTradableQuality({ quality: DATA_QUALITY.UNAVAILABLE })).toBe(false)
      expect(isTradableQuality(null)).toBe(false)
    })

    it('isReliableQuality rejects estimated/mock/unavailable', () => {
      expect(isReliableQuality({ quality: DATA_QUALITY.VERIFIED })).toBe(true)
      expect(isReliableQuality({ quality: DATA_QUALITY.EOD })).toBe(true)
      expect(isReliableQuality({ quality: DATA_QUALITY.ESTIMATED })).toBe(false)
      expect(isReliableQuality({ quality: DATA_QUALITY.MOCK })).toBe(false)
    })

    it('isFresh checks fetchedAt/updatedAt within ttl', () => {
      const now = new Date().toISOString()
      expect(isFresh({ fetchedAt: now }, 60_000)).toBe(true)
      expect(isFresh({ fetchedAt: '2020-01-01T00:00:00Z' }, 60_000)).toBe(false)
      expect(isFresh(null, 60_000)).toBe(false)
      expect(isFresh({ fetchedAt: now }, 0)).toBe(false)
    })
  })

  describe('labels and classes', () => {
    it('qualityLabel pairs source with state', () => {
      expect(qualityLabel({ source: DATA_SOURCE.EASTMONEY, quality: DATA_QUALITY.EOD }))
        .toContain('东方财富')
      expect(qualityLabel({ quality: DATA_QUALITY.MOCK })).toBe('历史快照')
      expect(qualityLabel({ quality: DATA_QUALITY.UNAVAILABLE })).toBe('数据不可用')
    })

    it('qualityClass buckets into real/warn/fallback', () => {
      expect(qualityClass({ quality: DATA_QUALITY.EOD })).toBe('real')
      expect(qualityClass({ quality: DATA_QUALITY.ESTIMATED })).toBe('warn')
      expect(qualityClass({ quality: DATA_QUALITY.MOCK })).toBe('fallback')
      expect(qualityClass({ quality: DATA_QUALITY.UNAVAILABLE })).toBe('fallback')
    })

    it('extractQuality reads meta or nested meta', () => {
      expect(extractQuality({ quality: 'eod' })).toBe('eod')
      expect(extractQuality({ meta: { quality: 'eod' } })).toBe('eod')
      expect(extractQuality(null)).toBe(DATA_QUALITY.UNAVAILABLE)
    })
  })
})
