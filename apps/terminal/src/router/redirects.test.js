import { describe, it, expect } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { buildRoutes } from './index.js'

describe('legacy redirects', () => {
  it('redirects /strategies to /app/strategies', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: buildRoutes(),
    })
    await router.push('/strategies')
    expect(router.currentRoute.value.path).toBe('/app/strategies')
  })

  it('redirects / to /app', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: buildRoutes(),
    })
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/app')
  })

  it('serves overview at /app', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: buildRoutes(),
    })
    await router.push('/app')
    expect(router.currentRoute.value.name).toBe('overview')
  })

  it('redirects /strategies/:id to /app/strategies/:id', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: buildRoutes(),
    })
    await router.push('/strategies/abc123')
    expect(router.currentRoute.value.path).toBe('/app/strategies/abc123')
  })

  it('redirects /funds/:code to /app/funds/:code', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: buildRoutes(),
    })
    await router.push('/funds/510300')
    expect(router.currentRoute.value.path).toBe('/app/funds/510300')
  })

  it.each([
    ['/market', '/app/market'],
    ['/holdings', '/app/holdings'],
    ['/trades', '/app/trades'],
    ['/alerts', '/app/alerts'],
    ['/advisor', '/app/advisor'],
    ['/settings', '/app/settings'],
    ['/backtest', '/app/backtest'],
    ['/news', '/app/news'],
    ['/funds', '/app/funds'],
  ])('redirects %s to %s', async (from, to) => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: buildRoutes(),
    })
    await router.push(from)
    expect(router.currentRoute.value.path).toBe(to)
  })

  it('keeps the not-found catch-all working under unknown paths', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: buildRoutes(),
    })
    await router.push('/this-does-not-exist')
    expect(router.currentRoute.value.name).toBe('not-found')
  })
})
