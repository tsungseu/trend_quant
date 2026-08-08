// KB 路由：文档上传（解析→切块→embed→入库）、列表、删除。
//
// 安全约束（最高优先级）：
// - 每个路由都先过 requireAuth，再用 getUserId 做 tenant 过滤。
// - Qdrant 操作走 lib/qdrant，集合名按 userId 派生，跨用户读写不可能。

import type { FastifyInstance } from 'fastify'
import { requireAuth, getUserId } from '../lib/auth.js'
import { createDocument, getDocument, listDocuments, updateDocument, deleteDocument } from '../lib/documents.js'
import { upsertPoints, deleteByDocId, type UpsertPoint } from '../lib/qdrant.js'
import { embed } from '../lib/embeddings.js'
import { chunkText } from '../lib/chunk.js'
import { parseText } from '../lib/parse/text.js'
import { parsePdf } from '../lib/parse/pdf.js'

const MAX_BYTES = 25 * 1024 * 1024 // 25MB

export async function kbRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', requireAuth)

  // 列表：只返回当前用户的文档
  app.get('/kb/documents', async (req) => {
    const userId = getUserId(req)
    return listDocuments(userId)
  })

  // 上传：multipart，单文件
  app.post('/kb/documents', async (req, reply) => {
    const userId = getUserId(req)
    const file = await req.file()
    if (!file) {
      reply.code(400)
      return { error: 'no_file' }
    }

    const buf = await file.toBuffer()
    if (buf.byteLength > MAX_BYTES) {
      reply.code(413)
      return { error: 'file_too_large', maxBytes: MAX_BYTES }
    }

    const doc = createDocument(userId, {
      filename: file.filename || 'untitled',
      contentType: file.mimetype || 'application/octet-stream',
      sizeBytes: buf.byteLength,
    })

    // 解析 → 切块 → embed → 入库。失败标记 failed，不抛到客户端 500。
    try {
      updateDocument(userId, doc.id, { status: 'parsing' })
      const parsed = await routeParse(file.mimetype || '', buf)
      if (!parsed.text) {
        updateDocument(userId, doc.id, { status: 'failed', error: 'empty_text', lowConfidence: parsed.lowConfidence })
        reply.code(422)
        return { error: 'empty_text', document: getDocument(userId, doc.id) }
      }

      const chunks = chunkText(parsed.text)
      updateDocument(userId, doc.id, { status: 'embedding' })

      const vectors = await embed(chunks.map((c) => c.text))
      const points: UpsertPoint[] = chunks.map((c, i) => ({
        id: `${doc.id}_${i}`,
        vector: vectors[i],
        payload: { docId: doc.id, chunkIdx: c.chunkIdx, text: c.text },
      }))
      await upsertPoints(userId, points)

      const done = updateDocument(userId, doc.id, { status: 'indexed', chunkCount: chunks.length, lowConfidence: parsed.lowConfidence })
      return { document: done }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown'
      const failed = updateDocument(userId, doc.id, { status: 'failed', error: message.slice(0, 300) })
      reply.code(502)
      return { error: 'ingest_failed', document: failed }
    }
  })

  // 删除：级联删除向量，严格 tenant 过滤
  app.delete('/kb/documents/:id', async (req, reply) => {
    const userId = getUserId(req)
    const { id } = req.params as { id: string }
    const doc = getDocument(userId, id)
    if (!doc) {
      reply.code(404)
      return { error: 'not_found' }
    }
    // 双重保险：即便 doc.userId 被篡改，也只删自己集合里的向量
    if (doc.userId !== userId) {
      reply.code(403)
      return { error: 'forbidden' }
    }
    await deleteByDocId(userId, id)
    deleteDocument(userId, id)
    reply.code(204)
    return null
  })
}

async function routeParse(mimetype: string, buf: Buffer) {
  if (mimetype === 'application/pdf' || mimetype.endsWith('/pdf')) return parsePdf(buf)
  if (mimetype.startsWith('text/')) return parseText(buf)
  // 非文本/PDF：PR3 接入图片 OCR / 网页抽取
  throw new Error(`unsupported_content_type: ${mimetype}`)
}
