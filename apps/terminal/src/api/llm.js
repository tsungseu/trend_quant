// ============================================================
// LLM 客户端：支持三种 API 格式的真实流式调用
//   - anthropic : POST {baseUrl}/v1/messages，SSE content_block_delta
//   - openai   : POST {baseUrl}/v1/chat/completions，SSE choices[].delta.content
//   - responses: POST {baseUrl}/v1/responses，SSE response.output_text.delta
//
// 设计要点：
//   - 浏览器直连用户提供的端点，密钥仅来自用户配置、不写日志。
//   - 端点需允许 CORS（或经用户自己的代理），否则请求会被浏览器拦截。
//   - 流式通过 fetch + ReadableStream 逐块解析 SSE，回调 onDelta(text)。
//   - 出错时抛错，由调用方回退到 mock。
// ============================================================

const FORMAT_PATHS = {
  anthropic: '/v1/messages',
  openai: '/v1/chat/completions',
  responses: '/v1/responses',
}

// 仅允许 http/https 公开地址；拒绝 localhost、回环与常见内网网段，降低 SSRF 风险
// 关键：整数/八进制/十六进制形式 IP（2130706433 / 0177... / 0x7f...）会被 URL 规范化为点分 IP；
// IPv6 地址会被包成 [..]，其中 IPv4 映射形式（::ffff:127.0.0.1）规范化为 [::ffff:7f00:1]，
// 必须把 hex 段还原为 IPv4 再判定。
function ipToParts(ip) {
  const m = String(ip).match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return null
  return [m[1], m[2], m[3], m[4]].map((x) => parseInt(x, 10))
}

// 把 IPv6 主机名（去 [] 后）里可能出现的 IPv4 映射/兼容地址还原成点分 IPv4
function extractIpv4FromV6(raw) {
  let h = String(raw).toLowerCase().replace(/^\[|\]$/g, '')
  // 规范化形式 ::ffff:7f00:1（hex 双组）→ 127.0.0.1
  const m = h.match(/::(?:ffff:?)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (m) {
    const hi = parseInt(m[1], 16)
    const lo = parseInt(m[2], 16)
    if (hi > 0xffff || lo > 0xffff) return null
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`
  }
  // ::ffff:127.0.0.1（点分尾部）
  const m2 = h.match(/::(?:ffff:?)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  if (m2) return m2[1]
  // 兼容地址 ::7f00:1（无 ffff 前缀的 IPv4 兼容）
  const m3 = h.match(/^::([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (m3) {
    const hi = parseInt(m3[1], 16)
    const lo = parseInt(m3[2], 16)
    if (hi > 0xffff || lo > 0xffff) return null
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`
  }
  return null
}

function isPrivateIpv4(parts) {
  if (!parts) return false
  const [a, b] = parts
  if (parts.some((x) => x > 255)) return true
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true // 链路本地（含云元数据 169.254.169.254）
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true
  return false
}

function isPrivateOrLoopback(host) {
  const h = String(host).toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost') || h === '0.0.0.0' ||
      h === '[::1]' || h === '::1' || h === '[::]' || h === '::' || h === '*') return true
  // 点分 IPv4
  const dotted = ipToParts(h.replace(/^\[|\]$/g, ''))
  if (dotted) return isPrivateIpv4(dotted)
  // IPv4 映射/兼容的 IPv6（含 [::ffff:7f00:1] 这类 hex 形式）
  const mapped = extractIpv4FromV6(h)
  if (mapped) return isPrivateIpv4(ipToParts(mapped))
  // 其它 IPv6 私有/本地段：唯一本地 fc00::/7、链路本地 fe80::/10
  const bare = h.replace(/^\[|\]$/g, '')
  if (/^f[cd][0-9a-f]{2}:/.test(bare) || /^fe[89ab][0-9a-f]:/.test(bare)) return true
  return false
}

function isAllowedBaseUrl(base) {
  let u
  try {
    u = new URL(base)
  } catch {
    return false
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
  const host = u.hostname
  if (isPrivateOrLoopback(host)) return false
  return true
}

// 导出供测试与 Settings 保存时校验
export const _isAllowedBaseUrl = isAllowedBaseUrl

function buildUrl(provider) {
  const base = String(provider.baseUrl || '').replace(/\/+$/, '')
  if (!isAllowedBaseUrl(base)) {
    throw new Error('Base URL 不被允许：仅支持 http/https 公开地址，且不能为 localhost 或内网地址')
  }
  const path = FORMAT_PATHS[provider.format] || FORMAT_PATHS.openai
  return base + path
}

// 思考程度 -> 各格式参数映射
// low = 快速直答（不启用推理）；high = 标准推理；max = 深度推理
const REASONING_MAP = {
  anthropic: {
    low: null, // 不开 thinking
    high: { type: 'enabled', budget_tokens: 4096 },
    max: { type: 'enabled', budget_tokens: 12000 },
  },
  openai: {
    low: { reasoning_effort: 'low' },
    high: { reasoning_effort: 'high' },
    max: { reasoning_effort: 'high' }, // 兼容：部分端点无 max，用 high
  },
  responses: {
    low: { reasoning: { effort: 'low' } },
    high: { reasoning: { effort: 'high' } },
    max: { reasoning: { effort: 'high' } },
  },
}

function buildBody(provider, messages) {
  const m = provider.model
  const sys = messages.find((x) => x.role === 'system')
  const chat = messages.filter((x) => x.role !== 'system')
  const effort = provider.reasoningEffort || 'low'
  const reasoning = (REASONING_MAP[provider.format] || {})[effort]

  if (provider.format === 'anthropic') {
    // thinking 开启时 max_tokens 必须大于 budget，给足余量
    const budget = reasoning?.budget_tokens || 0
    return {
      model: m,
      max_tokens: Math.max(1024, budget + 2048),
      system: sys ? sys.content : '',
      messages: chat,
      stream: true,
      ...(reasoning ? { thinking: reasoning } : {}),
    }
  }
  if (provider.format === 'responses') {
    return {
      model: m,
      instructions: sys ? sys.content : '',
      input: chat.map((x) => ({ role: x.role, content: x.content })),
      stream: true,
      ...(reasoning || {}),
    }
  }
  // openai / openai-compatible
  return {
    model: m,
    messages,
    stream: true,
    // low 时用 temperature 控制发散；high/max 走 reasoning_effort
    temperature: effort === 'low' ? 0.6 : undefined,
    ...(reasoning || {}),
  }
}

function buildHeaders(provider) {
  const h = { 'content-type': 'application/json' }
  if (provider.apiKey) {
    if (provider.format === 'anthropic') {
      h['x-api-key'] = provider.apiKey
      h['anthropic-version'] = '2023-06-01'
    } else {
      h['authorization'] = 'Bearer ' + provider.apiKey
    }
  }
  return h
}

// 解析一行 SSE 数据为增量文本；返回 null 表示非数据行或心跳/结束
export function parseSSELine(line, format) {
  if (!line.startsWith('data:')) return null
  const data = line.slice(5).trim()
  if (data === '[DONE]') return null
  let json
  try {
    json = JSON.parse(data)
  } catch {
    return null
  }
  try {
    if (format === 'anthropic') {
      if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') return json.delta.text || ''
      return null
    }
    if (format === 'responses') {
      if (json.type === 'response.output_text.delta') return json.delta || ''
      return null
    }
    // openai
    const delta = json.choices?.[0]?.delta
    return delta?.content != null ? String(delta.content) : null
  } catch {
    return null
  }
}

/**
 * 调用 LLM 并流式返回文本增量
 * @param {object} provider 归一化后的供应商配置
 * @param {Array} messages [{role, content}]
 * @param {function(string)} onDelta 每个文本增量回调
 * @param {object} [opts] { signal }
 */
export async function streamChat(provider, messages, onDelta, opts = {}) {
  if (!provider || !provider.baseUrl || !provider.model) {
    throw new Error('LLM 供应商未配置完整（缺少 Base URL 或模型）')
  }
  const url = buildUrl(provider)
  const body = buildBody(provider, messages)
  const headers = buildHeaders(provider)

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: opts.signal,
  })
  if (!res.ok || !res.body) {
    // 不把上游响应体透出到用户可见的错误，避免泄露 URL / 代理信息。
    // 详细内容仅在控制台输出，不进 UI、不进日志上报。
    console.warn('[llm] upstream error', res.status)
    throw new Error(`LLM 请求失败 (HTTP ${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // SSE 按行分割，保留未完成的尾部
    let idx
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).replace(/\r$/, '')
      buffer = buffer.slice(idx + 1)
      const text = parseSSELine(line, provider.format)
      if (text) onDelta(text)
    }
  }
  // 处理最后残留
  if (buffer.trim()) {
    const text = parseSSELine(buffer.trim(), provider.format)
    if (text) onDelta(text)
  }
}

export default { streamChat }
