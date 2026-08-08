import { describe, it, expect } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { buildRoutes } from './index.js'
import { legacyProductRedirects } from '@/data/catalog'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: buildRoutes(),
  })
}

describe('legacy product redirects', () => {
  it.each(Object.entries(legacyProductRedirects))(
    'redirects /products/%s to /products/%s',
    async (from, to) => {
      const router = makeRouter()
      await router.push(`/products/${from}`)
      // 等待重定向解析
      await router.isReady()
      expect(router.currentRoute.value.path).toBe(`/products/${to}`)
    },
  )
})

describe('marketing routes', () => {
  it('serves home at /', async () => {
    const router = makeRouter()
    await router.push('/')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('serves products index at /products', async () => {
    const router = makeRouter()
    await router.push('/products')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('products')
  })

  it('serves product detail at /products/:slug', async () => {
    const router = makeRouter()
    await router.push('/products/agent')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('product-detail')
    expect(router.currentRoute.value.params.slug).toBe('agent')
  })

  it('serves pricing, docs, about by name', async () => {
    const router = makeRouter()
    for (const [path, name] of [
      ['/pricing', 'pricing'],
      ['/docs', 'docs'],
      ['/about', 'about'],
    ]) {
      await router.push(path)
      await router.isReady()
      expect(router.currentRoute.value.name).toBe(name)
    }
  })

  it('routes unknown paths to the not-found catch-all (preserving layout)', async () => {
    const router = makeRouter()
    await router.push('/this-does-not-exist')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('not-found')
  })
})

describe('redirect vs detail route ordering', () => {
  // 安全网：若未来 legacyProductRedirects 增加了与 products slug（agent/studio）
  // 同名的键，重定向会吞掉详情页。此用例显式断言当前两个 slug 不在 legacy 映射中，
  // 防止 PR 误改路由顺序（P1-5 风险）。
  it('does not shadow real product slugs with a legacy redirect', () => {
    const realSlugs = ['agent', 'studio']
    const legacyFroms = Object.keys(legacyProductRedirects)
    for (const slug of realSlugs) {
      expect(legacyFroms, `slug "${slug}" must not appear as a legacy redirect key`).not.toContain(slug)
    }
  })

  it('legacy redirect targets point at existing product slugs', () => {
    const realSlugs = ['agent', 'studio']
    for (const target of Object.values(legacyProductRedirects)) {
      expect(realSlugs, `legacy target "${target}" must be a real slug`).toContain(target)
    }
  })
})
