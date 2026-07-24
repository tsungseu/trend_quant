import { makeRng, round, rand } from './_helpers'

// ============================================================
// 基金量化：4 只基金基础信息 + 历史净值/PE 序列
// 技术指标与买卖信号在 indicators.js 计算
// ============================================================

const today = new Date('2026-07-21')

// ---- 4 只基金基础信息（代码/名称/净值/类型已通过天天基金网核实，2026-07-21）----
export const funds = [
  {
    code: '019305',
    name: '摩根标普500指数(QDII)人民币C',
    short: '标普500',
    type: '指数型 · QDII',
    theme: '美股大盘',
    themeColor: '#3b82f6',
    manager: '摩根基金',
    risk: '中高',
    baseNav: 1.6461, // 实际净值
    pe: 26.8, // 标普500 PE
    pePct5y: 0.62, // 近5年PE分位
    trend: 'up', // 长期上行
    startNav: 1.32,
    vol: 0.013,
    dividend: '0',
    fee: '0.65%',
    aum: 86.2,
  },
  {
    code: '017731',
    name: '嘉实全球产业升级股票发起式(QDII)C',
    short: '全球产业升级',
    type: '股票型 · QDII',
    theme: '全球高端制造',
    themeColor: '#a855f7',
    manager: '嘉实基金',
    risk: '高',
    baseNav: 3.9509,
    pe: 31.5,
    pePct5y: 0.55,
    trend: 'up',
    startNav: 3.05,
    vol: 0.02,
    dividend: '0',
    fee: '1.20%',
    aum: 14.8,
  },
  {
    code: '019018',
    name: '易方达信息产业混合C',
    short: '信息产业',
    type: '混合型',
    theme: 'TMT/信息产业',
    themeColor: '#06b6d4',
    manager: '易方达基金',
    risk: '高',
    baseNav: 8.254,
    pe: 42.3,
    pePct5y: 0.45,
    trend: 'down_then_up', // 先跌后涨（修复中）
    startNav: 7.1,
    vol: 0.022,
    dividend: '0',
    fee: '0.60%',
    aum: 32.6,
  },
  {
    code: '018230',
    name: '易方达全球优质企业混合(QDII)C',
    short: '全球优质企业',
    type: '混合型 · QDII',
    theme: '全球蓝筹',
    themeColor: '#ef4444',
    manager: '易方达基金',
    risk: '中高',
    baseNav: 2.1115,
    pe: 28.7,
    pePct5y: 0.58,
    trend: 'up',
    startNav: 1.78,
    vol: 0.015,
    dividend: '0',
    fee: '1.00%',
    aum: 9.3,
  },
]

// ---- 生成历史净值 + PE 序列 ----
const navCache = {}
const peCache = {}

function genSeries(fund, days = 252) {
  const seed =
    fund.code.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + 11
  const r = makeRng(seed)
  const navs = []
  let v = fund.startNav

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const progress = (days - i) / days // 0→1

    // 按趋势叠加漂移
    let drift
    if (fund.trend === 'up') {
      drift = 0.0016
    } else if (fund.trend === 'down') {
      drift = -0.0009
    } else {
      // down_then_up：前段跌，后段涨
      drift = progress < 0.55 ? -0.0014 : 0.0022
    }
    const shock = (r() - 0.5) * 2
    v = v * (1 + drift + fund.vol * shock)
    navs.push({ date: d.toISOString().slice(0, 10), nav: round(v, 4) })
  }

  // 末端对齐到 baseNav
  const last = navs[navs.length - 1].nav
  const ratio = fund.baseNav / last
  navs.forEach((p) => (p.nav = round(p.nav * ratio, 4)))

  // PE 序列：净值涨→PE涨（粗略正相关），围绕当前 pe 波动
  const peSeries = navs.map((p) => {
    const rel = p.nav / fund.baseNav
    const pe = fund.pe * (0.8 + (rel - Math.min(...navs.map((n) => n.nav)) / 1) * 0.3 + (r() - 0.5) * 0.5)
    return { date: p.date, pe: round(Math.max(8, pe), 2) }
  })

  return { navs, peSeries }
}

funds.forEach((f) => {
  const { navs, peSeries } = genSeries(f)
  navCache[f.code] = navs
  peCache[f.code] = peSeries

  // 派生行情快照
  const last = navs[navs.length - 1].nav
  const prev = navs[navs.length - 2].nav
  f.nav = round(last, 4)
  f.prevNav = round(prev, 4)
  f.change = round(last - prev, 4)
  f.changePct = round((last - prev) / prev, 4)
  // 区间收益
  const first = navs[0].nav
  f.return1M = round((last / navs[navs.length - 22].nav - 1), 4)
  f.return3M = round((last / navs[navs.length - 66].nav - 1), 4)
  f.returnYTD = round((last / first - 1), 4)
  f.high52w = round(Math.max(...navs.map((n) => n.nav)), 4)
  f.low52w = round(Math.min(...navs.map((n) => n.nav)), 4)
})

export function getNavSeries(code) {
  return navCache[code] || []
}
export function getPESeries(code) {
  return peCache[code] || []
}
export function getFund(code) {
  return funds.find((f) => f.code === code)
}

// 根据净值序列重算行情快照（供实时数据覆盖时使用）
// 输入 navs: [{date,nav,changePct?}]
export function computeSnapshot(navs) {
  if (!navs || navs.length < 2) return null
  const last = navs[navs.length - 1].nav
  const prev = navs[navs.length - 2].nav
  return {
    nav: round(last, 4),
    prevNav: round(prev, 4),
    change: round(last - prev, 4),
    changePct:
      navs[navs.length - 1].changePct != null
        ? round(navs[navs.length - 1].changePct, 4)
        : round((last - prev) / prev, 4),
    return1M: navs.length > 22 ? round(last / navs[navs.length - 22].nav - 1, 4) : 0,
    return3M: navs.length > 66 ? round(last / navs[navs.length - 66].nav - 1, 4) : 0,
    returnYTD: round(last / navs[0].nav - 1, 4),
    high52w: round(Math.max(...navs.map((n) => n.nav)), 4),
    low52w: round(Math.min(...navs.map((n) => n.nav)), 4),
    latestDate: navs[navs.length - 1].date,
  }
}
