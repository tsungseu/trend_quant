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

// 核心能力 6 卡：Agent + Studio 共同能力，不拆产品（对标 BigQuant 能力宫格）。
// icon 为内联 SVG 字符串（Feather 风格），与终端 AppSidebar 一致。
export const coreCapabilities = [
  {
    icon: 'brain',
    title: 'AI 投研核心',
    line: '对话式研报解读、策略思路探讨与组合建议，把研究从「读」推进到「问」。',
  },
  {
    icon: 'database',
    title: '量化数据',
    line: '行情、基金与基本面数据统一接入，策略与研究共享同一份事实来源。',
  },
  {
    icon: 'layers',
    title: '因子与策略库',
    line: '内置因子与策略模板，支持表达式扩展，从模仿到自建逐步沉淀方法论。',
  },
  {
    icon: 'activity',
    title: '回测与归因',
    line: '策略回测、买卖点分析与盈亏归因，让每个结论都能回到它的来源与时点。',
  },
  {
    icon: 'trending',
    title: '行情与持仓',
    line: '真实行情 K 线与指标、持仓与交易记录一体，研究态与执行态无缝衔接。',
  },
  {
    icon: 'bell',
    title: '预警与组合',
    line: '策略预警、投顾组合推荐与跟踪，把注意力留在关键决策时刻。',
  },
]

// 增值服务 3 卡：研究与成长（对标 BigQuant 培训/源码/实盘条）。
export const growthResources = [
  {
    title: '教程与案例',
    line: '从零上手 Agent 与 Studio：对话投研、回测到预警的完整路径，配以可复用的案例。',
    cta: '免费学习',
    href: '/docs',
  },
  {
    title: '策略模板库',
    line: '经典策略模板与因子示例，打开思路、快速复用，沉淀属于自己的研究资产。',
    cta: '获取模板',
    href: '/docs/strategies',
  },
  {
    title: '模拟与实盘衔接',
    line: '回测、模拟与实盘研究态同源，让研究里成立的逻辑在执行链路里不漂移。',
    cta: '申请使用',
    href: '/products/studio',
  },
]

// 信任条：克制版指标，标注「示意」与 pricing-note 同口径，不造假数据。
export const trustSignals = [
  { label: '内置策略与模板', value: '100+' },
  { label: '覆盖因子与指标', value: '2000+' },
  { label: '行情与基金数据', value: '全市场' },
  { label: '研究工作流', value: '一体衔接' },
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
