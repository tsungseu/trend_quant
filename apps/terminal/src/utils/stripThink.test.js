import { describe, it, expect } from 'vitest'
import { createThinkStripper } from './stripThink'

describe('createThinkStripper', () => {
  it('去掉完整 think 块，保留正文', () => {
    const s = createThinkStripper()
    expect(s.push('<think>推理中</think>最终结论')).toBe('最终结论')
  })

  it('跨 chunk 也能过滤', () => {
    const s = createThinkStripper()
    expect(s.push('<thi')).toBe('')
    expect(s.push('nk>内部')).toBe('')
    expect(s.push('思考</th')).toBe('')
    expect(s.push('ink>可见内容')).toBe('可见内容')
  })

  it('reset 后状态清空', () => {
    const s = createThinkStripper()
    s.push('<think>未闭合')
    s.reset()
    expect(s.push('正常文本')).toBe('正常文本')
  })
})
