// 图片 OCR：用 tesseract.js（纯 JS，可下载中文+英文 traineddata）。
//
// 取舍：tesseract 首次运行会从 GitHub 下载语言包（~10MB），离线环境需预置。
// 中文扫描件识别质量有限，结果统一标记 lowConfidence=true，供前端提示。
// tesseract.js 为可选依赖：未安装时抛清晰错误，由路由层转 failed。

import type { ParseResult } from './text.js'

interface TesseractWorker {
  recognize(img: Buffer): Promise<{ data: { text: string; confidence: number } }>
  terminate(): Promise<void>
}

let createWorker: ((langs: string) => Promise<TesseractWorker>) | null = null
let loadErr: unknown = null

async function loadTesseract(): Promise<(langs: string) => Promise<TesseractWorker>> {
  if (createWorker) return createWorker
  if (loadErr) throw loadErr
  try {
    // 动态 import，避免未安装时整个 api 构建失败
    const specifier = 'tesseract.js'
    // @ts-ignore — 运行期依赖，无类型声明参与构建
    const mod = await import(/* @vite-ignore */ specifier)
    createWorker = async (langs: string): Promise<TesseractWorker> => {
      const w = await mod.createWorker(langs, 1, {
        // 抑制大量日志，避免污染服务日志
        logger: () => {},
      })
      return {
        recognize: (img: Buffer) => w.recognize(img),
        terminate: () => w.terminate(),
      }
    }
    return createWorker
  } catch (err) {
    loadErr = err
    throw new Error('tesseract.js 未安装：图片 OCR 不可用')
  }
}

export async function parseImage(buf: Buffer, mime: string): Promise<ParseResult> {
  const factory = await loadTesseract()
  const langs = mime.includes('png') || mime.includes('jpeg') || mime.includes('jpg') ? 'chi_sim+eng' : 'eng'
  const worker = await factory(langs)
  try {
    const { data } = await worker.recognize(buf)
    const text = (data.text || '').trim()
    // 置信度阈值 60：低于此值标记低置信度，前端给出"识别质量有限"提示
    const lowConfidence = data.confidence < 60 || text.length < 8
    return { text, lowConfidence }
  } finally {
    await worker.terminate()
  }
}
