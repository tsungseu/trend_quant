// CodeRouterX 网关控制台客户端。
//
// 设计：
// - baseUrl 优先取 VITE_GATEWAY_API_URL（真实网关），未配置时回退到
//   apps/api 的 /console（mock），让终端开箱即用。
// - 复用 rag-client 的 token 注入模式（Clerk session token）。
// - 纯 fetch 封装，无重试；调用方按场景处理错误。

import type {
  ApiKey,
  OverviewResponse,
  UsagePoint,
  Wallet,
} from './types.js'

export interface GatewayClientOptions {
  /** 真实网关基址；未传则使用 fallback（apps/api mock） */
  baseUrl?: string
  /** mock 兜底基址（通常是 apps/api 地址，如 http://localhost:8080） */
  fallbackBaseUrl: string
  getToken: () => Promise<string>
  fetchImpl?: typeof fetch
}

export class GatewayClient {
  private baseUrl: string
  private fallbackBaseUrl: string
  private realBaseUrl?: string
  private getToken: () => Promise<string>
  private fetchImpl: typeof fetch

  constructor(opts: GatewayClientOptions) {
    this.fallbackBaseUrl = opts.fallbackBaseUrl.replace(/\/$/, '')
    this.realBaseUrl = opts.baseUrl?.replace(/\/$/, '')
    // 真实网关优先；未配置则用 mock 兜底
    this.baseUrl = this.realBaseUrl || this.fallbackBaseUrl
    this.getToken = opts.getToken
    // 绑定到 globalThis，避免作为方法引用时出现 Illegal invocation
    this.fetchImpl = opts.fetchImpl ?? ((input, init) => globalThis.fetch(input, init))
  }

  /** 当前是否指向真实网关（false = 走 apps/api mock，UI 可提示"演示数据"） */
  get isRealGateway(): boolean {
    return !!this.realBaseUrl
  }

  private async headers(): Promise<HeadersInit> {
    const token = await this.getToken()
    return { authorization: `Bearer ${token}` }
  }

  private async get<T>(path: string): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      headers: await this.headers(),
    })
    if (!res.ok) throw new Error(`gateway ${path} ${res.status}`)
    return res.json() as Promise<T>
  }

  overview(): Promise<OverviewResponse> {
    return this.get('/console/overview')
  }

  keys(): Promise<{ keys: ApiKey[] }> {
    return this.get('/console/keys')
  }

  usage(days = 14): Promise<{ series: UsagePoint[] }> {
    return this.get(`/console/usage?days=${days}`)
  }

  wallet(): Promise<Wallet> {
    return this.get('/console/wallet')
  }
}

export type { ApiKey, OverviewResponse, UsagePoint, Wallet } from './types.js'
