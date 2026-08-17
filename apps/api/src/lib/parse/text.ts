// 纯文本解析：直接返回 UTF-8 字符串，清理 BOM 与异常空白。

export interface ParseResult {
  text: string
  /** 低置信度标记（OCR 扫描件等） */
  lowConfidence?: boolean
}

export async function parseText(buf: Buffer): Promise<ParseResult> {
  // 去 BOM
  let s = buf.toString('utf-8')
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1)
  // 折叠 Windows 换行
  s = s.replace(/\r\n/g, '\n')
  return { text: s.trim() }
}
