import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseWebUrl } from '../src/lib/parse/web.js'

// SSRF 防护是安全关键：必须拒绝内网/回环目标。

describe('parseWebUrl SSRF guard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects localhost', async () => {
    await expect(parseWebUrl('http://localhost/admin')).rejects.toThrow('blocked_private_host')
  })

  it('rejects 127.x loopback', async () => {
    await expect(parseWebUrl('http://127.0.0.1/')).rejects.toThrow('blocked_private_host')
  })

  it('rejects private 10.x', async () => {
    await expect(parseWebUrl('http://10.0.0.1/')).rejects.toThrow('blocked_private_host')
  })

  it('rejects private 192.168.x', async () => {
    await expect(parseWebUrl('http://192.168.1.1/')).rejects.toThrow('blocked_private_host')
  })

  it('rejects link-local 169.254.x (metadata service)', async () => {
    await expect(parseWebUrl('http://169.254.169.254/latest/meta-data/')).rejects.toThrow('blocked_private_host')
  })

  it('rejects non-http protocols', async () => {
    await expect(parseWebUrl('file:///etc/passwd')).rejects.toThrow('unsupported_protocol')
    await expect(parseWebUrl('ftp://example.com/')).rejects.toThrow('unsupported_protocol')
  })

  it('rejects malformed url', async () => {
    await expect(parseWebUrl('not a url')).rejects.toThrow('invalid_url')
  })
})

describe('parseWebUrl extraction', () => {
  it('strips script/style/nav and extracts paragraph text', async () => {
    const html =
      '<html><head><script>bad()</script><style>x{}</style></head>' +
      '<body><nav>menu item</nav>' +
      '<article><p>This is the main article content long enough to pass the density filter threshold.</p>' +
      '<p>Second paragraph with additional substance for retrieval testing.</p></article>' +
      '<footer>copyright</footer></body></html>'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(html, { status: 200, headers: { 'content-type': 'text/html' } }),
    )
    const res = await parseWebUrl('https://example.com/article')
    expect(res.text).toContain('main article content')
    expect(res.text).toContain('Second paragraph')
    expect(res.text).not.toContain('bad()')
    expect(res.text).not.toContain('menu item')
  })
})
