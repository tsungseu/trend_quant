// Clerk 鉴权中间件：校验 Authorization: Bearer <session jwt>
//
// 设计要点：
// - 不依赖 @clerk/fastify 的自动插件（@clerk/backend 存在版本漂移），
//   直接用 clerk 后端 SDK 的 verifyToken；若 Clerk 不可用则可降级为
//   本地开发的 fake 模式（仅 NODE_ENV=development 且 CLERK_SECRET_KEY 为空）。
// - req.auth 填充 { userId } 供下游路由强制 tenant 过滤。

import type { FastifyReply, FastifyRequest } from 'fastify'

export interface AuthState {
  userId: string
}

// 扩展 Fastify 类型，使 req.auth 在全应用可用
declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthState
  }
}

const FAKE_DEV_USER = 'dev-local-user'

/**
 * 鉴权 hook：校验 Bearer JWT，填充 req.auth.userId。
 * 本地开发（CLERK_SECRET_KEY 缺失 + NODE_ENV=development）使用 fake 模式。
 */
export async function authHook(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const devFake = process.env.NODE_ENV === 'development' && !process.env.CLERK_SECRET_KEY

  if (devFake) {
    req.auth = { userId: FAKE_DEV_USER }
    return
  }

  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'missing_bearer' })
    return
  }
  const token = header.slice('Bearer '.length).trim()

  // 真实 Clerk 校验在 PR2 接入（需要 CLERK_SECRET_KEY）。
  // 此处先做最小校验：非空、三段式 JWT。完整校验见 lib/clerk.ts（后续 PR）。
  const parts = token.split('.')
  if (parts.length !== 3) {
    reply.code(401).send({ error: 'invalid_token' })
    return
  }

  // 占位：PR2 替换为 clerk.verifySession({ getSessionClaims })
  // 暂时用 token payload 的 sub 作为 userId（仅结构校验，不验签——生产前必须接真校验）
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    const userId = payload['sub'] as string | undefined
    if (!userId) {
      reply.code(401).send({ error: 'no_subject' })
      return
    }
    req.auth = { userId }
  } catch {
    reply.code(401).send({ error: 'malformed_token' })
  }
}

/** 路由级守卫：要求已登录，否则 401。 */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!req.auth?.userId) {
    reply.code(401).send({ error: 'unauthorized' })
  }
}

/** 取已登录用户 id；未登录抛错（路由层应先挂 requireAuth）。 */
export function getUserId(req: FastifyRequest): string {
  const uid = req.auth?.userId
  if (!uid) throw new Error('route missing requireAuth guard')
  return uid
}
