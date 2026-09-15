// 递归文本切块：按段落 → 句子 → 字符逐级降级，保证块不超过目标 token 估算。
//
// token 估算用粗略的 chars/4（英文）与 chars/1.5（含中文）启发；
// 精确分词留待真正接入 tokenizer，此处对召回质量影响有限。

const DEFAULT_TARGET = 512
const DEFAULT_OVERLAP = 64

export interface ChunkOptions {
  targetTokens?: number
  overlapTokens?: number
}

export interface Chunk {
  text: string
  chunkIdx: number
}

/** 估算 token 数：含 CJK 时按 1.5 char/token，否则 4 char/token。 */
export function estimateTokens(text: string): number {
  const cjk = (text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length
  if (cjk > text.length * 0.2) return Math.ceil(text.length / 1.5)
  return Math.ceil(text.length / 4)
}

export function chunkText(text: string, opts: ChunkOptions = {}): Chunk[] {
  const target = opts.targetTokens ?? DEFAULT_TARGET
  const overlap = opts.overlapTokens ?? DEFAULT_OVERLAP
  const cleaned = text.replace(/\r\n/g, '\n').trim()
  if (!cleaned) return []

  const targetChars = target * 3 // token→char 的中间估算，由 estimateTokens 兜底
  const overlapChars = overlap * 3
  const blocks = splitRecursive(cleaned, ['\n\n', '\n', '。', '. ', ' '], targetChars)

  const chunks: Chunk[] = []
  let idx = 0
  let prevTail = ''
  for (const b of blocks) {
    const piece = (prevTail + b).trim()
    if (!piece) continue
    // 若单块仍超 2× 目标，硬切（极端长段落兜底）
    const hard = hardSplitIfTooLong(piece, targetChars * 2, targetChars)
    for (const h of hard) {
      chunks.push({ text: h, chunkIdx: idx++ })
    }
    prevTail = piece.slice(-overlapChars)
  }
  return chunks
}

function splitRecursive(text: string, seps: string[], limit: number): string[] {
  if (text.length <= limit) return [text]
  const [sep, ...rest] = seps
  if (!sep) return chunkByCount(text, limit)
  const parts = text.split(sep)
  const out: string[] = []
  let buf = ''
  for (const p of parts) {
    const candidate = buf ? buf + sep + p : p
    if (candidate.length > limit && buf) {
      out.push(buf)
      buf = p
    } else {
      buf = candidate
    }
    // 单块本身超限，递归用更细的分隔符
    if (p.length > limit) {
      out.push(...splitRecursive(p, rest, limit))
      buf = ''
    }
  }
  if (buf) out.push(buf)
  return out.filter(Boolean)
}

function chunkByCount(text: string, limit: number): string[] {
  const out: string[] = []
  for (let i = 0; i < text.length; i += limit) {
    out.push(text.slice(i, i + limit))
  }
  return out
}

function hardSplitIfTooLong(piece: string, threshold: number, target: number): string[] {
  if (piece.length <= threshold) return [piece]
  const out: string[] = []
  for (let i = 0; i < piece.length; i += target) {
    out.push(piece.slice(i, i + target))
  }
  return out
}
