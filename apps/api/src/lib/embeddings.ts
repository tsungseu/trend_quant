// OpenAI text-embedding-3-small 封装：仅后端调用，密钥不入前端。
//
// 批量友好：OpenAI 单次最多 2048 输入；这里按 100 一批，
// 失败时按指数退避重试 2 次。

import { config } from '../config.js'

const MODEL = 'text-embedding-3-small'
export const EMBED_DIM = 1536
const BATCH = 100

export class EmbeddingsError extends Error {}

interface OpenAiEmbeddingResponse {
  data: { embedding: number[]; index: number }[]
  usage?: { prompt_tokens: number; total_tokens: number }
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  if (!config.openaiApiKey) {
    throw new EmbeddingsError('OPENAI_API_KEY 未配置：后端无法生成 embedding')
  }

  const out: number[][] = new Array(texts.length)
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH)
    const res = await embedOnce(slice)
    // OpenAI 返回顺序可能与输入不同（带 index），按 index 回填
    for (const d of res.data) {
      out[i + d.index] = d.embedding
    }
  }
  return out
}

async function embedOnce(inputs: string[], attempt = 0): Promise<OpenAiEmbeddingResponse> {
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({ model: MODEL, input: inputs }),
    })
    if (!res.ok) {
      const detail = await safeText(res)
      throw new EmbeddingsError(`openai embeddings ${res.status}: ${detail.slice(0, 200)}`)
    }
    return (await res.json()) as OpenAiEmbeddingResponse
  } catch (err) {
    if (attempt >= 2 || err instanceof EmbeddingsError) throw err
    const delay = 500 * Math.pow(2, attempt)
    await sleep(delay)
    return embedOnce(inputs, attempt + 1)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}
