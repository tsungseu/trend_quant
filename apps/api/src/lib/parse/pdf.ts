// PDF 解析：优先用文本层（pdf-parse），失败或为空时回退 OCR（PR3 接入 tesseract）。
//
// pdf-parse 在 PR2 阶段为可选依赖：若未安装则抛清晰错误，由路由层转为 failed 状态。
// 这样本地骨架测试无需安装重依赖即可跑通。

import type { ParseResult } from './text.js'

let pdfParseLazy: ((buf: Buffer) => Promise<{ text: string }>) | null = null
let pdfParseLoadErr: unknown = null

async function loadPdfParse(): Promise<(buf: Buffer) => Promise<{ text: string }>> {
  if (pdfParseLazy) return pdfParseLazy
  if (pdfParseLoadErr) throw pdfParseLoadErr
  try {
    // 动态 import，避免未安装时整个 api 构建失败；该依赖可选，无类型声明
    // @ts-expect-error pdf-parse 无类型声明且为可选依赖
    const mod = await import('pdf-parse')
    pdfParseLazy = (mod.default ?? mod) as (buf: Buffer) => Promise<{ text: string }>
    return pdfParseLazy
  } catch (err) {
    pdfParseLoadErr = err
    throw new Error('pdf-parse 未安装：PDF 解析不可用（PR3 将接入 OCR 回退）')
  }
}

export async function parsePdf(buf: Buffer): Promise<ParseResult> {
  const fn = await loadPdfParse()
  const { text } = await fn(buf)
  const trimmed = (text || '').trim()
  // 文本层为空 → 可能是扫描件；PR3 用 OCR 兜底，此处先标记
  if (!trimmed) {
    return { text: '', lowConfidence: true }
  }
  return { text: trimmed }
}
