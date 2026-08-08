// 服务入口：Fastify bootstrap，挂载 CORS、鉴权 hook、路由。

import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { config } from './config.js'
import { authHook } from './lib/auth.js'
import { healthRoutes } from './routes/health.js'
import { kbRoutes } from './routes/kb.js'
import { queryRoutes } from './routes/query.js'
import { chatRoutes } from './routes/chat.js'

async function main() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      // redact 默认会处理 authorization；额外显式屏蔽常见密钥头
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
  })

  // CORS：仅允许配置的前端来源
  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  })

  // 文件上传（KB 文档）
  await app.register(multipart, {
    limits: { fileSize: 25 * 1024 * 1024 },
  })

  // 全局鉴权 hook（health / 根路径在路由内自查或豁免）
  app.addHook('onRequest', async (req, reply) => {
    const path = req.url.split('?')[0]
    if (path === '/health' || path === '/') return
    await authHook(req, reply)
  })

  await app.register(healthRoutes)
  await app.register(kbRoutes)
  await app.register(queryRoutes)
  await app.register(chatRoutes)

  // KB / chat 路由在后续 PR 注册；此处先占位，确认骨架可启动
  app.get('/_version', async () => ({ version: '0.1.0', phase: 'scaffold' }))

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' })
    app.log.info({ port: config.port, env: config.nodeEnv }, '@trendquant/api listening')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('fatal', err)
  process.exit(1)
})
