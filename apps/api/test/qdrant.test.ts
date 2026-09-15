import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  collectionFor,
  ensureCollection,
  upsertPoints,
  search,
  deleteByDocId,
  _setQdrantForTest,
} from '../src/lib/qdrant.js'

// 注入假 Qdrant 客户端，验证：
// 1) 集合名严格按 userId 派生
// 2) 所有操作只触及调用方传入的 userId 对应集合，绝不串号

interface Call {
  method: string
  collection: string
  args?: unknown
}

function makeFakeClient() {
  const calls: Call[] = []
  const collections = new Set<string>()
  const points = new Map<string, { id: string; vector: number[]; payload: Record<string, unknown> }[]>()
  return {
    calls,
    client: {
      async createCollection(collection: string, _opts: unknown) {
        calls.push({ method: 'createCollection', collection })
        if (collections.has(collection)) {
          const err = new Error('collection already exists')
          throw err
        }
        collections.add(collection)
        points.set(collection, [])
      },
      async upsert(collection: string, opts: { points: unknown[] }) {
        calls.push({ method: 'upsert', collection, args: opts })
        const arr = points.get(collection) ?? []
        for (const p of opts.points as { id: string; vector: number[]; payload: Record<string, unknown> }[]) {
          arr.push(p)
        }
        points.set(collection, arr)
      },
      async search(collection: string, opts: { vector: number[]; limit: number }) {
        calls.push({ method: 'search', collection, args: opts })
        const arr = points.get(collection) ?? []
        return arr.slice(0, opts.limit).map((p) => ({ id: p.id, score: 0.9, payload: p.payload }))
      },
      async delete(collection: string, opts: { filter: { must: { key: string; match: { value: string } }[] } }) {
        calls.push({ method: 'delete', collection, args: opts })
        const arr = points.get(collection) ?? []
        const docId = opts.filter.must.find((m) => m.key === 'docId')?.match.value
        points.set(
          collection,
          arr.filter((p) => p.payload.docId !== docId),
        )
      },
    },
  }
}

describe('collectionFor', () => {
  it('prefixes with kb_', () => {
    expect(collectionFor('user_abc')).toBe('kb_user_abc')
    expect(collectionFor('user123')).toBe('kb_user123')
  })
  it('rejects invalid userId to prevent collection-name injection', () => {
    expect(() => collectionFor('user; rm -rf')).toThrow()
    expect(() => collectionFor('user/../other')).toThrow()
    expect(() => collectionFor('')).toThrow()
    expect(() => collectionFor('user with space')).toThrow()
  })
})

describe('qdrant tenant isolation (fake client)', () => {
  let fake: ReturnType<typeof makeFakeClient>
  beforeEach(() => {
    fake = makeFakeClient()
    _setQdrantForTest(fake.client as never)
  })

  it('upsert for userA only touches kb_userA collection', async () => {
    await upsertPoints('userA', [
      { id: 'd1_0', vector: [1, 2, 3], payload: { docId: 'd1', chunkIdx: 0, text: 'a' } },
    ])
    expect(fake.calls.every((c) => c.collection === 'kb_userA')).toBe(true)
    expect(fake.calls.some((c) => c.method === 'upsert')).toBe(true)
  })

  it('search for userB never reads userA collection', async () => {
    await upsertPoints('userA', [
      { id: 'd1_0', vector: [1, 2, 3], payload: { docId: 'd1', chunkIdx: 0, text: 'secret of A' } },
    ])
    fake.calls.length = 0
    await search('userB', [1, 2, 3], 5)
    expect(fake.calls.every((c) => c.collection === 'kb_userB')).toBe(true)
    expect(fake.calls.some((c) => c.collection === 'kb_userA')).toBe(false)
  })

  it('deleteByDocId filters within the caller collection only', async () => {
    await upsertPoints('userA', [
      { id: 'd1_0', vector: [1], payload: { docId: 'd1', chunkIdx: 0, text: 'x' } },
    ])
    await upsertPoints('userB', [
      { id: 'd1_0', vector: [1], payload: { docId: 'd1', chunkIdx: 0, text: 'x' } },
    ])
    fake.calls.length = 0
    await deleteByDocId('userA', 'd1')
    // 只删 kb_userA，不碰 kb_userB
    expect(fake.calls.some((c) => c.method === 'delete' && c.collection === 'kb_userA')).toBe(true)
    expect(fake.calls.some((c) => c.collection === 'kb_userB')).toBe(false)
  })

  it('ensureCollection is idempotent on second call for same user', async () => {
    await ensureCollection('userA')
    await expect(ensureCollection('userA')).resolves.toBe('kb_userA')
  })
})
