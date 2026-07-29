// ============================================================
// 东方财富数据层
// - 基金净值：JSONP 直连（跨域可行）
// - 股票K线 / 指数快照：走 Vite dev proxy（/em-push2his / /em-push2）
// 所有函数失败时抛错，由调用方兜底回退 mock
// ============================================================

const SCRIPT_HOST_ALLOWLIST = new Set([
  'api.fund.eastmoney.com',
  'fundsuggest.eastmoney.com',
  'qt.gtimg.cn',
  'stock.finance.sina.com.cn',
])

function assertAllowedScriptURL(url) {
  const parsed = new URL(url, location.origin)
  if (!SCRIPT_HOST_ALLOWLIST.has(parsed.hostname)) {
    throw new Error('blocked script host: ' + parsed.hostname)
  }
}

// ---- 通用 JSONP：用于直连（不经过 proxy）的接口 ----
export function jsonp(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    try { assertAllowedScriptURL(url) } catch (e) { reject(e); return }
    const cb = 'jp_' + Math.random().toString(36).slice(2)
    const script = document.createElement('script')
    let done = false
    const timer = setTimeout(() => {
      if (!done) { done = true; cleanup(); reject(new Error('jsonp timeout')) }
    }, timeout)
    function cleanup() {
      clearTimeout(timer)
      // 保留一个空函数兜底，避免后续到达的响应因回调未定义而抛 ReferenceError
      window[cb] = () => {}
      setTimeout(() => { delete window[cb] }, 5000)
      script.remove()
    }
    window[cb] = (data) => {
      if (done) return
      done = true
      cleanup()
      resolve(data)
    }
    script.onerror = () => {
      if (!done) { done = true; cleanup(); reject(new Error('jsonp script error')) }
    }
    script.src = url.includes('{cb}') ? url.replace('{cb}', cb) : url + (url.includes('?') ? '&' : '?') + 'callback=' + cb
    document.head.appendChild(script)
  })
}

// ---- 通用 fetch（走 proxy，同源）----
// 注意：不能在浏览器侧设置 Referer（禁止头），由 vite proxy 注入
async function getJSON(url, timeout = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const r = await fetch(url, { signal: controller.signal })
    if (!r.ok) throw new Error('http ' + r.status)
    return r.json()
  } finally {
    clearTimeout(timer)
  }
}

// ============================================================
// 基金净值（lsjz）— JSONP 直连
// ============================================================

/**
 * 拉取基金历史净值
 * 注：东财 api.fund.eastmoney.com 校验 Referer，浏览器 JSONP 无法设置 Referer（禁止头），
 * 因此 dev 模式走 vite proxy（/em-fund-api）注入正确 Referer，而非 JSONP 直连。
 * @param {string} code 基金代码
 * @param {number} days 需要的天数（净值条数）
 * @returns {Promise<{date,nav,changePct}[]>} 按日期升序
 */
export async function fetchFundNav(code, days = 252) {
  const collected = []
  const pagesNeeded = Math.ceil(days / 20) // pageSize 上限 20
  let page = 1
  for (; page <= pagesNeeded; page++) {
    const url =
      '/em-fund-api/f10/lsjz?fundCode=' +
      code +
      '&pageIndex=' + page +
      '&pageSize=20&deviceType=ios&version=6.3.0&_=' + Date.now()
    let d
    try {
      d = await getJSON(url)
    } catch (e) {
      // 翻页中断：已有数据就返回，否则抛错
      if (collected.length) break
      throw e
    }
    const list = d?.Data?.LSJZList || []
    if (!list.length) break
    for (const item of list) {
      const nav = parseFloat(item.DWJZ)
      if (!isNaN(nav) && item.FSRQ) {
        collected.push({
          date: item.FSRQ,
          nav,
          changePct: item.JZZZL !== '' && item.JZZZL != null ? parseFloat(item.JZZZL) / 100 : null,
        })
      }
    }
    if (collected.length >= days) break
  }
  if (!collected.length) throw new Error('no nav data for ' + code)
  // lsjz 默认按日期倒序，转成升序并截断
  return collected.slice(0, days).reverse()
}

// ============================================================
// 股票 / 指数 K线（腾讯 ifzq）— JSONP 直连，跨域稳定
// 东财 push2his 对数据中心 IP 反爬严重（ECONNRESET），改用腾讯前复权日K
// ============================================================

/**
 * 拉取日K线（腾讯前复权）
 * @param {string} secid 东财 secid "1.600519" / "0.000858"，内部转腾讯码
 * @param {number} days 近 N 天
 * @returns {Promise<{date,open,close,high,low,volume}[]>}
 */
export async function fetchStockKline(secid, days = 180) {
  const tcode = secidToTencent(secid)
  if (!tcode) throw new Error('invalid secid: ' + secid)
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${tcode},day,,,${days + 20},qfq&_=${Date.now()}`
  const d = await getJSON(url)
  // 数据在 data[code].qfqday（前复权）或 day（不复权，兜底）
  const block = d?.data?.[tcode] || {}
  const rows = block.qfqday || block.day || []
  if (!rows.length) throw new Error('no kline for ' + secid)
  // 格式 [date, open, close, high, low, volume]；NaN 兜底避免污染图表
  const out = []
  for (const r of rows) {
    const num = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0 }
    out.push({ date: r[0], open: num(r[1]), close: num(r[2]), high: num(r[3]), low: num(r[4]), volume: num(r[5]) })
  }
  return out.slice(-days)
}

/**
 * 拉取分时（腾讯 minute/query）
 * @param {string} secid 东财 secid
 * @returns {Promise<{ticks:[], prevClose}>}
 */
export async function fetchIntraday(secid) {
  const tcode = secidToTencent(secid)
  if (!tcode) throw new Error('invalid secid: ' + secid)
  const url = `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${tcode}&_=${Date.now()}`
  const d = await getJSON(url)
  const block = d?.data?.[tcode]
  const data = block?.data
  if (!data || !data.data?.length) throw new Error('no intraday for ' + secid)
  const num = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0 }
  // 腾讯分时格式："0930 1299.00 382 49621800.00" -> 时间/价格/成交量(手)/成交额
  // 注意：源数据无均价列，均价 = 累计成交额 / 累计成交量，需自行计算
  let cumAmt = 0
  let cumVol = 0
  const ticks = data.data.map((s) => {
    const parts = s.split(' ')
    const price = num(parts[1])
    const vol = num(parts[2])
    const amount = num(parts[3])
    cumVol += vol
    cumAmt += amount
    const avg = cumVol > 0 ? cumAmt / cumVol / 100 : price // 成交额单位元，成交量手(100股)
    return { t: parts[0], price, avg, vol }
  })
  // 昨收：腾讯分时接口无 preClose，从 qt 报价串第5位(index 4)取
  const prevClose = num(block?.qt?.[tcode]?.[4]) || (ticks.length ? ticks[0].price : 0)
  return { ticks, prevClose }
}

// 东财 secid -> 腾讯码（支持沪/深/北）
function secidToTencent(secid) {
  if (!secid) return ''
  const [market, code] = secid.split('.')
  if (!code) return ''
  // 东财市场号：1=沪 0=深/北；腾讯前缀：sh/sz/bj
  if (market === '1') return 'sh' + code
  // 北交所代码前缀（830/430/920/87x）-> bj，其余 0. 开头 -> sz
  if (market === '0') {
    if (/^(83|43|87|92)/.test(code)) return 'bj' + code
    return 'sz' + code
  }
  return ''
}

// ============================================================
// 指数 / 个股 实时快照（push2）— 走 proxy
// ============================================================

/**
 * 拉取实时快照（指数/个股）
 * push2 实时接口并发不稳，改用 push2his K线取最后两根 bar 派生快照（稳定）
 * @param {string} secid
 * @returns {Promise<{name,price,change,changePct,open,high,low,prevClose}>}
 */
export async function fetchQuote(secid) {
  const klines = await fetchStockKline(secid, 5)
  if (!klines.length) throw new Error('no quote for ' + secid)
  const last = klines[klines.length - 1]
  const prev = klines[klines.length - 2] || last
  return {
    code: '',
    name: '',
    price: last.close,
    open: last.open,
    high: last.high,
    low: last.low,
    prevClose: prev.close,
    change: +(last.close - prev.close).toFixed(4),
    changePct: +((last.close - prev.close) / prev.close).toFixed(4),
  }
}

// ============================================================
// 基金重仓股（前十大持仓）— 真实数据，script-tag 注入 HTML 解析
// 参考 real-time-fund 仓库：FundArchivesDatas.aspx?type=jjcc
// ============================================================

// 通用 script-tag 加载（返回脚本执行后的副作用，不依赖回调）
function loadScript(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    try { assertAllowedScriptURL(url) } catch (e) { reject(e); return }
    const script = document.createElement('script')
    const timer = setTimeout(() => { cleanup(); reject(new Error('timeout')) }, timeout)
    function cleanup() { clearTimeout(timer); script.remove() }
    script.onerror = () => { cleanup(); reject(new Error('script error')) }
    script.onload = () => { cleanup(); resolve() }
    script.src = url
    document.head.appendChild(script)
  })
}

/**
 * 拉取基金前十大重仓股（真实季报数据）
 * 走 vite proxy（/em-fundf10）同源 fetch，解析 HTML 表格
 * @param {string} code 基金代码
 * @returns {Promise<{name,code,weight,sector}[]>}
 */
export async function fetchFundHoldings(code) {
  const url = `/em-fundf10/FundArchivesDatas.aspx?type=jjcc&code=${code}&topline=10&year=&month=&rt=${Date.now()}`
  const res = await fetch(url)
  const text = await res.text() // 代理已转 UTF-8
  // 响应格式：var apidata={ content:"<html>...", arryear:[...], curyear:... };
  const m = text.match(/content\s*:\s*"([\s\S]*?)"\s*,\s*arryear/i)
  const html = m ? m[1] : ''
  if (!html) throw new Error('no holdings content for ' + code)
  // 反转义
  const htmlUnesc = html.replace(/\\"/g, '"').replace(/\\\//g, '/').replace(/&nbsp;/g, ' ')

  const tbody = htmlUnesc.match(/<tbody[\s\S]*?<\/tbody>/i)
  if (!tbody) throw new Error('no tbody for ' + code)
  const rows = tbody[0].match(/<tr[\s\S]*?<\/tr>/gi) || []
  const holdings = []
  for (const row of rows) {
    const cells = (row.match(/<td[\s\S]*?<\/td>/gi) || []).map((c) =>
      c.replace(/<[^>]+>/g, '').trim()
    )
    // 列序：序号, 代码, 名称, [空...], '变动详情股吧行情', 权重%, 持仓市值...
    if (cells.length >= 3 && cells[1] && cells[2]) {
      const stockCode = cells[1].replace(/[^\w.A-Z]/g, '')
      const name = cells[2]
      // 找权重列（含 % 的那个）
      const weightCell = cells.find((c) => /^\d+(\.\d+)?%$/.test(c))
      const weight = weightCell ? parseFloat(weightCell) : 0
      // 行业：QDII 美股无行业列，用 name 兜底或 '—'
      const sector = cells[cells.length - 1] || '—'
      holdings.push({ code: stockCode, name, weight, sector })
    }
  }
  if (!holdings.length) throw new Error('parse failed for ' + code)
  return holdings
}

// ============================================================
// 基金档案（jbgk 真实信息：类型/规模/经理/费率/成立日期）— 走 proxy
// ============================================================

/**
 * 拉取基金基础档案（真实）— jbgk 页面锚点提取
 * jbgk 无表头文字，字段按位置分布，用正则锚点提取更稳健
 * @param {string} code
 * @returns {Promise<{type,scale,manager,fee,fullName,setupDate}|null>}
 */
export async function fetchFundProfile(code) {
  const res = await fetch(`/em-fundf10/jbgk_${code}.html`)
  const html = await res.text()
  const clean = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
  const flat = (html.match(/<td[\s\S]*?<\/td>/gi) || []).map(clean).filter((t) => t && t.length < 250)
  const text = flat.join('||')

  // 基金类型："基金类型<类型>" 紧跟代码段
  const typeM = text.match(/基金类型([\u4e00-\u9fa5A-Za-z\-]+)/)
  // 规模："XX.XX亿元（截止至：YYYY年MM月DD日）"
  const scaleM = text.match(/([\d,.]+)\s*亿元（截止至[：:]?\s*([\d年月日]+)）/)
  // 管理费："X.XX%（每年）" 出现在 "每份累计" 之后
  const feeM = text.match(/每份累计[\d.元（）次]*\|\|([\d.]+%（每年）)/)
  // 经理：托管银行后、"每份累计"前的人名
  const mgrM = text.match(/([\u4e00-\u9fa5·]{2,8})\|\|每份累计/)
  // 公司：规模段后、托管银行前
  const coM = text.match(/（截止至[：:]?\s*[\d年月日]+）[^|]*\|\|([\u4e00-\u9fa5()（）]{2,12})/)
  // 全称（含"证券投资基金"）
  const nameM = flat.find((t) => /证券投资基金|混合型|指数型/.test(t) && t.length > 10)

  return {
    fullName: nameM || '',
    type: typeM ? typeM[1].trim() : '',
    scale: scaleM ? parseFloat(scaleM[1].replace(/,/g, '')) : null,
    scaleDate: scaleM ? scaleM[2] : '',
    company: coM ? coM[1].trim() : '',
    manager: mgrM ? mgrM[1] : '',
    fee: feeM ? feeM[1].replace('（每年）', '').replace('(每年)', '') : '',
  }
}

// ============================================================
// 腾讯财经实时行情 — script-tag 注入，跨域稳定（参考 real-time-fund）
// https://qt.gtimg.cn/q=sh000001,s_sh600519  → 全局变量 v_xxx
// ============================================================

/**
 * 代码转腾讯格式
 * A股6位：sh/sz/bj + 代码；港股5位：hk + 代码；美股字母：us + 代码
 */
export function toTencentCode(code) {
  if (!code) return ''
  // 仅剥离已知市场字母前缀（SH/SZ/BJ/HK/US），保留纯字母代码（如 AAPL）
  const c = String(code).replace(/^(SH|SZ|BJ|HK|US|sh|sz|bj|hk|us)/i, '')
  // 美股（字母代码，剥前缀后仍非纯数字）
  if (c && !/^\d+$/.test(c)) return 'us' + c.toUpperCase()
  // 指数
  if (c.startsWith('000001') || c.startsWith('000300') || c.startsWith('000016') || c.startsWith('000905')) return 'sh' + c
  if (c.startsWith('399')) return 'sz' + c
  // A股：6/5 沪，8/4 北，其余深
  if (c.startsWith('6') || c.startsWith('5')) return 'sh' + c
  if (c.startsWith('8') || c.startsWith('4') || c.startsWith('920')) return 'bj' + c
  if (c.startsWith('0') || c.startsWith('3')) return 'sz' + c
  // 港股5位
  if (c.length === 5) return 'hk' + c
  return 'sz' + c
}

/**
 * 批量拉取腾讯实时行情
 * @param {string[]} codes 代码数组（任意格式，内部转腾讯码）
 * @returns {Promise<Object>} { [原始code]: {name,price,change,changePct,prevClose} }
 */
export async function fetchTencentQuotes(codes) {
  if (!codes.length) return {}
  const map = codes.map((c) => ({ raw: c, t: toTencentCode(c) }))
  const query = map.map((m) => m.t).join(',')
  const url = `https://qt.gtimg.cn/q=${query}&_t=${Date.now()}`
  await loadScript(url)
  const out = {}
  for (const m of map) {
    const raw = window['v_' + m.t]
    if (!raw) continue
    const p = raw.split('~')
    // [1]=名称 [3]=当前价 [4]=昨收 [31]=涨跌额 [32]=涨跌幅%
    // 美股字段位置略不同，做兼容
    const price = parseFloat(p[3])
    const prevClose = parseFloat(p[4])
    const changePct = p[32] != null ? parseFloat(p[32]) : (p[5] != null ? parseFloat(p[5]) : NaN)
    out[m.raw] = {
      name: p[1] || '',
      price: isNaN(price) ? 0 : price,
      prevClose: isNaN(prevClose) ? 0 : prevClose,
      change: parseFloat(p[31]) || (price - prevClose),
      changePct: isNaN(changePct) ? (prevClose ? (price - prevClose) / prevClose : 0) : changePct / 100,
    }
  }
  return out
}

// ============================================================
// 基金实时估值（新浪财经 JSONP）— 盘中估值
// fundgz.1234567.com.cn 已失效，改用新浪 getEstimateNetworthPic
// QDII 基金盘中无估值，会失败（正常，调用方降级）
// ============================================================

// 稳健剥 JSONP 壳：处理 /*<script>...</script>*/ 反劫持前缀、首尾注释、尾随分号/空白
// 用 indexOf/lastIndexOf 定位第一个 ( 和最后一个 )，避免正则贪婪回溯失败
function unwrapJSONP(text, cbName) {
  if (!text) return null
  // 去掉 /* ... */ 块注释前缀（新浪会返回 /*<script>...</script>*/）
  const cleaned = text.replace(/^[\s\S]*?\*\/\s*/, '').trim()
  // cb(...) 形式：取 cb 后第一个 ( 到末尾最后一个 )
  const start = cleaned.indexOf('(')
  const end = cleaned.lastIndexOf(')')
  if (start < 0 || end <= start) return null
  const body = cleaned.slice(start + 1, end).trim()
  if (!body) return null
  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

/**
 * 拉取基金实时估值（新浪）
 * 注：新浪接口返回 JSONP 包裹 cb({...})，dev 走 proxy fetch 后需手动剥壳。
 * gszzl 为百分数（如 1.23 表示 +1.23%），页面直接 + '%' 展示。
 * @param {string} code 基金代码
 * @returns {Promise<{code,gsz,gszzl,gztime,name}|null>}
 */
export async function fetchFundEstimate(code) {
  const url = `/sina-fund/fundInfo/api/openapi.php/FdFundService.getEstimateNetworthPic?symbol=${code}&callback=cb&_=${Date.now()}`
  let text
  try {
    const res = await fetch(url)
    text = await res.text()
  } catch {
    return null
  }
  const data = unwrapJSONP(text, 'cb')
  const d = data?.result?.data
  if (d && d.worth) {
    // worth_date "20260723" -> "2026-07-23"
    const wd = d.worth_date || ''
    const gztime = wd.length === 8 ? `${wd.slice(0,4)}-${wd.slice(4,6)}-${wd.slice(6,8)}` : wd
    return {
      code,
      gsz: +d.worth,
      gszzl: +((d.worth_rate || 0) * 100).toFixed(2),
      gztime,
      name: d.desc?.text_base || '',
    }
  }
  return null
}

// ============================================================
// 基金搜索（东方财富 FundSearchAPI）— JSONP 直连，全市场基金
// ============================================================

/**
 * 搜索基金（全市场，支持代码/简称/拼音/主题）
 * 注：东财 fundsuggest 校验 Referer，dev 走 proxy fetch 后剥 JSONP 壳。
 * @param {string} keyword 关键词
 * @returns {Promise<{code,name,fullName,type,theme}[]>}
 */
export async function searchFunds(keyword) {
  const k = (keyword || '').trim()
  if (!k) return []
  const url = '/em-fund-suggest/FundSearch/api/FundSearchAPI.ashx?m=1&key=' + encodeURIComponent(k) + '&callback=cb&_=' + Date.now()
  let text
  try {
    const res = await fetch(url)
    text = await res.text()
  } catch {
    return []
  }
  const data = unwrapJSONP(text, 'cb')
  const datas = data?.Datas || []
  // 过滤：只保留基金（CATEGORY=700 或有 FTYPE），排除股票
  return datas
    .filter((it) => /^\d{6}$/.test(it.CODE || it.FCODE || '') && (it.FundBaseInfo?.FTYPE || it.CATEGORY === 700 || it.NAME))
    .map((it) => ({
      code: it.CODE || it.FCODE,
      name: it.SHORTNAME || it.NAME || it.FundName || '',
      fullName: it.NAME || it.SHORTNAME || it.FundName || '',
      type: it.FundBaseInfo?.FTYPE || it.FTYPE || it.FundType || '基金',
      theme: it.FundBaseInfo?.FUNDTYPE || '',
    }))
    .filter((it) => /^\d{6}$/.test(it.code) && it.name)
}

// ---- secid 转换工具 ----
// 输入支持：'SH600519'/'SZ000858'（带前缀）、'600519'（纯代码）、'1.600519'（已是 secid）
// 注意：纯代码无法区分深市 000xxx 个股与沪市 000xxx 指数，必须依赖传入的市场前缀。
export function toSecid(code) {
  if (!code) return ''
  // 已是 secid 格式
  if (/^[0-9]+\.\d+$/.test(code)) return code
  const upper = String(code).toUpperCase()
  // 带市场前缀优先：SH/BJ -> 1.，SZ -> 0.（北交所东财市场号=0，但需特殊处理见下）
  if (/^SH\d/.test(upper)) return '1.' + upper.replace(/^SH/, '')
  if (/^SZ\d/.test(upper)) return '0.' + upper.replace(/^SZ/, '')
  // 纯代码：用代码前缀推断市场
  const pure = code.replace(/^[A-Za-z]+/, '')
  // 深证指数 399xxx
  if (pure.startsWith('399')) return '0.' + pure
  // 上证核心指数（仅这几个 000xxx 是沪市指数，其余 000xxx 都是深市主板个股如 000001平安银行/000002万科/000858五粮液）
  const SH_INDEX_CODES = new Set(['000016', '000300', '000688', '000852', '000905', '950090'])
  if (SH_INDEX_CODES.has(pure)) return '1.' + pure
  // 同花顺概念板块 880xxx -> 90.（东财板块市场号）
  if (pure.startsWith('880')) return '90.' + pure
  // 个股 / ETF：6/5/9（非 920）开头 沪市 1.
  if (pure.startsWith('6') || pure.startsWith('5') || pure.startsWith('9')) {
    if (pure.startsWith('920')) return '0.' + pure // 北交所 920 段
    return '1.' + pure
  }
  // 北交所：8/4 开头 -> 0.（东财北交所市场号为 0）
  if (pure.startsWith('8') || pure.startsWith('4')) return '0.' + pure
  return '0.' + pure
}
