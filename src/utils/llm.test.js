import { describe, it, expect } from 'vitest'
import { normalizeLlmProviders, parseModelList, LLM_FORMATS } from '@/utils/storage'

describe('parseModelList', () => {
  it('splits comma / chinese comma / whitespace and trims', () => {
    expect(parseModelList('claude-3, gpt-4， qwen  glm')).toEqual([
      'claude-3',
      'gpt-4',
      'qwen',
      'glm',
    ])
  })

  it('accepts arrays and joins them', () => {
    expect(parseModelList(['a', 'b'])).toEqual(['a', 'b'])
  })

  it('drops empties and undefined', () => {
    expect(parseModelList('a,, ,b')).toEqual(['a', 'b'])
    expect(parseModelList(null)).toEqual([])
  })

  it('caps at max (default 50)', () => {
    const many = Array.from({ length: 60 }, (_, i) => `m${i}`)
    expect(parseModelList(many).length).toBe(50)
  })
})

describe('normalizeLlmProviders', () => {
  it('returns [] for non-array', () => {
    expect(normalizeLlmProviders(undefined)).toEqual([])
    expect(normalizeLlmProviders({})).toEqual([])
    expect(normalizeLlmProviders('x')).toEqual([])
  })

  it('drops entries missing name or baseUrl', () => {
    const out = normalizeLlmProviders([
      { name: 'A', baseUrl: 'https://x' },
      { name: 'B' },
      { baseUrl: 'https://y' },
    ])
    expect(out.length).toBe(1)
    expect(out[0].name).toBe('A')
  })

  it('defaults format to openai and preserves valid format', () => {
    const out = normalizeLlmProviders([
      { name: 'A', baseUrl: 'https://x', format: 'anthropic' },
      { name: 'B', baseUrl: 'https://y', format: 'bogus' },
    ])
    expect(out[0].format).toBe('anthropic')
    expect(out[1].format).toBe('openai')
  })

  it('only allows known formats', () => {
    expect(LLM_FORMATS).toEqual(['anthropic', 'openai', 'responses'])
  })

  it('parses model list and defaults model to first entry', () => {
    const out = normalizeLlmProviders([
      { name: 'A', baseUrl: 'https://x', models: 'm1, m2 ,m3' },
    ])
    // 模型项归一化为 { name, modelId, contextWindow }
    expect(out[0].models).toEqual([
      { name: 'm1', modelId: 'm1', contextWindow: 0 },
      { name: 'm2', modelId: 'm2', contextWindow: 0 },
      { name: 'm3', modelId: 'm3', contextWindow: 0 },
    ])
    expect(out[0].model).toBe('m1')
  })

  it('兼容对象数组形式的 models，保留 name/modelId/contextWindow', () => {
    const out = normalizeLlmProviders([
      {
        name: 'A', baseUrl: 'https://x',
        models: [
          { name: 'GLM-5.2', modelId: 'glm-5.2', contextWindow: 1000000 },
          { modelId: 'glm-4-air' },
        ],
      },
    ])
    expect(out[0].models).toEqual([
      { name: 'GLM-5.2', modelId: 'glm-5.2', contextWindow: 1000000 },
      { name: 'glm-4-air', modelId: 'glm-4-air', contextWindow: 0 },
    ])
    expect(out[0].model).toBe('glm-5.2')
  })

  it('preserves apiKey and generates dedup ids', () => {
    const out = normalizeLlmProviders([
      { name: 'A', baseUrl: 'https://x', apiKey: 'sk-123', id: 'same' },
      { name: 'B', baseUrl: 'https://y', id: 'same' },
    ])
    expect(out.length).toBe(2)
    expect(out[0].apiKey).toBe('sk-123')
    expect(out[0].id).toBe('same')
    expect(out[1].id).not.toBe('same')
  })
})
