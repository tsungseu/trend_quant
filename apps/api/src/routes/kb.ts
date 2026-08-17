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
      updateDocument(userId, doc.id, { status: 'embedding' })
      const done = await ingestText(userId, doc.id, parsed.text, parsed.lowConfidence)
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

  // 网页 URL 投递：抓取并抽取正文后走同一套 ingest 流水线
  app.post('/kb/web', async (req, reply) => {
    const userId = getUserId(req)
    const { url } = req.body as { url?: string }
    if (!url || typeof url !== 'string') {
      reply.code(400)
      return { error: 'missing_url' }
    }
    const doc = createDocument(userId, {
      filename: url,
      contentType: 'text/html',
      sizeBytes: 0,
    })
    try {
      updateDocument(userId, doc.id, { status: 'parsing' })
      const { parseWebUrl } = await import('../lib/parse/web.js')
      const parsed = await parseWebUrl(url)
      if (!parsed.text) {
        updateDocument(userId, doc.id, { status: 'failed', error: 'empty_text', lowConfidence: parsed.lowConfidence })
        reply.code(422)
        return { error: 'empty_text', document: getDocument(userId, doc.id) }
      }
      const result = await ingestText(userId, doc.id, parsed.text, parsed.lowConfidence)
      return { document: result }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown'
      const failed = updateDocument(userId, doc.id, { status: 'failed', error: message.slice(0, 300) })
      reply.code(502)
      return { error: 'ingest_failed', document: failed }
    }
  })
}

// 共享：已解析文本 → 切块 → embed → 入库
async function ingestText(userId: string, docId: string, text: string, lowConfidence?: boolean) {
  const chunks = chunkText(text)
  const vectors = await embed(chunks.map((c) => c.text))
  const points: UpsertPoint[] = chunks.map((c, i) => ({
    id: `${docId}_${i}`,
    vector: vectors[i],
    payload: { docId, chunkIdx: c.chunkIdx, text: c.text },
  }))
  await upsertPoints(userId, points)
  return updateDocument(userId, docId, { status: 'indexed', chunkCount: chunks.length, lowConfidence })
}

async function routeParse(mimetype: string, buf: Buffer) {
  if (mimetype === 'application/pdf' || mimetype.endsWith('/pdf')) {
    const { parsePdf } = await import('../lib/parse/pdf.js')
    return parsePdf(buf)
  }
  if (mimetype.startsWith('text/')) {
    const { parseText } = await import('../lib/parse/text.js')
    return parseText(buf)
  }
  if (mimetype.startsWith('image/')) {
    const { parseImage } = await import('../lib/parse/image.js')
    return parseImage(buf, mimetype)
  }
  throw new Error(`unsupported_content_type: ${mimetype}`)
}
