// ============================================================
// 统一数据网关抽象层（借鉴 vnpy.trader.gateway.BaseGateway 设计）
//
// vnpy 的核心抽象：
//   - BaseGateway 定义统一接口：connect / close / subscribe / send_order
//     / cancel_order / query_account / query_position / query_history
//   - 每个券商（CTP / 恒生 / IB / 飞马）实现同一套接口
//   - 数据对象（TickData / BarData / OrderData ...）携带 gateway_name
//   - 通过 EventEngine 把回调转成事件广播，策略只订阅事件，不关心来源
//
// 本项目是「只读行情 + 估值」前端，没有下单。但同样的抽象思想适用：
//   - 定义 DataGateway 接口：connect / fetch / subscribe（轮询）
//   - 每个数据源（东方财富 / 腾讯 / 新浪）实现同一接口
//   - 上层 dataClient 只依赖 DataGateway 接口，不依赖具体源字段
//   - 通过「归一化模型（src/domain/model.js）」把差异化字段收口
//
// 这里实现的是：MarketDataGateway（行情/估值网关）抽象，不做交易网关。
// ============================================================

import { DATA_SOURCE, DATA_QUALITY, makeDataState, makeUnavailable } from '@/utils/dataQuality'

// ---- 抽象基类：对应 vnpy BaseGateway ----
// 不同点：vnpy 用线程 + EventEngine 推事件；本项目用 async + 回调 Promise。
export class BaseDataGateway {
  constructor(name, source) {
    this.name = name
    this.source = source
    this.connected = false
  }

  // 连接（初始化）。vnpy 在 connect 里做 query_contract/account/position；
  // 本项目的「连接」只是标记可用，因为都是 HTTP/JSONP。
  async connect() {
    this.connected = true
    return this
  }

  // 关闭。vnpy 要求实现；本项目无状态连接，直接标记。
  async close() {
    this.connected = false
  }

  // 拉取 K 线（对应 query_history 的简化）。子类必须实现。
  async fetchKline(/* secid, days */) {
    throw new Error(`${this.name} 未实现 fetchKline`)
  }

  // 拉取分时（对应 subscribe 的轮询版本）。
  async fetchIntraday(/* secid */) {
    throw new Error(`${this.name} 未实现 fetchIntraday`)
  }

  // 拉取实时快照（对应 on_tick 的来源）。
  async fetchQuotes(/* codes */) {
    throw new Error(`${this.name} 未实现 fetchQuotes`)
  }

  // 拉取基金净值（本项目专属）。
  async fetchNav(/* code, days */) {
    throw new Error(`${this.name} 未实现 fetchNav`)
  }

  // 拉取基金估值（本项目专属）。
  async fetchEstimate(/* code */) {
    throw new Error(`${this.name} 未实现 fetchEstimate`)
  }

  // 工具：统一失败为 unavailable 状态（对应 vnpy write_log + 返回空）
  _fail(feature, error) {
    return makeUnavailable(error || `${feature} 失败`, this.source)
  }
}

// ============================================================
// 东方财富网关（实现 BaseDataGateway）
// 字段已从源差异中归一化（见 src/domain/model.js）
// ============================================================
import * as em from '@/api/eastmoney'
import { fromEastmoneyNav, fromSinaEstimate, fromTencentKline, fromTencentIntraday } from '@/domain/model'

export class EastmoneyGateway extends BaseDataGateway {
  constructor() {
    super('eastmoney', DATA_SOURCE.EASTMONEY)
  }

  async fetchKline(secid, days = 180) {
    try {
      const rows = await em.fetchStockKline(secid, days)
      return fromTencentKline(rows, secid) // 东财 kline 已转腾讯格式行
    } catch (e) {
      return this._fail('K线', e)
    }
  }

  async fetchIntraday(secid) {
    try {
      const block = await em.fetchIntraday(secid)
      return fromTencentIntraday(block, secid)
    } catch (e) {
      return this._fail('分时', e)
    }
  }

  async fetchQuotes(codes) {
    try {
      const out = await em.fetchTencentQuotes(codes)
      // 把腾讯散字段收口为带质量的 state
      const states = {}
      for (const [k, v] of Object.entries(out)) {
        states[k] = makeDataState(v, {
          source: DATA_SOURCE.TENCENT,
          quality: DATA_QUALITY.VERIFIED,
          asOf: new Date().toISOString().slice(0, 10),
        })
      }
      return makeDataState(states, { source: this.source, quality: DATA_QUALITY.VERIFIED })
    } catch (e) {
      return this._fail('行情', e)
    }
  }

  async fetchNav(code, days = 252) {
    try {
      const list = await em.fetchFundNav(code, days)
      return fromEastmoneyNav(list, code)
    } catch (e) {
      return this._fail('净值', e)
    }
  }

  async fetchEstimate(code) {
    try {
      const raw = await em.fetchFundEstimate(code)
      return fromSinaEstimate(raw, code)
    } catch (e) {
      return this._fail('估值', e)
    }
  }
}

// ============================================================
// 代理网关（对应真实部署的「数据代理」—— 类似 vnpy 的 RemoteGateway）
// 所有请求走统一 proxyBase，字段已在服务端归一化。本项目只负责路由。
// ============================================================
import { proxyJSON } from '@/api/proxy'

export class ProxyGateway extends BaseDataGateway {
  constructor(proxyBase) {
    super('proxy', DATA_SOURCE.GATEWAY)
    this.proxyBase = proxyBase
  }

  async _get(path, timeout = 8000) {
    try {
      return await proxyJSON(path, timeout)
    } catch (e) {
      return this._fail('代理', e)
    }
  }

  async fetchKline(secid, days = 180) {
    return this._get(`/market/kline?secid=${encodeURIComponent(secid)}&days=${days}`)
  }
  async fetchIntraday(secid) {
    return this._get(`/market/intraday?secid=${encodeURIComponent(secid)}`)
  }
  async fetchQuotes(codes) {
    return this._get(`/market/quotes?codes=${encodeURIComponent(codes.join(','))}`, 6000)
  }
  async fetchNav(code, days = 252) {
    return this._get(`/fund/nav?code=${encodeURIComponent(code)}&days=${days}`)
  }
  async fetchEstimate(code) {
    return this._get(`/fund/estimate?code=${encodeURIComponent(code)}`, 6000)
  }
  async fetchProfile(code) {
    return this._get(`/fund/profile?code=${encodeURIComponent(code)}`)
  }
  async fetchHoldings(code) {
    return this._get(`/fund/holdings?code=${encodeURIComponent(code)}`)
  }
}

// ---- 网关工厂（对应 vnpy gateway 的加载机制）----
// 根据运行模式选择网关实现，上层只拿到 BaseDataGateway 接口。
import { runtime, canUseProxy } from '@/config/runtime'

export function createGateway() {
  if (canUseProxy()) {
    return new ProxyGateway(runtime.proxyBase)
  }
  return new EastmoneyGateway()
}

export default {
  BaseDataGateway,
  EastmoneyGateway,
  ProxyGateway,
  createGateway,
}
