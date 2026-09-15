import { describe, it, expect, beforeEach } from 'vitest'
import {
  createDocument,
  getDocument,
  listDocuments,
  updateDocument,
  deleteDocument,
  _resetForTest,
} from '../src/lib/documents.js'

beforeEach(_resetForTest)

describe('documents registry tenant isolation', () => {
  // 最高优先级安全测试：用户 A 的文档对用户 B 完全不可见，
  // 用户 B 既不能读、不能改、也不能删 A 的文档。
  it('user A document is invisible to user B via get/list/update/delete', () => {
    const a = createDocument('userA', { filename: 'a.pdf', contentType: 'application/pdf', sizeBytes: 10 })
    createDocument('userB', { filename: 'b.txt', contentType: 'text/plain', sizeBytes: 5 })

    // get：B 取不到 A 的文档
    expect(getDocument('userB', a.id)).toBeNull()
    expect(getDocument('userA', a.id)?.id).toBe(a.id)

    // list：各自只看到自己的
    expect(listDocuments('userA').map((d) => d.id)).toEqual([a.id])
    expect(listDocuments('userB').some((d) => d.id === a.id)).toBe(false)

    // update：B 改不动 A 的文档（返回 null，且不影响原值）
    const patched = updateDocument('userB', a.id, { status: 'failed' })
    expect(patched).toBeNull()
    expect(getDocument('userA', a.id)?.status).toBe('pending')

    // delete：B 删不掉 A 的文档
    expect(deleteDocument('userB', a.id)).toBe(false)
    expect(getDocument('userA', a.id)).not.toBeNull()
  })

  it('createDocument stamps userId from the caller, never from input', () => {
    const doc = createDocument('userA', { filename: 'x', contentType: 'text/plain', sizeBytes: 1 })
    expect(doc.userId).toBe('userA')
    expect(doc.status).toBe('pending')
    expect(doc.id).toMatch(/^doc_/)
  })

  it('updateDocument preserves id and userId (no hijack via patch)', () => {
    const doc = createDocument('userA', { filename: 'x', contentType: 'text/plain', sizeBytes: 1 })
    // 攻击者尝试通过 patch 改 userId
    const patched = updateDocument('userA', doc.id, { userId: 'userB' } as never)
    expect(patched?.userId).toBe('userA') // 被忽略
    expect(patched?.id).toBe(doc.id)
  })
})
