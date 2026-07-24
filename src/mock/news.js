import { makeRng, pick } from './_helpers'

// ============================================================
// 资讯流：要闻 / 公告 / 研报
// ============================================================

const rng = makeRng(9988)

const newsData = [
  // 要闻
  {
    category: 'headline',
    tag: '央行',
    tagColor: 'red',
    title: '央行宣布降准0.25个百分点，释放长期资金约5000亿元',
    summary: '中国人民银行决定于2026年7月20日下调金融机构存款准备金率0.25个百分点。此次降准为全面降准，将释放长期资金约5000亿元，有助降低金融机构资金成本，支持实体经济。',
    source: '新华社',
    time: '1小时前',
    hot: 9821,
    impact: 'high',
    related: ['银行', '地产', '券商'],
  },
  {
    category: 'headline',
    tag: '政策',
    tagColor: 'blue',
    title: '国务院发布《关于促进新能源汽车产业高质量发展的指导意见》',
    summary: '意见提出，到2030年新能源汽车新车销售占比达到50%以上，充电基础设施全面覆盖。将加大财税支持力度，完善充换电基础设施建设，推动产业链协同发展。',
    source: '央视新闻',
    time: '2小时前',
    hot: 7654,
    impact: 'high',
    related: ['新能源车', '宁德时代', '比亚迪'],
  },
  {
    category: 'headline',
    tag: '外围',
    tagColor: 'gold',
    title: '美联储维持利率不变，暗示年内或有一次降息',
    summary: '美联储7月议息会议决定维持联邦基金利率目标区间在5.25%-5.50%。鲍威尔表示，通胀已显著放缓，若经济数据符合预期，年内可能开始降息。美股三大指数收涨。',
    source: '财联社',
    time: '3小时前',
    hot: 6543,
    impact: 'medium',
    related: ['贵金属', '出口', '半导体'],
  },
  {
    category: 'headline',
    tag: '数据',
    tagColor: 'green',
    title: '上半年GDP同比增长5.5%，经济回升向好',
    summary: '国家统计局公布，上半年国内生产总值616836亿元，同比增长5.5%。其中二季度增长6.3%，超出市场预期。工业生产、服务业、消费均呈现良好恢复态势。',
    source: '人民日报',
    time: '5小时前',
    hot: 5421,
    impact: 'medium',
    related: ['消费', '制造业'],
  },
  {
    category: 'headline',
    tag: '行业',
    tagColor: 'purple',
    title: '半导体行业景气度持续回暖，国产替代加速',
    summary: '多家半导体上市公司发布业绩预告，二季度营收环比增长超20%。设备国产化率提升至35%，国产替代进程加速。北方华创、中微公司订单饱满。',
    source: '证券时报',
    time: '6小时前',
    hot: 4892,
    impact: 'medium',
    related: ['半导体', '北方华创'],
  },

  // 公告
  {
    category: 'announcement',
    tag: '业绩',
    tagColor: 'blue',
    title: '贵州茅台：上半年净利润同比增长19.5%，拟10派259.91元',
    summary: '公司2026年上半年实现营业收入819.31亿元，同比增长18.2%；净利润416.85亿元，同比增长19.5%。公司拟每10股派发现金红利259.91元（含税）。',
    source: '上交所',
    time: '30分钟前',
    hot: 8932,
    impact: 'high',
    related: ['贵州茅台', '白酒'],
  },
  {
    category: 'announcement',
    tag: '回购',
    tagColor: 'green',
    title: '宁德时代：拟回购公司股份不低于30亿元不超过60亿元',
    summary: '宁德时代公告，拟以集中竞价交易方式回购公司股份，回购金额不低于30亿元且不超过60亿元，回购价格不超过280元/股，用于实施股权激励或员工持股计划。',
    source: '深交所',
    time: '1小时前',
    hot: 6543,
    impact: 'high',
    related: ['宁德时代', '新能源'],
  },
  {
    category: 'announcement',
    tag: '减持',
    tagColor: 'red',
    title: '某科技公司：股东拟减持不超过3%公司股份',
    summary: '公司持股5%以上股东计划以集中竞价或大宗交易方式减持公司股份不超过1500万股，即不超过公司总股本的3%。减持原因为自身资金需求。',
    source: '深交所',
    time: '2小时前',
    hot: 3421,
    impact: 'low',
    related: [],
  },
  {
    category: 'announcement',
    tag: '增发',
    tagColor: 'gold',
    title: '比亚迪：拟定增募资不超过300亿元用于电池扩产',
    summary: '比亚迪公告，拟向特定对象发行股票募集资金不超过300亿元，用于动力电池生产基地建设项目及补充流动资金，进一步扩大产能满足市场需求。',
    source: '深交所',
    time: '4小时前',
    hot: 5234,
    impact: 'medium',
    related: ['比亚迪', '新能源'],
  },

  // 研报
  {
    category: 'research',
    tag: '中信',
    tagColor: 'blue',
    title: '中信证券：白酒板块估值处于历史低位，建议超配',
    summary: '当前白酒板块PE-TTM处于近5年15%分位，估值具备安全边际。高端酒动销稳健，次高端弹性可期。重点推荐贵州茅台、五粮液、泸州老窖。目标价上调10-15%。',
    source: '中信证券',
    author: '食品饮料团队',
    time: '2小时前',
    hot: 3214,
    impact: 'medium',
    rating: '买入',
    target: '贵州茅台 1850元',
    related: ['贵州茅台', '五粮液'],
  },
  {
    category: 'research',
    tag: '海通',
    tagColor: 'gold',
    title: '海通证券：新能源车销量超预期，产业链景气度上行',
    summary: '6月新能源车销量同比增长35%，渗透率达38%。电池、材料、整车全产业链景气度上行。建议关注宁德时代、比亚迪、亿纬锂能等龙头企业。',
    source: '海通证券',
    author: '新能源团队',
    time: '3小时前',
    hot: 2987,
    impact: 'medium',
    rating: '增持',
    target: '宁德时代 260元',
    related: ['宁德时代', '比亚迪'],
  },
  {
    category: 'research',
    tag: '国君',
    tagColor: 'purple',
    title: '国泰君安：半导体国产替代进入加速期，设备环节最受益',
    summary: '国内晶圆厂资本开支预期上修，半导体设备国产化率从25%提升至35%。推荐北方华创、中微公司、拓荆科技。国产设备性价比优势显现，订单能见度高。',
    source: '国泰君安',
    author: '电子团队',
    time: '5小时前',
    hot: 2456,
    impact: 'medium',
    rating: '买入',
    target: '北方华创 450元',
    related: ['半导体', '北方华创'],
  },
]

// 为研报补充字段统一
newsData.forEach((n) => {
  if (n.category === 'research' && !n.rating) n.rating = '增持'
})

export const news = newsData
export const categories = [
  { key: 'all', label: '全部' },
  { key: 'headline', label: '要闻' },
  { key: 'announcement', label: '公告' },
  { key: 'research', label: '研报' },
]

// 市场日历
export const calendar = [
  { time: '07-21 09:30', event: '中国 7月LPR利率', type: 'macro', importance: 'high' },
  { time: '07-21 20:30', event: '美国 上周初请失业金人数', type: 'macro', importance: 'medium' },
  { time: '07-22 10:00', event: '宁德时代 业绩说明会', type: 'corp', importance: 'high' },
  { time: '07-22 15:00', event: '欧洲央行利率决议', type: 'macro', importance: 'high' },
  { time: '07-23', event: '贵州茅台 分红除权日', type: 'corp', importance: 'medium' },
  { time: '07-24 09:30', event: '中国 二季度GDP详细数据', type: 'macro', importance: 'high' },
]

export const impactText = { high: '重大影响', medium: '一般影响', low: '影响较小' }
