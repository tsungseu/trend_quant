import { describe, it, expect } from 'vitest'
import { BaseDataGateway, EastmoneyGateway, ProxyGateway, createGateway } from '@/domain/gateway'
import { runtime, canUseProxy } from '@/config/runtime'

describe('统一网关抽象（借鉴 vnpy BaseGateway）', () => {
  it('BaseDataGateway：未实现的接口抛错', async () => {
    const g = new BaseDataGateway('test', 'local')
    await expect(g.fetchKline('x')).rejects.toThrow()
    await expect(g.fetchNav('x')).rejects.toThrow()
    await expect(g.fetchEstimate('x')).rejects.toThrow()
  })

  it('BaseDataGateway：connect / close 切换 connected', async () => {
    const g = new BaseDataGateway('test', 'local')
    await g.connect()
    expect(g.connected).toBe(true)
    await g.close()
    expect(g.connected).toBe(false)
  })

  it('EastmoneyGateway：继承 BaseDataGateway，source 正确', () => {
    const g = new EastmoneyGateway()
    expect(g).toBeInstanceOf(BaseDataGateway)
    expect(g.source).toBe('eastmoney')
    expect(g.name).toBe('eastmoney')
  })

  it('EastmoneyGateway：fetchKline 归一化返回带质量 state', async () => {
    // 直接 mock eastmoney 模块不可行（已静态 import），这里验证返回结构约定：
    // 无论成功失败，必须返回 makeDataState 形态（data + source + quality）
    const g = new EastmoneyGateway()
    // 用无效 secid 触发失败分支，应返回 unavailable 而非抛错
    const state = await g.fetchKline('', 10)
    expect(state).toHaveProperty('source')
    expect(state).toHaveProperty('quality')
    expect(state).toHaveProperty('data')
  })

  it('ProxyGateway：构造时记录 proxyBase', () => {
    const g = new ProxyGateway('https://proxy.example.com')
    expect(g).toBeInstanceOf(BaseDataGateway)
    expect(g.proxyBase).toBe('https://proxy.example.com')
  })

  it('createGateway：根据数据模式选择实现', () => {
    // 当前构建环境（dev）默认 direct -> EastmoneyGateway
    const g = createGateway()
    if (canUseProxy()) {
      expect(g).toBeInstanceOf(ProxyGateway)
    } else {
      expect(g).toBeInstanceOf(EastmoneyGateway)
    }
  })

  it('runtime：数据模式合法', () => {
    expect(['demo', 'direct', 'proxy']).toContain(runtime.dataMode)
  })
})
