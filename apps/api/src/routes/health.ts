// 健康检查路由：不鉴权，供 Fly.io 健康探针和部署后冒烟测试使用。

import type { FastifyInstance } from 'fastify'
import { config, isConfigured } from '../config.js'

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    const { ok, missing } = isConfigured()
    return {
      status: ok ? 'ok' : 'degraded',
      service: '@trendquant/api',
      // 只暴露缺失项的名字，绝不暴露任何密钥值
      missing,
      qdrant: config.qdrantUrl ? 'configured' : 'missing',
    }
  })

  app.get('/', async () => ({ service: '@trendquant/api', docs: '/health' }))
}
