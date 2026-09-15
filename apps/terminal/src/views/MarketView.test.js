import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useMarketStore } from '@/stores/market'
import MarketView from './MarketView.vue'

vi.mock('@/api/dataClient', async (importOriginal) => ({
  ...await importOriginal(),
  fetchStockKline: vi.fn().mockResolvedValue({ data: [
    { date: '2026-09-14', open: 10, close: 11, high: 12, low: 9, volume: 100 },
    { date: '2026-09-15', open: 11, close: 12, high: 13, low: 10, volume: 120 },
  ] }),
}))

afterEach(() => vi.restoreAllMocks())

describe('Market compact layout controls', () => {
  it('changes the active stock and preserves K-line / intraday switching', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const market = useMarketStore()
    vi.spyOn(market, 'fetchKline').mockResolvedValue(undefined)
    vi.spyOn(market, 'fetchRealIntraday').mockResolvedValue(undefined)
    const wrapper = mount(MarketView, {
      global: { plugins: [pinia], stubs: { EChart: true } },
    })
    const nextStock = market.stocks.find((stock) => stock.code !== market.activeCode)
    await wrapper.get('.compact-stock-picker select').setValue(nextStock.code)
    expect(market.activeCode).toBe(nextStock.code)
    expect(wrapper.get('.s-main h2').text()).toContain(nextStock.name)
    expect(market.fetchKline).toHaveBeenCalledWith(nextStock.code)
    await wrapper.get('.s-actions .seg button:nth-child(2)').trigger('click')
    expect(wrapper.find('.ma-toggles').exists()).toBe(false)
    expect(market.fetchRealIntraday).toHaveBeenCalledWith(nextStock.code)
    await wrapper.get('.s-actions .seg button:first-child').trigger('click')
    expect(wrapper.findAll('.ma-toggles button')).toHaveLength(3)
    wrapper.unmount()
  })
})
