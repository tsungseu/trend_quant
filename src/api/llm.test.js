import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { streamChat, parseSSELine, _isAllowedBaseUrl } from '@/api/llm'

function makeStream(chunks) {
  // chunks: array of strings (raw HTTP body pieces)
  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c))
      controller.close()
    },
  })
}

function mockFetch(body, status = 200) {
  globalThis.fetch = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    body: makeStream(body),
    text: async () => '',
  }))
}

describe('parseSSELine', () => {
  it('returns null for non-data lines', () => {
    expect(parseSSELine(': keep-alive', 'openai')).toBeNull()
    expect(parseSSELine('event: ping', 'openai')).toBeNull()
  })

  it('returns null for [DONE]', () => {
    expect(parseSSELine('data: [DONE]', 'openai')).toBeNull()
  })

  it('parses openai delta content', () => {
    expect(parseSSELine('data: {"choices":[{"delta":{"content":"hi"}}]}', 'openai')).toBe('hi')
  })

  it('returns null for empty openai delta', () => {
    expect(parseSSELine('data: {"choices":[{"delta":{}}]}', 'openai')).toBeNull()
  })

  it('parses anthropic content_block_delta', () => {
    const line = 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"hi"}}'
    expect(parseSSELine(line, 'anthropic')).toBe('hi')
  })

  it('parses responses output_text delta', () => {
    const line = 'data: {"type":"response.output_text.delta","delta":"hi"}'
    expect(parseSSELine(line, 'responses')).toBe('hi')
  })

  it('returns null for unparseable json', () => {
    expect(parseSSELine('data: not-json', 'openai')).toBeNull()
  })
})

describe('streamChat', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('throws when provider incomplete', async () => {
    await expect(streamChat({ baseUrl: '' }, [], () => {})).rejects.toThrow(/未配置完整/)
    await expect(streamChat({ baseUrl: 'x', model: '' }, [], () => {})).rejects.toThrow(/未配置完整/)
  })

  it('streams openai chat completions', async () => {
    mockFetch([
      'data: {"choices":[{"delta":{"content":"你"}}]}\n',
      'data: {"choices":[{"delta":{"content":"好"}}]}\n',
      'data: [DONE]\n',
    ])
    const got = []
    await streamChat({ baseUrl: 'https://x', model: 'm', format: 'openai' }, [{ role: 'user', content: 'hi' }], (t) => got.push(t))
    expect(got.join('')).toBe('你好')
  })

  it('streams anthropic messages', async () => {
    mockFetch([
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"A"}}\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"B"}}\n',
    ])
    const got = []
    await streamChat({ baseUrl: 'https://x', model: 'm', format: 'anthropic', apiKey: 'k' }, [{ role: 'user', content: 'hi' }], (t) => got.push(t))
    expect(got.join('')).toBe('AB')
  })

  it('streams responses api', async () => {
    mockFetch([
      'data: {"type":"response.output_text.delta","delta":"X"}\n',
      'data: {"type":"response.output_text.delta","delta":"Y"}\n',
    ])
    const got = []
    await streamChat({ baseUrl: 'https://x', model: 'm', format: 'responses' }, [{ role: 'user', content: 'hi' }], (t) => got.push(t))
    expect(got.join('')).toBe('XY')
  })

  it('sends anthropic headers', async () => {
    mockFetch(['data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"ok"}}\n'])
    await streamChat({ baseUrl: 'https://x', model: 'm', format: 'anthropic', apiKey: 'sk-1' }, [{ role: 'user', content: 'hi' }], () => {})
    const call = globalThis.fetch.mock.calls[0]
    const headers = call[1].headers
    expect(headers['x-api-key']).toBe('sk-1')
    expect(headers['anthropic-version']).toBe('2023-06-01')
  })

  it('throws on non-ok response', async () => {
    mockFetch([''], 401)
    await expect(
      streamChat({ baseUrl: 'https://x', model: 'm' }, [{ role: 'user', content: 'hi' }], () => {})
    ).rejects.toThrow(/HTTP/)
  })
})

describe('SSRF 防护：_isAllowedBaseUrl', () => {
  const blocked = [
    'http://127.0.0.1/',
    'http://localhost/',
    'http://foo.localhost/',
    'http://10.0.0.1/',
    'http://192.168.1.1/',
    'http://172.16.0.1/',
    'http://169.254.169.254/',          // 云元数据
    'http://2130706433/',               // 十进制整数 → 127.0.0.1
    'http://0x7f000001/',               // 十六进制 → 127.0.0.1
    'http://017700000001/',             // 八进制 → 127.0.0.1
    'http://[::1]/',
    'http://[::ffff:127.0.0.1]/',       // IPv4 映射 IPv6（点分）
    'http://[::ffff:7f00:1]/',          // IPv4 映射 IPv6（hex，URL 规范化后的形态）
    'http://[::ffff:a9fe:a9fe]/',       // 元数据 169.254.169.254 的映射形式
    'http://[fc00::1]/',                // IPv6 唯一本地
    'http://[fe80::1]/',                // IPv6 链路本地
    'file:///etc/passwd',
    'javascript:alert(1)',
  ]
  const allowed = [
    'https://api.openai.com/',
    'https://api.anthropic.com/',
    'http://8.8.8.8/',
    'http://172.32.0.1/',               // 恰好在 172 私有段之外
    'http://[2606:4700::]/',            // 公有 IPv6
  ]
  for (const url of blocked) {
    it('拒绝 ' + url, () => {
      expect(_isAllowedBaseUrl(url)).toBe(false)
    })
  }
  for (const url of allowed) {
    it('放行 ' + url, () => {
      expect(_isAllowedBaseUrl(url)).toBe(true)
    })
  }
})
