// 文档元信息注册表：当前为进程内 Map（PR2 阶段不引入数据库依赖）。
//
// 取舍说明：内存存储意味着服务重启后文档列表丢失（向量仍在 Qdrant）。
// 这在 Phase 3 v1 单实例阶段可接受；多实例/持久化在后续 PR 用 Postgres 替换，
// 替换点收敛在本模块的四个函数，调用方无感。

import type { KbDocument } from '@trendquant/rag-client/types'

type Doc = KbDocument

const store = new Map<string, Doc>() // key: `${userId}:${docId}`

function key(userId: string, docId: string): string {
  return `${userId}:${docId}`
}

function genId(): string {
  return 'doc_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function createDocument(userId: string, init: Pick<Doc, 'filename' | 'contentType' | 'sizeBytes'>): Doc {
  const now = new Date().toISOString()
  const doc: Doc = {
    id: genId(),
    userId,
    filename: init.filename,
    contentType: init.contentType,
    sizeBytes: init.sizeBytes,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }
  store.set(key(userId, doc.id), doc)
  return doc
}

export function getDocument(userId: string, docId: string): Doc | null {
  return store.get(key(userId, docId)) ?? null
}

export function listDocuments(userId: string): Doc[] {
  const out: Doc[] = []
  for (const [k, v] of store) {
    if (k.startsWith(userId + ':')) out.push(v)
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function updateDocument(userId: string, docId: string, patch: Partial<Doc>): Doc | null {
  const existing = store.get(key(userId, docId))
  if (!existing) return null
  const updated: Doc = { ...existing, ...patch, id: existing.id, userId: existing.userId, updatedAt: new Date().toISOString() }
  store.set(key(userId, docId), updated)
  return updated
}

export function deleteDocument(userId: string, docId: string): boolean {
  return store.delete(key(userId, docId))
}

/** 仅测试用：清空注册表。 */
export function _resetForTest(): void {
  store.clear()
}
