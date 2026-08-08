// 营销站静态内容：品牌 TrendQuant；产品线 MindQuant Agent / Studio。
// 旧四象限能力并入 Studio 能力清单（不含资讯）。

export const products = [
  {
    slug: 'agent',
    name: 'MindQuant Agent',
    tagline: '量化交易 Agent',
    summary:
      '在线 AI 投研助手：用自然语言做研报解读、策略思路探讨与组合建议，把对话产出衔接到 Studio 工作台。',
    points: [
      '对话式 AI 投研与研报解读',
      '策略思路探讨与组合建议（辅助分析，非代客理财）',
      '与 MindQuant Studio 同一品牌工作流衔接',
    ],
    ctaLabel: '试用 Agent',
    ctaPath: '/advisor',
  },
  {
    slug: 'studio',
    name: 'MindQuant Studio',
    tagline: '量化交易终端',
    summary:
      'TrendQuant 旗下投研工作台：策略回测、行情指标、持仓交易、预警与投顾分析一体完成关键决策研究。',
    points: [
      '量化策略回测研究与买卖点分析',
      '策略研究态盈亏跟踪与预警',
      '投顾组合推荐及分析（AI 辅助）',
      '真实行情 K 线与指标分析',
      '回测与模拟交易衔接（非券商实盘撮合承诺）',
      '基金量化、持仓与交易记录',
    ],
    ctaLabel: '打开 Studio',
    ctaPath: '',
  },
]

export function getProduct(slug) {
  return products.find((p) => p.slug === slug) || null
}

/** 旧能力 slug → 新产品落地页（兼容书签） */
export const legacyProductRedirects = {
  strategies: 'studio',
  data: 'studio',
  trading: 'studio',
  research: 'agent',
}

export const pricingTiers = [
  {
    id: 'free',
    name: 'Free',
    price: '¥0',
    period: '/ 永久',
    blurb: '面向个人研究者，快速体验 Agent 与 Studio 基础能力。',
    cta: '开始使用',
    featured: false,
    benefits: [
      'MindQuant Agent 基础对话额度',
      'MindQuant Studio 核心行情与基金数据',
      '基础回测与策略模板',
      '社区知识库访问',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '¥299',
    period: '/ 月',
    blurb: '面向专业投研，覆盖 Agent 投研到 Studio 执行研究链路。',
    cta: '开始使用',
    featured: true,
    benefits: [
      'Agent 高额度 AI 投研',
      'Studio 全量数据与质量元信息',
      '高级回测、预警与组合分析',
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
    summary: '从零上手 MindQuant Agent 与 Studio：对话投研、回测到预警的完整路径。',
  },
  {
    slug: 'strategies',
    name: '策略说明',
    summary: '内置策略的方法、假设与适用场景，理解每个信号背后的逻辑。',
  },
  {
    slug: 'api',
    name: 'API',
    summary: '数据、回测与投研接口参考，把 TrendQuant 接入你的研究流程。',
  },
]
