import { describe, it, expect, vi } from 'vitest'
import { RagClient } from './index.js'

// 用注入的假 fetch 验证客户端行为，不连真实后端。

function makeFetch(handlers: Record<string, (url: string, init?: RequestInit) => { status: number; body: unknown }>) {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = typeof url === 'string' ? url : url.toString()
    const key = Object.keys(handlers).find((k) => u.includes(k))
    if (!key) return new Response('not found', { status: 404 })
    const { status, body } = handlers[key](u, init)
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof fetch
}

describe('RagClient', () => {
  it('health() hits /health without auth header', async () => {
    const fetchImpl = makeFetch({
      '/health': () => ({ status: 200, body: { status: 'ok', service: '@trendquant/api' } }),
    })
    const client = new RagClient({
      baseUrl: 'https://api.example.com',
      getToken: async () => 'tok',
      fetchImpl,
    })
    const r = await client.health()
    expect(r.status).toBe('ok')
    const call = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    const headers = (call[1]?.headers as Record<string, string>) ?? {}
    expect(headers['authorization']).toBeUndefined()
  })

  it('listDocuments() attaches Bearer token', async () => {
    const fetchImpl = makeFetch({
      '/kb/documents': (u, init) => {
        const h = (init?.headers as Record<string, string>) ?? {}
        expect(h['authorization']).toBe('Bearer tok')
        return { status: 200, body: [{ id: 'd1', userId: 'u1', filename: 'a.pdf', contentType: 'application/pdf', sizeBytes: 1, status: 'indexed', createdAt: '', updatedAt: '' }] }
      },
    })
    const client = new RagClient({
      baseUrl: 'https://api.example.com',
      getToken: async () => 'tok',
      fetchImpl,
    })
    const docs = await client.listDocuments()
    expect(docs).toHaveLength(1)
    expect(docs[0].id).toBe('d1')
  })

  it('query() posts JSON with topK', async () => {
    const fetchImpl = makeFetch({
      '/kb/query': (u, init) => {
        const body = JSON.parse(String(init?.body))
        expect(body.text).toBe('hello')
        expect(body.topK).toBe(4)
        return { status: 200, body: { hits: [{ docId: 'd1', chunkIdx: 0, text: 'ctx', score: 0.9 }] } }
      },
    })
    const client = new RagClient({ baseUrl: 'https://api.example.com', getToken: async () => 'tok', fetchImpl })
    const hits = await client.query('hello', 4)
    expect(hits[0].docId).toBe('d1')
  })

  it('uploadDocument() sends multipart with file', async () => {
    const fetchImpl = makeFetch({
      '/kb/documents': (u, init) => {
        const body = init?.body as FormData
        expect(body).toBeInstanceOf(FormData)
        const file = body.get('file') as Blob
        expect(file.size).toBeGreaterThan(0)
        return {
          status: 200,
          body: { document: { id: 'd2', userId: 'u', filename: 't.txt', contentType: 'text/plain', sizeBytes: file.size, status: 'pending', createdAt: '', updatedAt: '' } },
        }
      },
    })
    const client = new RagClient({ baseUrl: 'https://api.example.com', getToken: async () => 'tok', fetchImpl })
    const blob = new Blob(['hello world'], { type: 'text/plain' })
    const doc = await client.uploadDocument(blob, 't.txt', 'text/plain')
    expect(doc.id).toBe('d2')
  })
})
