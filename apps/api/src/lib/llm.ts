// LLM 调用：复用用户在 settings 配置的 OpenAI 兼容端点，或退到 OpenAI 官方。
//
// 设计：
// - 后端不持有模型密钥；RAG 场景的 chat 走用户在请求头里传的 X-LLM-* 配置，
//   与前端"自带密钥"模型一致，密钥只在本次请求内存活，不入日志、不落库。
// - 流式：调用方传 onDelta(text)，逐 token 回吐。
// - 失败：抛错，由路由层决定如何回退（如关闭 KB 直接走前端原链路）。

import { config } from '../config.js'

export interface LlmCallOpts {
  /** 用户自配的 base url（OpenAI 兼容）。缺省走 OpenAI 官方。 */
  baseUrl?: string
  apiKey?: string
  model?: string
  systemPrompt: string
  /** 已组装好的 messages（不含 system） */
  messages: { role: 'user' | 'assistant'; content: string }[]
  signal?: AbortSignal
  onDelta: (text: string) => void
}

export class LlmError extends Error {}

export async function streamChat(opts: LlmCallOpts): Promise<void> {
  const base = (opts.baseUrl || 'https://api.openai.com').replace(/\/+$/, '')
  const key = opts.apiKey || config.openaiApiKey
  const model = opts.model || 'gpt-4o-mini'
  if (!key) throw new LlmError('no_llm_key：未提供 LLM 密钥')

  const res = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: 'system', content: opts.systemPrompt }, ...opts.messages],
    }),
    signal: opts.signal,
  })

  if (!res.ok || !res.body) {
    const detail = await safeText(res)
    throw new LlmError(`llm_${res.status}: ${detail.slice(0, 200)}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).replace(/\r$/, '')
      buffer = buffer.slice(idx + 1)
      const text = parseOpenAiLine(line)
      if (text) opts.onDelta(text)
    }
  }
}

function parseOpenAiLine(line: string): string | null {
  if (!line.startsWith('data:')) return null
  const data = line.slice(5).trim()
  if (!data || data === '[DONE]') return null
  try {
    const json = JSON.parse(data)
    const delta = json.choices?.[0]?.delta?.content
    return delta != null ? String(delta) : null
  } catch {
    return null
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}
