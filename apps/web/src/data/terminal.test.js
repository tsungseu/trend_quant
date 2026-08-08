import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// terminal.js 在模块加载时读取 import.meta.env，因此每个用例前重置模块缓存
// 并用 vi.stubEnv 改写环境变量后动态 import()。

describe('terminalUrl', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns localhost entry in dev (PROD=false)', async () => {
    vi.stubEnv('PROD', false)
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_TERMINAL_URL', '')
    const { terminalUrl } = await import('./terminal.js')
    expect(terminalUrl).toBe('http://localhost:5173/app')
  })

  it('derives the /terminal/ subpath default in prod when env unset', async () => {
    vi.stubEnv('PROD', true)
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_TERMINAL_URL', '')
    const { terminalUrl } = await import('./terminal.js')
    expect(terminalUrl).toBe('/trend_quant/terminal/#/app')
  })

  it('honors VITE_TERMINAL_URL override in prod (cross-origin)', async () => {
    vi.stubEnv('PROD', true)
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_TERMINAL_URL', 'https://studio.example.com/#/app')
    const { terminalUrl } = await import('./terminal.js')
    expect(terminalUrl).toBe('https://studio.example.com/#/app')
  })

  it('honors VITE_TERMINAL_URL override in dev too', async () => {
    vi.stubEnv('PROD', false)
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_TERMINAL_URL', 'https://other.example.com/app')
    const { terminalUrl } = await import('./terminal.js')
    expect(terminalUrl).toBe('https://other.example.com/app')
  })

  it('exports the prod default constant for documentation/deploy checks', async () => {
    vi.stubEnv('PROD', true)
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_TERMINAL_URL', '')
    const { PROD_DEFAULT_TERMINAL_URL } = await import('./terminal.js')
    expect(PROD_DEFAULT_TERMINAL_URL).toBe('/trend_quant/terminal/#/app')
  })
})
