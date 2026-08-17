// 控制台路由：CodeRouterX 网关管理台的数据接口。
//
// 当前阶段为 mock 实现（返回样例数据），让终端前端先跑通"模型网关"模块。
// 待 coderouterx gateway 实现真实 /console/* 接口后，前端通过
// VITE_GATEWAY_API_URL 切换指向，本文件可移除或保留作开发兜底。
//
// 所有路由要求登录（复用 KB 的 requireAuth），数据按 userId 隔离。

import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../lib/auth.js'

export async function consoleRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', requireAuth)

  // 概览：KPI（余额/今日消费/请求数/错误率）+ 趋势 + 最近请求
  app.get('/console/overview', async () => mockOverview())

  // API Key 列表（mock）
  app.get('/console/keys', async () => ({ keys: mockKeys() }))

  // 用量趋势（mock，按天）
  app.get('/console/usage', async (req) => {
    const days = Number((req.query as { days?: string }).days ?? 14)
    return { series: mockUsageSeries(Math.min(Math.max(days, 1), 90)) }
  })

  // 钱包（mock）
  app.get('/console/wallet', async () => mockWallet())
}

// ============ mock 数据 ============

function mockOverview() {
  return {
    kpi: {
      balance: { value: 12.34, currency: 'CNY', deltaPct: -2.1 },
      todayCost: { value: 0.83, currency: 'CNY', deltaPct: 12.4 },
      todayRequests: { value: 1284, deltaPct: 8.7 },
      errorRate: { value: 0.4, unit: '%', deltaPct: -0.1 },
    },
    // 最近 12 小时 hourly 趋势，用于迷你折线图
    trend: {
      granularity: 'hour',
      points: Array.from({ length: 12 }, (_, i) => ({
        t: new Date(Date.now() - (11 - i) * 3600_000).toISOString(),
        requests: 40 + Math.round(Math.sin(i / 2) * 30 + i * 6 + Math.random() * 20),
        cost: +(0.03 + Math.sin(i / 3) * 0.02 + Math.random() * 0.04).toFixed(4),
      })),
    },
    recentRequests: mockRecentRequests(8),
    quota: {
      rpmLimit: 600,
      tpmLimit: 800_000,
      usedPct: 34,
    },
  }
}

function mockKeys() {
  return [
    {
      id: 'key_live_a1b2',
      name: '生产默认',
      prefix: 'sk-cr-************************************a1b2',
      status: 'active',
      createdAt: '2026-07-12T08:30:00Z',
      lastUsedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
      todayRequests: 1102,
    },
    {
      id: 'key_test_c3d4',
      name: '本地调试',
      prefix: 'sk-cr-************************************c3d4',
      status: 'active',
      createdAt: '2026-08-01T10:00:00Z',
      lastUsedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
      todayRequests: 182,
    },
    {
      id: 'key_old_e5f6',
      name: '旧版（已停用）',
      prefix: 'sk-cr-************************************e5f6',
      status: 'disabled',
      createdAt: '2026-05-20T09:00:00Z',
      lastUsedAt: '2026-06-15T14:00:00Z',
      todayRequests: 0,
    },
  ]
}

function mockUsageSeries(days: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86_400_000)
    return {
      date: d.toISOString().slice(0, 10),
      requests: 500 + Math.round(Math.sin(i / 3) * 200 + i * 15 + Math.random() * 100),
      cost: +(8 + Math.sin(i / 4) * 3 + Math.random() * 4).toFixed(2),
    }
  })
}

function mockWallet() {
  return {
    balance: { value: 12.34, currency: 'CNY' },
    cumulativeCost: { value: 47.21, currency: 'CNY', since: '2026-07-12' },
    transactions: [
      { id: 'tx1', type: 'recharge', amount: 50.0, currency: 'CNY', method: '支付宝', at: '2026-07-12T08:00:00Z', status: 'success' },
      { id: 'tx2', type: 'consume', amount: -3.42, currency: 'CNY', desc: 'API 消费 · 7 月 8 日', at: '2026-08-08T00:00:00Z', status: 'success' },
      { id: 'tx3', type: 'consume', amount: -2.18, currency: 'CNY', desc: 'API 消费 · 7 月 7 日', at: '2026-08-07T00:00:00Z', status: 'success' },
      { id: 'tx4', type: 'consume', amount: -4.05, currency: 'CNY', desc: 'API 消费 · 7 月 6 日', at: '2026-08-06T00:00:00Z', status: 'success' },
    ],
    realname: { verified: true, name: '徐**', submittedAt: '2026-07-10T12:00:00Z' },
  }
}

function mockRecentRequests(n: number) {
  const models = ['glm-5.2', 'deepseek-v4-flash', 'kimi-3', 'gpt-5.6-sol', 'minmax-3']
  const codes = [200, 200, 200, 200, 200, 200, 429, 500]
  return Array.from({ length: n }, (_, i) => {
    const code = codes[Math.floor(Math.random() * codes.length)]
    return {
      at: new Date(Date.now() - i * (60_000 + Math.random() * 120_000)).toISOString(),
      model: models[Math.floor(Math.random() * models.length)],
      tokensIn: 200 + Math.floor(Math.random() * 1800),
      tokensOut: 100 + Math.floor(Math.random() * 900),
      cost: +(0.001 + Math.random() * 0.02).toFixed(4),
      status: code,
      latencyMs: 300 + Math.floor(Math.random() * 1500),
    }
  })
}
