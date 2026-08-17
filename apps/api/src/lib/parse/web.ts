// 网页正文抽取：抓取 URL → 转 DOM → readability 提取主内容。
//
// 安全约束：
// - 只允许 http/https；拒绝 localhost / 内网（SSRF 防护，复用 llm 的同款判定思路）。
// - 设超时 10s，避免被慢站拖死 ingestion。
// - 限制响应体 5MB，防止恶意大页。

import type { ParseResult } from './text.js'

function isPrivate(host: string): boolean {
  const h = host.toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost') || h === '0.0.0.0') return true
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return true
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(h)) return true
  if (/^169\.254\./.test(h)) return true
  if (/^::1$/.test(h) || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true
  return false
}

export async function parseWebUrl(url: string): Promise<ParseResult> {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    throw new Error('invalid_url')
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('unsupported_protocol')
  }
  if (isPrivate(u.hostname)) {
    throw new Error('blocked_private_host')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  let res: Response
  try {
    res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'TrendQuantKB/1.0 (+https://trendquant.example)' },
    })
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) throw new Error(`fetch_${res.status}`)

  // 5MB 上限
  const buf = Buffer.from(await res.arrayBuffer().catch(() => new ArrayBuffer(0)))
  if (buf.byteLength === 0) throw new Error('empty_body')
  if (buf.byteLength > 5 * 1024 * 1024) throw new Error('body_too_large')

  const html = buf.toString('utf-8')
  const text = extractMainText(html, u)
  if (!text.trim()) return { text: '', lowConfidence: true }
  return { text: text.trim() }
}

// 极简 readability：去 script/style/nav，取最长文本块。
// 不引入完整 @mozilla/readability 依赖（需要 jsdom，重），先做启发式；
// 质量不足时后续 PR 替换。
function extractMainText(html: string, _url: URL): string {
  // 去 script/style/注释
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
  // 块级标签转换行
  const withBreaks = cleaned.replace(/<\/(p|div|li|h[1-6]|article|section|td|tr)>/gi, '\n')
  // 去标签
  const noTags = withBreaks.replace(/<[^>]+>/g, ' ')
  // 解码常见实体
  const decoded = noTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
  // 折压空白、按行清理
  const lines = decoded
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 0)
  // 取文本密度最高的连续段（最长连续非空行窗口）
  return pickDenseWindow(lines).join('\n')
}

function pickDenseWindow(lines: string[]): string[] {
  if (lines.length <= 1) return lines
  // 简单策略：去掉过短的行（< 20 字，多为菜单/按钮），剩余作为正文
  const dense = lines.filter((l) => l.length >= 20)
  return dense.length > 0 ? dense : lines
}
