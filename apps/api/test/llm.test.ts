import { describe, it, expect, vi } from 'vitest'
import { streamChat } from '../src/lib/llm.js'

// 用伪造的 SSE 响应验证 streamChat 的增量解析，不连真实 OpenAI。

function sseBody(lines: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const l of lines) controller.enqueue(enc.encode(l + '\n'))
      controller.close()
    },
  })
}

describe('streamChat', () => {
  it('parses OpenAI SSE deltas and calls onDelta in order', async () => {
    const deltas: string[] = []
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        sseBody([
          'data: {"choices":[{"delta":{"content":"Hello"}}]}',
          'data: {"choices":[{"delta":{"content":", "}}]}',
          'data: {"choices":[{"delta":{"content":"world"}}]}',
          'data: [DONE]',
        ]),
        { status: 200, headers: { 'content-type': 'text/event-stream' } },
      ),
    )

    await streamChat({
      apiKey: 'k',
      model: 'm',
      systemPrompt: 's',
      messages: [{ role: 'user', content: 'q' }],
      onDelta: (t) => deltas.push(t),
    })

    expect(deltas.join('')).toBe('Hello, world')
  })

  it('throws LlmError on non-200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('rate limited', { status: 429 }))
    await expect(
      streamChat({
        apiKey: 'k',
        systemPrompt: 's',
        messages: [{ role: 'user', content: 'q' }],
        onDelta: () => {},
      }),
    ).rejects.toThrow(/llm_429/)
  })

  it('throws when no key available', async () => {
    // 确保环境变量没有 key 干扰
    const saved = process.env['OPENAI_API_KEY']
    delete process.env['OPENAI_API_KEY']
    try {
      await expect(
        streamChat({
          systemPrompt: 's',
          messages: [{ role: 'user', content: 'q' }],
          onDelta: () => {},
        }),
      ).rejects.toThrow(/no_llm_key/)
    } finally {
      if (saved) process.env['OPENAI_API_KEY'] = saved
    }
  })
})
