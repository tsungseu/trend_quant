// CodeRouterX 网关控制台共享类型。
// 与 apps/api 的 /console/* 路由响应形状一一对应（mock 阶段），
// 后续对接真实 gateway 时保持同名字段以减少前端改动。

export interface KpiItem {
  value: number
  currency?: string
  unit?: string
  deltaPct: number
}

export interface OverviewKpi {
  balance: KpiItem
  todayCost: KpiItem
  todayRequests: KpiItem
  errorRate: KpiItem
}

export interface TrendPoint {
  t: string
  requests: number
  cost: number
}

export interface Trend {
  granularity: 'hour' | 'day'
  points: TrendPoint[]
}

export interface RecentRequest {
  at: string
  model: string
  tokensIn: number
  tokensOut: number
  cost: number
  status: number
  latencyMs: number
}

export interface Quota {
  rpmLimit: number
  tpmLimit: number
  usedPct: number
}

export interface OverviewResponse {
  kpi: OverviewKpi
  trend: Trend
  recentRequests: RecentRequest[]
  quota: Quota
}

export interface ApiKey {
  id: string
  name: string
  prefix: string
  status: 'active' | 'disabled'
  createdAt: string
  lastUsedAt: string
  todayRequests: number
}

export interface UsagePoint {
  date: string
  requests: number
  cost: number
}

export interface WalletTransaction {
  id: string
  type: 'recharge' | 'consume'
  amount: number
  currency: string
  method?: string
  desc?: string
  at: string
  status: string
}

export interface Wallet {
  balance: { value: number; currency: string }
  cumulativeCost: { value: number; currency: string; since: string }
  transactions: WalletTransaction[]
  realname: { verified: boolean; name?: string; submittedAt: string }
}
