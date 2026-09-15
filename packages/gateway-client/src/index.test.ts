import { describe, it, expect, vi } from 'vitest'
import { GatewayClient } from './index.js'

function fakeFetch(
  handler: (url: string, init?: RequestInit) => { status: number; body: unknown },
) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = typeof url === 'string' ? url : url.toString()
    const { status, body } = handler(u, init)
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof fetch
}

describe('GatewayClient', () => {
  it('未配置真实网关时回退到 fallbackBaseUrl（mock）', async () => {
    const fetchImpl = fakeFetch((url) => {
      expect(url.startsWith('http://localhost:8080/console/')).toBe(true)
      return { status: 200, body: { kpi: {}, trend: { points: [] }, recentRequests: [], quota: {} } }
    })
    const client = new GatewayClient({
      fallbackBaseUrl: 'http://localhost:8080',
      getToken: async () => 'tok',
      fetchImpl,
    })
    expect(client.isRealGateway).toBe(false)
    await client.overview()
  })

  it('配置真实网关时使用真实地址，且 isRealGateway=true', async () => {
    const fetchImpl = fakeFetch((url) => {
      expect(url.startsWith('https://gateway.example.com/console/')).toBe(true)
      return { status: 200, body: { keys: [] } }
    })
    const client = new GatewayClient({
      baseUrl: 'https://gateway.example.com',
      fallbackBaseUrl: 'http://localhost:8080',
      getToken: async () => 'tok',
      fetchImpl,
    })
    expect(client.isRealGateway).toBe(true)
    await client.keys()
  })

  it('每次请求带 Bearer token', async () => {
    const fetchImpl = fakeFetch((_url, init) => {
      const h = (init?.headers as Record<string, string>) ?? {}
      expect(h['authorization']).toBe('Bearer mytoken')
      return { status: 200, body: { series: [] } }
    })
    const client = new GatewayClient({
      fallbackBaseUrl: 'http://localhost:8080',
      getToken: async () => 'mytoken',
      fetchImpl,
    })
    await client.usage(7)
  })

  it('usage 拼接 days 参数', async () => {
    const fetchImpl = fakeFetch((url) => {
      expect(url).toContain('days=14')
      return { status: 200, body: { series: [] } }
    })
    const client = new GatewayClient({
      fallbackBaseUrl: 'http://localhost:8080',
      getToken: async () => 't',
      fetchImpl,
    })
    await client.usage(14)
  })

  it('非 200 抛错', async () => {
    const fetchImpl = fakeFetch(() => ({ status: 500, body: { error: 'boom' } }))
    const client = new GatewayClient({
      fallbackBaseUrl: 'http://localhost:8080',
      getToken: async () => 't',
      fetchImpl,
    })
    await expect(client.wallet()).rejects.toThrow(/500/)
  })
})
