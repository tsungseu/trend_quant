import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import type { FastifyInstance } from 'fastify'
import { healthRoutes } from '../src/routes/health.js'

// health 路由不依赖鉴权 hook（index.ts 里豁免 /health），这里单独构造一个
// 只挂 healthRoutes 的实例，验证其纯函数行为。

let app: FastifyInstance

beforeAll(async () => {
  app = Fastify()
  await app.register(cors, {})
  await app.register(healthRoutes)
  await app.ready()
})

afterAll(async () => {
  await app.close()
})

describe('health routes', () => {
  it('GET /health returns 200 and service name', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.service).toBe('@trendquant/api')
    expect(['ok', 'degraded']).toContain(body.status)
    expect(Array.isArray(body.missing)).toBe(true)
  })

  it('GET / returns service pointer', async () => {
    const res = await app.inject({ method: 'GET', url: '/' })
    expect(res.statusCode).toBe(200)
    expect(res.json().docs).toBe('/health')
  })

  it('health never leaks secret values', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    const text = res.body
    // 不应出现疑似真实密钥的形态：OpenAI sk- 前缀、长 hex/base64 串、Bearer 头
    expect(text).not.toMatch(/sk-[A-Za-z0-9]{20,}/)
    expect(text).not.toMatch(/Bearer\s+\S+/i)
    expect(text).not.toMatch(/[A-Za-z0-9+/]{40,}={0,2}/)
    // missing 只允许暴露变量名，不允许暴露值
    expect(text).not.toMatch(/CLERK_SECRET_KEY\s*=/)
  })
})
