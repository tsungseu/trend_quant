// 检索路由：把问题向量化，在用户集合内 top-k 搜索，返回带 docId 的命中片段。
// 不调 LLM；供调试、管理台预览、以及 chat 路由内部复用。

import type { FastifyInstance } from 'fastify'
import { requireAuth, getUserId } from '../lib/auth.js'
import { embed } from '../lib/embeddings.js'
import { search } from '../lib/qdrant.js'
import type { SearchHit } from '@trendquant/rag-client/types'

const DEFAULT_TOP_K = 6
const MAX_TOP_K = 32

export async function queryRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', requireAuth)

  app.post('/kb/query', async (req, reply) => {
    const userId = getUserId(req)
    const { text, topK } = req.body as { text?: string; topK?: number }
    if (!text || typeof text !== 'string' || !text.trim()) {
      reply.code(400)
      return { error: 'missing_text' }
    }
    const k = Math.min(Math.max(topK ?? DEFAULT_TOP_K, 1), MAX_TOP_K)

    const [vec] = await embed([text.slice(0, 8000)])
    const results = await search(userId, vec, k)

    const hits: SearchHit[] = results.map((r) => ({
      docId: String(r.payload.docId ?? ''),
      chunkIdx: Number(r.payload.chunkIdx ?? 0),
      text: String(r.payload.text ?? ''),
      score: r.score,
    }))
    return { hits }
  })
}
