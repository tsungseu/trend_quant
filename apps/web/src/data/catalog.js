// 营销站静态内容目录：产品四象限、价格档位、知识库入口。
// 集中维护，供 Products / ProductDetail / Pricing / Docs 视图共用。

export const products = [
  {
    slug: 'strategies',
    name: '量化策略',
    tagline: '把研究沉淀为可复用的策略',
    summary:
      '因子、信号与组合规则统一建模，回测与实盘共用同一套逻辑，让研究成果稳定落地。',
    points: [
      '因子与信号统一定义，回测实盘同源',
      '组合与风控规则可组合、可版本化',
      '策略触发全过程可复盘、可审计',
    ],
  },
  {
    slug: 'data',
    name: '数据服务',
    tagline: '一致、可追溯的市场数据',
    summary:
      '行情、基金净值、指数与宏观指标汇聚一处，附带数据质量元信息，让每个判断都有据可查。',
    points: [
      '行情 / 基金 / 指数 / 宏观一体接入',
      '数据质量与时效元信息随取随查',
      '缺失与异常显式标注，不静默填补',
    ],
  },
  {
    slug: 'trading',
    name: '交易执行',
    tagline: '从信号到下单的清晰链路',
    summary:
      '持仓、交易与预警贯通，策略触发即时可见，把关键决策留给人，把重复执行交给系统。',
    points: [
      '持仓、交易、预警贯通一处',
      '策略信号即时可见、可确认',
      '关键动作保留人工决策关口',
    ],
  },
  {
    slug: 'research',
    name: '研究工作台',
    tagline: '让方法与结论可被检验',
    summary:
      '教程、策略说明与 API 沉淀为团队知识库，研究过程可复盘、可传承、可协作。',
    points: [
      '研究笔记与结论结构化沉淀',
      '策略说明与 API 文档一体维护',
      '团队协作复盘，方法可传承',
    ],
  },
]

export function getProduct(slug) {
  return products.find((p) => p.slug === slug) || null
}

export const pricingTiers = [
  {
    id: 'free',
    name: 'Free',
    price: '¥0',
    period: '/ 永久',
    blurb: '面向个人研究者，快速上手一体化投研。',
    cta: '开始使用',
    featured: false,
    benefits: [
      '核心行情与基金数据',
      '基础回测与策略模板',
      '单人研究工作台',
      '社区知识库访问',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '¥299',
    period: '/ 月',
    blurb: '面向专业投研，覆盖策略到执行的完整链路。',
    cta: '开始使用',
    featured: true,
    benefits: [
      '全量数据与质量元信息',
      '高级回测与组合风控',
      '实盘信号与交易执行链路',
      '策略版本管理与复盘',
      '优先技术支持',
    ],
  },
  {
    id: 'institution',
    name: 'Institution',
    price: '定制',
    period: '',
    blurb: '面向机构团队，私有部署与协作治理。',
    cta: '开始使用',
    featured: false,
    benefits: [
      'Pro 全部能力',
      '私有部署与数据隔离',
      '团队协作与权限治理',
      '定制数据源与接入',
      '专属支持与 SLA',
    ],
  },
]

export const docsEntries = [
  {
    slug: 'tutorial',
    name: '教程',
    summary: '从零搭建第一个策略：数据接入、回测、到实盘信号的完整路径。',
  },
  {
    slug: 'strategies',
    name: '策略说明',
    summary: '内置策略的方法、假设与适用场景，理解每个信号背后的逻辑。',
  },
  {
    slug: 'api',
    name: 'API',
    summary: '数据、回测与交易接口参考，把 TrendQuant 接入你的研究流程。',
  },
]
