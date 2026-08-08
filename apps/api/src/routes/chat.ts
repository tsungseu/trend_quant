// RAG 对话路由：检索 → 拼 prompt → 流式回答（SSE）。
//
// 流程：
// 1. embed 问题，在用户集合 top-k 检索。
// 2. 把命中片段拼进 system prompt（带免责声明）。
// 3. 调 LLM 流式，逐 delta 发 SSE 事件；先发 citations，再发 delta，最后 done。
// 4. 无命中时，仍走回答（不强行断），但 system 提示"未在知识库找到强相关内容"。

import type { FastifyInstance } from 'fastify'
import { requireAuth, getUserId } from '../lib/auth.js'
import { embed } from '../lib/embeddings.js'
import { search } from '../lib/qdrant.js'
import { streamChat, LlmError } from '../lib/llm.js'
import type { ChatStreamEvent, SearchHit } from '@trendquant/rag-client/types'

const TOP_K = 6
const CONTEXT_CHARS = 1200 // 每片段裁剪上限，防止 token 爆炸

const SYSTEM_BASE =
  '你是 TrendQuant 的 AI 投研助手。只做量化研究与价格提醒，输出以中文为主的结构化 Markdown。' +
  '所有结论必须声明"不构成投资建议"。'

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', requireAuth)

  app.post('/chat', async (req, reply) => {
    const userId = getUserId(req)
    const { question, history } = req.body as {
      question?: string
      history?: { role: 'user' | 'assistant'; content: string }[]
    }
    if (!question || typeof question !== 'string' || !question.trim()) {
      reply.code(400)
      return { error: 'missing_question' }
    }

    // 用户在请求头里传 LLM 配置（与前端"自带密钥"一致，密钥只本次请求内存活）
    const llmBaseUrl = req.headers['x-llm-base-url'] as string | undefined
    const llmApiKey = req.headers['x-llm-api-key'] as string | undefined
    const llmModel = req.headers['x-llm-model'] as string | undefined

    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no', // nginx 透传
    })

    const send = (e: ChatStreamEvent) => {
      reply.raw.write(`data: ${JSON.stringify(e)}\n\n`)
    }

    try {
      // 1. 检索
      const [vec] = await embed([question.slice(0, 8000)])
      const results = await search(userId, vec, TOP_K)
      const hits: SearchHit[] = results.map((r) => ({
        docId: String(r.payload.docId ?? ''),
        chunkIdx: Number(r.payload.chunkIdx ?? 0),
        text: String(r.payload.text ?? ''),
        score: r.score,
      }))

      // 2. 先发引用（前端可在回答前先展示来源）
      if (hits.length > 0) send({ type: 'citations', hits })

      // 3. 拼 prompt
      const ctxBlock =
        hits.length === 0
          ? '（未在用户知识库中找到强相关内容，请基于通用知识谨慎回答，并提示用户。）'
          : hits
              .map((h, i) => `[${i + 1}] ${h.text.slice(0, CONTEXT_CHARS)}`)
              .join('\n\n')
      const systemPrompt =
        `${SYSTEM_BASE}\n\n` +
        `以下是来自用户知识库的参考资料（可能相关也可能不相关，请自行判断）：\n${ctxBlock}\n\n` +
        `回答时若用到参考资料，在句末用 [1] [2] 形式标注来源序号。`

      const messages = [...(history ?? []).slice(-10), { role: 'user' as const, content: question }]

      // 4. 流式回答
      await streamChat({
        baseUrl: llmBaseUrl,
        apiKey: llmApiKey,
        model: llmModel,
        systemPrompt,
        messages,
        signal: req.raw.socket.destroyed ? undefined : undefined,
        onDelta: (t) => send({ type: 'delta', text: t }),
      })
      send({ type: 'done' })
    } catch (err) {
      const message = err instanceof LlmError || err instanceof Error ? err.message : 'unknown'
      send({ type: 'error', message: message.slice(0, 200) })
    } finally {
      reply.raw.end()
    }
    return reply
  })
}
