import { describe, it, expect, vi, afterEach } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { authHook } from '../src/lib/auth.js'
import { consoleRoutes } from '../src/routes/console.js'

// console 路由 mock 数据测试：
// 1. 无 token → 401（鉴权生效）
// 2. 有 token → 返回符合形状的数据（KPI/趋势/最近请求）
// 数据是 mock 的，重点验证形状稳定，不验证具体数值。

let app: FastifyInstance

async function build() {
  app = Fastify()
  app.addHook('onRequest', authHook)
  await app.register(consoleRoutes)
  await app.ready()
}

afterEach(async () => {
  if (app) await app.close()
  vi.unstubAllEnvs()
  delete process.env.CLERK_SECRET_KEY
})

function token(sub = 'user_test') {
  const b = (s: string) => Buffer.from(s).toString('base64url')
  return `${b('{}')}.${b(JSON.stringify({ sub }))}.sig`
}

describe('console routes auth', () => {
  it('生产模式无 token → 401', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.CLERK_SECRET_KEY = 'sk_test'
    await build()
    const res = await app.inject({ method: 'GET', url: '/console/overview' })
    expect(res.statusCode).toBe(401)
  })

  it('dev fake 模式无 token → 放行（返回数据）', async () => {
    vi.stubEnv('NODE_ENV', '')
    delete process.env.CLERK_SECRET_KEY
    await build()
    const res = await app.inject({ method: 'GET', url: '/console/overview' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.kpi).toBeDefined()
    expect(body.kpi.balance.value).toBeGreaterThan(0)
  })
})

describe('console overview shape', () => {
  beforeEach: undefined
  it('KPI 四项齐全，deltaPct 为数字', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.CLERK_SECRET_KEY = 'sk_test'
    await build()
    const res = await app.inject({
      method: 'GET',
      url: '/console/overview',
      headers: { authorization: `Bearer ${token()}` },
    })
    const { kpi, trend, recentRequests, quota } = res.json()
    for (const key of ['balance', 'todayCost', 'todayRequests', 'errorRate']) {
      expect(kpi[key], `kpi.${key} missing`).toBeDefined()
      expect(typeof kpi[key].value).toBe('number')
      expect(typeof kpi[key].deltaPct).toBe('number')
    }
    expect(trend.granularity).toBe('hour')
    expect(Array.isArray(trend.points)).toBe(true)
    expect(trend.points.length).toBe(12)
    expect(Array.isArray(recentRequests)).toBe(true)
    expect(recentRequests.length).toBeGreaterThan(0)
    expect(quota.rpmLimit).toBeGreaterThan(0)
  })

  it('trend 每个点带 t/requests/cost', async () => {
    await build()
    const res = await app.inject({ method: 'GET', url: '/console/overview' })
    const { trend } = res.json()
    for (const p of trend.points) {
      expect(typeof p.t).toBe('string')
      expect(typeof p.requests).toBe('number')
      expect(typeof p.cost).toBe('number')
    }
  })

  it('recentRequests 带状态码（200 或错误码）', async () => {
    await build()
    const res = await app.inject({ method: 'GET', url: '/console/overview' })
    const { recentRequests } = res.json()
    for (const r of recentRequests) {
      expect(typeof r.status).toBe('number')
      expect(r.model).toMatch(/^[a-z0-9.-]+$/)
      expect(r.cost).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('console keys / usage / wallet', () => {
  it('keys 返回数组，每项含 prefix/status', async () => {
    await build()
    const res = await app.inject({ method: 'GET', url: '/console/keys' })
    const { keys } = res.json()
    expect(Array.isArray(keys)).toBe(true)
    expect(keys.length).toBeGreaterThan(0)
    for (const k of keys) {
      expect(k.prefix).toMatch(/^sk-cr-/)
      expect(['active', 'disabled']).toContain(k.status)
    }
  })

  it('usage 默认 14 天，可指定 days', async () => {
    await build()
    const res14 = await app.inject({ method: 'GET', url: '/console/usage' })
    expect(res14.json().series).toHaveLength(14)
    const res7 = await app.inject({ method: 'GET', url: '/console/usage?days=7' })
    expect(res7.json().series).toHaveLength(7)
  })

  it('usage days 上下界裁剪（1..90）', async () => {
    await build()
    const res0 = await app.inject({ method: 'GET', url: '/console/usage?days=0' })
    expect(res0.json().series).toHaveLength(1)
    const res999 = await app.inject({ method: 'GET', url: '/console/usage?days=999' })
    expect(res999.json().series).toHaveLength(90)
  })

  it('wallet 含余额/交易/实名', async () => {
    await build()
    const res = await app.inject({ method: 'GET', url: '/console/wallet' })
    const body = res.json()
    expect(body.balance.value).toBeGreaterThan(0)
    expect(Array.isArray(body.transactions)).toBe(true)
    expect(body.realname).toBeDefined()
    expect(typeof body.realname.verified).toBe('boolean')
  })
})
