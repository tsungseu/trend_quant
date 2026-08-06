// ============================================================
// 基金池：供"添加自选"搜索用
// 含 4 只已接入基金 + 一批热门基金（代码/名称/类型真实）
// ============================================================

export const fundCatalog = [
  // ---- 4 只已接入（与 funds.js 一致，标 isCore）----
  { code: '019305', name: '摩根标普500指数(QDII)人民币C', short: '标普500', type: '指数·QDII', theme: '美股大盘', isCore: true },
  { code: '017731', name: '嘉实全球产业升级股票发起式(QDII)C', short: '全球产业升级', type: '股票·QDII', theme: '全球高端制造', isCore: true },
  { code: '019018', name: '易方达信息产业混合C', short: '信息产业', type: '混合', theme: 'TMT/信息产业', isCore: true },
  { code: '018230', name: '易方达全球优质企业混合(QDII)C', short: '全球优质企业', type: '混合·QDII', theme: '全球蓝筹', isCore: true },

  // ---- 热门基金（代码/名称真实，用于搜索体验）----
  { code: '110011', name: '易方达优质精选混合', short: '优质精选', type: '混合', theme: '核心精选' },
  { code: '163406', name: '兴全合润混合', short: '兴全合润', type: '混合', theme: '核心精选' },
  { code: '005827', name: '易方达蓝筹精选混合', short: '蓝筹精选', type: '混合', theme: '蓝筹' },
  { code: '270042', name: '广发纳斯达克100ETF联接A', short: '纳斯达克100', type: '指数·QDII', theme: '美股科技' },
  { code: '000834', name: '华夏纳斯达克100ETF联接A', short: '华夏纳指', type: '指数·QDII', theme: '美股科技' },
  { code: '320007', name: '诺安成长混合', short: '诺安成长', type: '混合', theme: '半导体' },
  { code: '161725', name: '招商中证白酒指数', short: '中证白酒', type: '指数', theme: '白酒' },
  { code: '161903', name: '万家行业优选混合', short: '万家行业', type: '混合', theme: '行业轮动' },
  { code: '519674', name: '银河创新成长混合', short: '银河创新', type: '混合', theme: '科技创新' },
  { code: '260108', name: '景顺长城新兴成长混合', short: '新兴成长', type: '混合', theme: '成长' },
  { code: '002340', name: '华夏行业景气混合', short: '行业景气', type: '混合', theme: '行业景气' },
  { code: '001102', name: '前海开源国家比较优势混合', short: '比较优势', type: '混合', theme: '优势制造' },
  { code: '000961', name: '天弘沪深300指数A', short: '沪深300', type: '指数', theme: '宽基' },
  { code: '001180', name: '广发医药卫生联接A', short: '医药卫生', type: '指数', theme: '医药' },
  { code: '012863', name: '景顺长城电子信息产业A', short: '电子信息', type: '股票', theme: '电子' },
]

// 搜索：按 code 或 name 模糊匹配
export function searchFunds(keyword) {
  const k = (keyword || '').trim().toLowerCase()
  if (!k) return fundCatalog.slice(0, 8)
  return fundCatalog.filter(
    (f) =>
      f.code.includes(k) ||
      f.name.toLowerCase().includes(k) ||
      f.short.toLowerCase().includes(k) ||
      f.theme.toLowerCase().includes(k)
  )
}
