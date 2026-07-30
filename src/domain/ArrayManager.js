// ============================================================
// ArrayManager —— 借鉴 vnpy.trader.utility.ArrayManager
// 固定长度滑动窗口时序容器 + 技术指标计算
//
// 设计差异（相对 vnpy）：
// 1. vnpy 用 numpy 数组 + TA-Lib；这里用纯 JS 数组，零依赖，前端可直接跑。
// 2. vnpy 内部存 open/high/low/close/volume/turnover/open_interest；
//    这里精简为 ohlcv（turnover/open_interest 在本项目无用到）。
// 3. vnpy 的 push 用 `arr[:-1] = arr[1:]` 实现左移；
//    这里用环形 buffer 索引 + count 计数，避免每 tick O(n) 拷贝。
// 4. 增加 inited / count / length 等查询，支持「窗口未填满」时的安全降级。
// ============================================================

export class ArrayManager {
  /**
   * @param {number} size 窗口容量（默认 100）
   */
  constructor(size = 100) {
    this.size = size
    this.count = 0
    this.inited = false
    this._head = 0 // 环形 buffer 当前最新位置
    this.open = new Array(size).fill(NaN)
    this.high = new Array(size).fill(NaN)
    this.low = new Array(size).fill(NaN)
    this.close = new Array(size).fill(NaN)
    this.volume = new Array(size).fill(NaN)
  }

  /**
   * 推入一根 K 线（BarData 形态：{open,high,low,close,volume}）
   * 与 vnpy 一致：count 达到 size 后标记 inited。
   */
  updateBar(bar) {
    const i = this._head
    this.open[i] = num(bar.open)
    this.high[i] = num(bar.high)
    this.low[i] = num(bar.low)
    this.close[i] = num(bar.close)
    this.volume[i] = num(bar.volume)
    this._head = (i + 1) % this.size
    this.count += 1
    if (!this.inited && this.count >= this.size) this.inited = true
    return this
  }

  /** 推入一个收盘价序列（便捷批量初始化） */
  updateBars(bars) {
    for (const b of bars) this.updateBar(b)
    return this
  }

  /** 按时间顺序返回窗口内有效数据（oldest → newest），最多 size 个 */
  _series(arr) {
    const n = Math.min(this.count, this.size)
    const out = []
    for (let k = 0; k < n; k++) {
      const idx = (this._head - n + k + this.size * 2) % this.size
      out.push(arr[idx])
    }
    return out
  }

  get opens() { return this._series(this.open) }
  get highs() { return this._series(this.high) }
  get lows() { return this._series(this.low) }
  get closes() { return this._series(this.close) }
  get volumes() { return this._series(this.volume) }

  // ---- 基础统计 ----
  /** 窗口内最高价 */
  highest(n = this.size) {
    const h = this.highs.slice(-n)
    return Math.max(...h)
  }
  /** 窗口内最低价 */
  lowest(n = this.size) {
    const l = this.lows.slice(-n)
    return Math.min(...l)
  }
  /** 窗口内收盘价均值 */
  mean(n = this.size) {
    const c = this.closes.slice(-n)
    return c.reduce((s, v) => s + v, 0) / c.length
  }

  // ---- 技术指标（对齐 vnpy 命名，但返回 JS 数组 / 数值）----
  /** 简单移动平均；array=false 返回最新值，true 返回整段序列（前 n-1 位为 NaN） */
  sma(n, array = false) {
    const c = this.closes
    const out = []
    let sum = 0
    for (let i = 0; i < c.length; i++) {
      sum += c[i]
      if (i >= n) sum -= c[i - n]
      if (i >= n - 1) out.push(sum / n)
      else if (array) out.push(NaN)
    }
    return array ? out : (out.length ? out[out.length - 1] : NaN)
  }

  /** 指数移动平均（与 vnpy EMA 同公式：k=2/(n+1)） */
  ema(n, array = false) {
    const c = this.closes
    const k = 2 / (n + 1)
    const out = []
    let prev = NaN
    for (let i = 0; i < c.length; i++) {
      prev = i === 0 ? c[i] : c[i] * k + prev * (1 - k)
      out.push(prev)
    }
    if (array) return out
    return out.length ? out[out.length - 1] : NaN
  }

  /** 标准差（总体标准差，nbdev 默认 1） */
  std(n, nbdev = 1, array = false) {
    const c = this.closes
    const out = []
    for (let i = 0; i < c.length; i++) {
      if (i < n - 1) {
        if (array) out.push(NaN)
        continue
      }
      const slice = c.slice(i - n + 1, i + 1)
      const m = slice.reduce((s, v) => s + v, 0) / n
      const variance = slice.reduce((s, v) => s + (v - m) ** 2, 0) / n
      out.push(Math.sqrt(variance) * nbdev)
    }
    return array ? out : (out.length ? out[out.length - 1] : NaN)
  }

  /** 布林带（返回 {mid, upper, lower} 整段序列） */
  bollinger(n = 20, k = 2) {
    const mid = this.sma(n, true)
    const sd = this.std(n, 1, true)
    const upper = mid.map((m, i) => (isNaN(m) ? NaN : m + k * sd[i]))
    const lower = mid.map((m, i) => (isNaN(m) ? NaN : m - k * sd[i]))
    return { mid, upper, lower }
  }

  /** RSI（默认 14） */
  rsi(n = 14) {
    const c = this.closes
    if (c.length < 2) return NaN
    let avgGain = 0
    let avgLoss = 0
    for (let i = 1; i < c.length; i++) {
      const change = c[i] - c[i - 1]
      const gain = change > 0 ? change : 0
      const loss = change < 0 ? -change : 0
      if (i <= n) {
        avgGain = (avgGain * (i - 1) + gain) / i
        avgLoss = (avgLoss * (i - 1) + loss) / i
      } else {
        avgGain = (avgGain * (n - 1) + gain) / n
        avgLoss = (avgLoss * (n - 1) + loss) / n
      }
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    return 100 - 100 / (1 + rs)
  }

  /** MACD（返回 {dif, dea, hist} 整段序列） */
  macd(fast = 12, slow = 26, signal = 9) {
    const c = this.closes
    const emaFast = this.ema(fast, true)
    const emaSlow = this.ema(slow, true)
    const dif = c.map((_, i) => emaFast[i] - emaSlow[i])
    // DEA = EMA(dif, signal)
    const k = 2 / (signal + 1)
    const dea = []
    let prev = NaN
    for (let i = 0; i < dif.length; i++) {
      prev = i === 0 ? dif[i] : dif[i] * k + prev * (1 - k)
      dea.push(prev)
    }
    const hist = dif.map((d, i) => (d - dea[i]) * 2)
    return { dif, dea, hist }
  }

  /** ATR（真实波幅，基于 high/low/close） */
  atr(n = 14) {
    const h = this.highs
    const l = this.lows
    const c = this.closes
    const tr = []
    for (let i = 1; i < c.length; i++) {
      const prevClose = c[i - 1]
      tr.push(Math.max(h[i] - l[i], Math.abs(h[i] - prevClose), Math.abs(l[i] - prevClose)))
    }
    if (tr.length < n) return NaN
    let sum = 0
    for (let i = 0; i < n; i++) sum += tr[i]
    let atr = sum / n
    for (let i = n; i < tr.length; i++) {
      atr = (atr * (n - 1) + tr[i]) / n
    }
    return atr
  }
}

function num(v) {
  const x = Number(v)
  return Number.isFinite(x) ? x : NaN
}

export default ArrayManager
