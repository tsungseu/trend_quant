import { describe, it, expect } from 'vitest'
import { chunkText, estimateTokens } from '../src/lib/chunk.js'

describe('chunkText', () => {
  it('returns empty for empty input', () => {
    expect(chunkText('')).toEqual([])
    expect(chunkText('   \n  ')).toEqual([])
  })

  it('produces sequential chunkIdx', () => {
    const text = Array.from({ length: 50 }, (_, i) => `段落 ${i}。这是一段足够长的中文文本用于测试切块行为。`).join('\n\n')
    const chunks = chunkText(text, { targetTokens: 64, overlapTokens: 8 })
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.map((c) => c.chunkIdx)).toEqual(chunks.map((_, i) => i))
  })

  it('respects target size roughly (no block massively exceeds target without hard split)', () => {
    const long = 'A'.repeat(5000)
    const chunks = chunkText(long, { targetTokens: 50, overlapTokens: 5 })
    // 硬切兜底生效：每块字符数不应远超 targetChars*2
    for (const c of chunks) {
      expect(c.text.length).toBeLessThan(50 * 3 * 2 + 10)
    }
  })

  it('handles CJK and latin without throwing', () => {
    expect(() => chunkText('hello world. 你好世界。')).not.toThrow()
    expect(chunkText('你好世界。你好世界。').length).toBeGreaterThanOrEqual(1)
  })
})

describe('estimateTokens', () => {
  it('is positive for any non-empty string', () => {
    expect(estimateTokens('abc')).toBeGreaterThan(0)
    expect(estimateTokens('你好')).toBeGreaterThan(0)
  })
  it('uses denser estimate for CJK-heavy text (same char count)', () => {
    // 同样 20 个字符：CJK 应产生更高 token 估算
    const cjk = estimateTokens('你好世界测试中文文本内容一二三四五六') // 20 chars
    const latin = estimateTokens('a'.repeat(20)) // 20 chars
    expect(cjk).toBeGreaterThan(latin)
  })
})
