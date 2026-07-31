import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAccountStore } from '@/stores/account'
import { fetchStockKline } from '@/api/dataClient'

vi.mock('@/api/dataClient', () => ({
  fetchStockKline: vi.fn(),
}))

function toKlines(dates, base = 1000) {
  return dates.map((date, idx) => ({
    date,
    open: base + idx,
    close: base + idx + 1,
    high: base + idx + 2,
    low: base + idx - 1,
    volume: 1000 + idx,
  }))
}

describe('account benchmark fallback', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('纳指真实线失败时，仍保留沪深300真实线', async () => {
    const store = useAccountStore()
    const dates = store.curve.map((p) => p.date)
    const hs300Data = toKlines(dates, 3000)

    fetchStockKline.mockImplementation(async (secid) => {
      if (secid === '1.000300') return { data: hs300Data }
      if (secid === 'usNDX') throw new Error('ndx gateway timeout')
      throw new Error('unexpected secid ' + secid)
    })

    await store.loadBenchmark()

    expect(store.benchmarkHasRealHs300).toBe(true)
    expect(store.benchmarkHasRealNdx).toBe(false)

    const rowWithHs300 = store.vsBenchmark.find((p) => p.hs300Real)
    expect(rowWithHs300).toBeTruthy()
    expect(rowWithHs300.ndx100Real).toBe(false)
  })
})
