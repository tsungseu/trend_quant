import { describe, it, expect, vi, afterEach } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { authHook, requireAuth, getUserId, type AuthState } from '../src/lib/auth.js'

// 鉴权 hook 三态测试：
// 1. 非生产 + 无密钥 → fake 模式（dev-local-user），无需 token
// 2. 生产 + 无密钥 → 拒绝无 token（401）
// 3. 任何模式 + 带 token → 解析 sub 作为 userId

function b64url(s: string): string {
  return Buffer.from(s).toString('base64url')
}

function makeToken(sub: string): string {
  return `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ sub }))}.sig`
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify()
  app.addHook('onRequest', authHook)
  app.get('/whoami', { preHandler: requireAuth }, async (req) => ({ userId: getUserId(req) }))
  await app.ready()
  return app
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('authHook dev fake mode', () => {
  it('非生产 + 无 CLERK_SECRET_KEY：无 token 也放行（fake userId）', async () => {
    vi.stubEnv('NODE_ENV', '') // 未设置视为开发
    delete process.env.CLERK_SECRET_KEY
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/whoami' })
    expect(res.statusCode).toBe(200)
    expect(res.json().userId).toBe('dev-local-user')
    await app.close()
  })

  it('NODE_ENV=development + 无密钥：同样 fake 放行', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    delete process.env.CLERK_SECRET_KEY
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/whoami' })
    expect(res.statusCode).toBe(200)
    await app.close()
  })
})

describe('authHook production mode', () => {
  it('生产 + 无密钥 + 无 token：401', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env.CLERK_SECRET_KEY
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/whoami' })
    expect(res.statusCode).toBe(401)
    await app.close()
  })

  it('生产 + 有密钥 + 无 token：401', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.CLERK_SECRET_KEY = 'sk_live_test'
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/whoami' })
    expect(res.statusCode).toBe(401)
    delete process.env.CLERK_SECRET_KEY
    await app.close()
  })
})

describe('authHook token parsing', () => {
  it('带合法三段式 token：解析 sub 作为 userId', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.CLERK_SECRET_KEY = 'sk_live_test'
    const app = await buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/whoami',
      headers: { authorization: `Bearer ${makeToken('user_abc')}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().userId).toBe('user_abc')
    delete process.env.CLERK_SECRET_KEY
    await app.close()
  })

  it('畸形 token（非三段式）：401', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.CLERK_SECRET_KEY = 'sk_live_test'
    const app = await buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/whoami',
      headers: { authorization: 'Bearer not.a.jwt.too-many' },
    })
    expect(res.statusCode).toBe(401)
    delete process.env.CLERK_SECRET_KEY
    await app.close()
  })

  it('token 无 sub：401', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.CLERK_SECRET_KEY = 'sk_live_test'
    const app = await buildApp()
    const token = `${b64url('{}')}.${b64url(JSON.stringify({ noSub: true }))}.sig`
    const res = await app.inject({
      method: 'GET',
      url: '/whoami',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(401)
    delete process.env.CLERK_SECRET_KEY
    await app.close()
  })
})
