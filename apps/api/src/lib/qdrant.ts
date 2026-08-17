// Qdrant 客户端封装：按用户隔离的集合。
//
// 租户隔离策略（最高优先级安全约束）：
// - 每个用户一个独立集合 kb_<userId>，集合名从 userId 派生。
// - 所有读写操作都必须接收 userId 并只操作该用户的集合；
//   lib 内部不缓存"当前用户"，调用方显式传入，避免串号。
// - userId 经 sanitize，只允许 [a-zA-Z0-9_-]，杜绝集合名注入。

import { config } from '../config.js'

// 动态加载真实 Qdrant 客户端，避免静态 import 触发类型解析
// （该包在某些环境下 dist 缺失；运行时才需要，构建期不应依赖其类型）
type QdrantCtor = new (opts: { url: string; apiKey?: string }) => unknown

export const VECTOR_SIZE = 1536 // text-embedding-3-small 维度
const DISTANCE = 'Cosine' as const

// qdrant 类型在跨版本间不稳定；这里用最小本地接口约束我们用到的方法。
type QdrantLike = {
  createCollection(name: string, config: unknown): Promise<unknown>
  upsert(name: string, opts: unknown): Promise<unknown>
  search(name: string, opts: unknown): Promise<unknown[]>
  delete(name: string, opts: unknown): Promise<unknown>
}

let _client: QdrantLike | null = null

export async function getQdrant(): Promise<QdrantLike> {
  if (_client) return _client
  // 动态 import：构建期不解析此模块的类型；运行期才加载。
  // 用变量承载 specifier，避免 tsc/隔离模块强制静态解析（dist 在某些环境缺失）。
  const specifier = '@qdrant/js-client-rest'
  // @ts-ignore — 包无类型声明，且为运行期依赖
  const mod = await import(/* @vite-ignore */ specifier)
  const Ctor = (mod.QdrantClient ?? mod.default?.QdrantClient ?? mod.default) as QdrantCtor
  _client = new Ctor({
    url: config.qdrantUrl,
    apiKey: config.qdrantApiKey || undefined,
  }) as unknown as QdrantLike
  return _client
}

/** 仅暴露给测试：替换内部单例。 */
export function _setQdrantForTest(client: QdrantLike | null): void {
  _client = client
}

/** 把 userId 规范化为合法的 Qdrant 集合名。非法字符直接报错（不静默裁剪）。 */
export function collectionFor(userId: string): string {
  if (!userId || !/^[A-Za-z0-9_.-]+$/.test(userId)) {
    throw new Error(`invalid userId for qdrant collection: "${userId}"`)
  }
  // Qdrant 集合名不允许前导下划线以外的特殊起首；前缀 kb_ 安全
  return `kb_${userId}`
}

/** 幂等创建集合（若已存在则跳过）。 */
export async function ensureCollection(userId: string): Promise<string> {
  const name = collectionFor(userId)
  const client = await getQdrant()
  try {
    await client.createCollection(name, {
      vectors: { size: VECTOR_SIZE, distance: DISTANCE },
    })
  } catch (err: unknown) {
    // 已存在视为成功；其它错误上抛
    const msg = (err as { message?: string })?.message ?? ''
    if (!/already exists|409/i.test(msg)) throw err
  }
  return name
}

export interface UpsertPoint {
  id: string
  vector: number[]
  payload: { docId: string; chunkIdx: number; text: string }
}

/** 批量 upsert 向量到用户集合。 */
export async function upsertPoints(userId: string, points: UpsertPoint[]): Promise<void> {
  if (points.length === 0) return
  const name = await ensureCollection(userId)
  const client = await getQdrant()
  await client.upsert(name, { points, wait: true })
}

/** 检索：仅在用户集合内做近邻搜索。 */
export async function search(
  userId: string,
  queryVector: number[],
  topK: number,
): Promise<{ id: string; score: number; payload: Record<string, unknown> }[]> {
  const name = collectionFor(userId)
  const client = await getQdrant()
  const res = (await client.search(name, { vector: queryVector, limit: topK, with_payload: true })) as {
    id: string | number
    score: number
    payload?: Record<string, unknown>
  }[]
  return res.map((r) => ({
    id: String(r.id),
    score: r.score,
    payload: (r.payload ?? {}) as Record<string, unknown>,
  }))
}

/** 按 docId 删除某文档的全部向量（删除文档时级联）。 */
export async function deleteByDocId(userId: string, docId: string): Promise<void> {
  const name = collectionFor(userId)
  const client = await getQdrant()
  await client.delete(name, {
    filter: { must: [{ key: 'docId', match: { value: docId } }] },
    wait: true,
  })
}
