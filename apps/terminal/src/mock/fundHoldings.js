// ============================================================
// 基金重仓股明细：每只基金的前十大重仓股（季报公开数据）
// 用于基金详情页"重仓股"区块
// ============================================================

// 通用重仓股字段：{ name, code, weight, sector, changePct(今日涨跌), navHolding(占净值) }
export const fundHoldings = {
  // 摩根标普500：重仓美股科技巨头
  '019305': [
    { name: '苹果', code: 'AAPL', weight: 7.2, sector: '科技', changePct: 0.012 },
    { name: '微软', code: 'MSFT', weight: 6.8, sector: '科技', changePct: 0.008 },
    { name: '英伟达', code: 'NVDA', weight: 6.1, sector: '半导体', changePct: 0.024 },
    { name: '亚马逊', code: 'AMZN', weight: 3.5, sector: '电商', changePct: 0.006 },
    { name: 'Meta', code: 'META', weight: 2.4, sector: '社交', changePct: 0.015 },
    { name: '谷歌A', code: 'GOOGL', weight: 2.1, sector: '科技', changePct: -0.004 },
    { name: '伯克希尔', code: 'BRK.B', weight: 1.8, sector: '金融', changePct: 0.003 },
    { name: '特斯拉', code: 'TSLA', weight: 1.5, sector: '新能源车', changePct: -0.018 },
    { name: '礼来', code: 'LLY', weight: 1.3, sector: '医药', changePct: 0.011 },
    { name: '博通', code: 'AVGO', weight: 1.2, sector: '半导体', changePct: 0.019 },
  ],
  // 嘉实全球产业升级：重仓全球高端制造
  '017731': [
    { name: '宁德时代', code: 'SZ300750', weight: 8.6, sector: '新能源', changePct: 0.015 },
    { name: '比亚迪', code: 'SZ002594', weight: 7.2, sector: '新能源车', changePct: 0.021 },
    { name: '台积电', code: 'TSM', weight: 6.5, sector: '半导体', changePct: 0.013 },
    { name: '三星电子', code: '005930', weight: 4.8, sector: '半导体', changePct: -0.005 },
    { name: '隆基绿能', code: 'SH601012', weight: 4.2, sector: '光伏', changePct: -0.012 },
    { name: '阳光电源', code: 'SZ300274', weight: 3.6, sector: '光伏', changePct: 0.009 },
    { name: '立讯精密', code: 'SZ002475', weight: 3.2, sector: '电子', changePct: 0.014 },
    { name: '汇川技术', code: 'SZ300124', weight: 2.9, sector: '工业', changePct: 0.007 },
    { name: '思摩尔', code: 'SZ301029', weight: 2.4, sector: '电子', changePct: -0.008 },
    { name: '迈为股份', code: 'SZ300751', weight: 2.1, sector: '光伏', changePct: 0.011 },
  ],
  // 易方达信息产业：重仓 TMT
  '019018': [
    { name: '立讯精密', code: 'SZ002475', weight: 7.8, sector: '电子', changePct: 0.014 },
    { name: '北方华创', code: 'SZ002371', weight: 6.5, sector: '半导体', changePct: 0.026 },
    { name: '中微公司', code: 'SH688012', weight: 5.2, sector: '半导体', changePct: 0.022 },
    { name: '海康威视', code: 'SZ002415', weight: 4.8, sector: '安防', changePct: -0.006 },
    { name: '兆易创新', code: 'SH603986', weight: 4.3, sector: '半导体', changePct: 0.018 },
    { name: '韦尔股份', code: 'SH603501', weight: 4.1, sector: '半导体', changePct: 0.013 },
    { name: '紫光国微', code: 'SZ002049', weight: 3.6, sector: '半导体', changePct: 0.009 },
    { name: '圣邦股份', code: 'SZ300661', weight: 3.2, sector: '半导体', changePct: 0.015 },
    { name: '沪硅产业', code: 'SH688126', weight: 2.8, sector: '半导体', changePct: -0.011 },
    { name: '卓胜微', code: 'SZ300782', weight: 2.5, sector: '半导体', changePct: 0.007 },
  ],
  // 易方达全球优质企业：重仓全球蓝筹
  '018230': [
    { name: '腾讯控股', code: 'HK00700', weight: 6.8, sector: '互联网', changePct: 0.016 },
    { name: '贵州茅台', code: 'SH600519', weight: 6.2, sector: '白酒', changePct: 0.009 },
    { name: '台积电', code: 'TSM', weight: 5.5, sector: '半导体', changePct: 0.013 },
    { name: '苹果', code: 'AAPL', weight: 4.8, sector: '科技', changePct: 0.012 },
    { name: '宁德时代', code: 'SZ300750', weight: 4.2, sector: '新能源', changePct: 0.015 },
    { name: '招商银行', code: 'SH600036', weight: 3.6, sector: '银行', changePct: 0.004 },
    { name: '微软', code: 'MSFT', weight: 3.2, sector: '科技', changePct: 0.008 },
    { name: '美团', code: 'HK03690', weight: 2.9, sector: '互联网', changePct: 0.021 },
    { name: '比亚迪', code: 'SZ002594', weight: 2.7, sector: '新能源车', changePct: 0.021 },
    { name: '阿里巴巴', code: 'BABA', weight: 2.4, sector: '互联网', changePct: 0.011 },
  ],
}

export function getFundHoldings(code) {
  return fundHoldings[code] || []
}

// 行业分布聚合（从重仓股算）
export function getFundSectorDist(code) {
  const holdings = getFundHoldings(code)
  const map = {}
  holdings.forEach((h) => {
    map[h.sector] = (map[h.sector] || 0) + h.weight
  })
  return Object.entries(map)
    .map(([name, value]) => ({ name, value: +value.toFixed(1) }))
    .sort((a, b) => b.value - a.value)
}
