// 类型化前端客户端：apps/terminal 与 apps/admin 共用。
//
// 设计要点：
// - 所有方法都要求传入 Clerk session token；调用方负责从 Clerk 取最新 token。
// - 不内置重试/退避；调用方按场景自行处理。
// - chatStream 是 SSE 消费器，逐事件回调 onEvent。

import type {
  ChatStreamEvent,
  KbDocument,
  QueryResponse,
  SearchHit,
  UploadResponse,
} from './types.js'

export interface RagClientOptions {
  /** 后端基址，如 https://trendquant-api.fly.dev */
  baseUrl: string
  /** Clerk getSessionToken() 得到的 JWT；每次调用前刷新 */
  getToken: () => Promise<string>
  /** 可选自定义 fetch（测试注入） */
  fetchImpl?: typeof fetch
}

export class RagClient {
  private baseUrl: string
  private getToken: () => Promise<string>
  private fetchImpl: typeof fetch

  constructor(opts: RagClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '')
    this.getToken = opts.getToken
    this.fetchImpl = opts.fetchImpl ?? fetch
  }

  private async authedHeaders(extra: Record<string, string> = {}): Promise<HeadersInit> {
    const token = await this.getToken()
    return {
      authorization: `Bearer ${token}`,
      ...extra,
    }
  }

  /** 健康探测（无需鉴权） */
  async health(): Promise<{ status: string; service: string }> {
    const res = await this.fetchImpl(`${this.baseUrl}/health`)
    if (!res.ok) throw new Error(`health ${res.status}`)
    return res.json()
  }

  /** 上传文档（multipart）。返回排队后的文档元信息。 */
  async uploadDocument(file: File | Blob, filename: string, contentType: string): Promise<KbDocument> {
    const form = new FormData()
    form.append('file', file, filename)
    const res = await this.fetchImpl(`${this.baseUrl}/kb/documents`, {
      method: 'POST',
      headers: await this.authedHeaders(),
      body: form,
    })
    if (!res.ok) throw new Error(`upload ${res.status}: ${await safeText(res)}`)
    const data = (await res.json()) as UploadResponse
    return data.document
  }

  /** 列出当前用户的文档。 */
  async listDocuments(): Promise<KbDocument[]> {
    const res = await this.fetchImpl(`${this.baseUrl}/kb/documents`, {
      headers: await this.authedHeaders(),
    })
    if (!res.ok) throw new Error(`list ${res.status}`)
    return res.json()
  }

  /** 删除文档（连带其向量，后端负责级联）。 */
  async deleteDocument(id: string): Promise<void> {
    const res = await this.fetchImpl(`${this.baseUrl}/kb/documents/${id}`, {
      method: 'DELETE',
      headers: await this.authedHeaders(),
    })
    if (!res.ok) throw new Error(`delete ${res.status}`)
  }

  /** 原始向量检索（调试/管理用）。 */
  async query(text: string, topK = 6): Promise<SearchHit[]> {
    const res = await this.fetchImpl(`${this.baseUrl}/kb/query`, {
      method: 'POST',
      headers: await this.authedHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify({ text, topK }),
    })
    if (!res.ok) throw new Error(`query ${res.status}`)
    const data = (await res.json()) as QueryResponse
    return data.hits
  }

  /**
   * RAG 对话流。逐事件回调；AbortSignal 可中断。
   * 后端先发 citations（命中的片段），再连续发 delta，最后 done。
   */
  async chatStream(
    question: string,
    onEvent: (e: ChatStreamEvent) => void,
    opts: { signal?: AbortSignal; history?: { role: 'user' | 'assistant'; content: string }[] } = {},
  ): Promise<void> {
    const res = await this.fetchImpl(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: await this.authedHeaders({ 'content-type': 'application/json', accept: 'text/event-stream' }),
      body: JSON.stringify({ question, history: opts.history ?? [] }),
      signal: opts.signal,
    })
    if (!res.ok || !res.body) throw new Error(`chat ${res.status}`)

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
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          onEvent(JSON.parse(payload) as ChatStreamEvent)
        } catch {
          // 忽略单行解析错误，保持流不中断
        }
      }
    }
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

export type { ChatStreamEvent, KbDocument, QueryResponse, SearchHit, UploadResponse } from './types.js'
