<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { makeRng, round, rand } from '@/mock/_helpers'
import { useThemeStore } from '@/stores/theme'
import { chartTheme, fmtPct, sign, fmtMoney } from '@/mock/_helpers'
import EChart from '@/components/EChart.vue'

const theme = useThemeStore()
const ct = () => (void theme.theme, chartTheme())

// ---- 编辑器状态 ----
const config = ref({
  strategy: 'ma', // ma / grid / momentum / factor
  symbol: 'SH510300',
  symbolName: '沪深300ETF',
  period: '1Y',
  benchmark: '沪深300',
  initialCapital: 100000,
  // 择时参数
  fastMA: 5,
  slowMA: 20,
  // 风控参数
  stopLoss: 5,
  takeProfit: 30,
  positionSize: 80, // %
  // 滑点手续费
  commission: 0.03, // %
  slippage: 0.05, // %
})

const strategyOptions = [
  { value: 'ma', label: '双均线择时', desc: '快线上穿慢线买入，下穿卖出' },
  { value: 'grid', label: '网格交易', desc: '区间内低买高卖捕获震荡' },
  { value: 'momentum', label: '动量轮动', desc: '持有强势标的，定期调仓' },
  { value: 'factor', label: '多因子选股', desc: '综合因子打分选股' },
]
const symbolOptions = [
  { code: 'SH510300', name: '沪深300ETF' },
  { code: 'SH510050', name: '上证50ETF' },
  { code: 'SZ159915', name: '创业板ETF' },
  { code: 'SH512880', name: '证券ETF' },
]
const periodOptions = [
  { value: '6M', label: '近半年', days: 126 },
  { value: '1Y', label: '近一年', days: 252 },
  { value: '3Y', label: '近三年', days: 756 },
]

// ---- 回测状态 ----
const status = ref('idle') // idle | running | done
const progress = ref(0)
let runTimer = null

function clearRunTimer() {
  if (runTimer) {
    clearInterval(runTimer)
    runTimer = null
  }
}

const result = ref(null)

// ---- 运行回测（模拟计算）----
function runBacktest() {
  if (status.value === 'running') return
  status.value = 'running'
  progress.value = 0
  result.value = null

  const cfg = config.value
  const days = periodOptions.find((p) => p.value === cfg.period)?.days || 252

  // 进度模拟
  clearRunTimer()
  runTimer = setInterval(() => {
    progress.value += Math.random() * 18 + 8
    if (progress.value >= 100) {
      progress.value = 100
      clearRunTimer()
      result.value = generateResult(cfg, days)
      status.value = 'done'
    }
  }, 180)
}

// 离开页面时清理 interval，避免内存泄漏与后台仍在跑
onUnmounted(clearRunTimer)

// 基于参数生成回测结果（参数影响结果，体现"编辑即生效"）
function generateResult(cfg, days) {
  const seed = (cfg.fastMA * 7 + cfg.slowMA * 13 + cfg.stopLoss * 3 + cfg.positionSize + cfg.strategy.charCodeAt(0)) % 9999
  const r = makeRng(seed + 1)

  let stratVal = 1
  let benchVal = 1
  let peak = 1
  let maxDD = 0
  const equity = []
  const drawdown = []
  const trades = []

  // 参数影响收益：快慢线越接近信号越频繁；止损越小回撤越小但收益也低
  const driftBonus = (cfg.strategy === 'momentum' ? 0.0006 : 0) + (cfg.strategy === 'factor' ? 0.0008 : 0)
  const stopLossEffect = cfg.stopLoss >= 8 ? 0.0003 : 0
  const baseDrift = 0.0008 + driftBonus + stopLossEffect

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date('2026-07-21')
    d.setDate(d.getDate() - i)
    const stratShock = (r() - 0.47) * 2
    const benchShock = (r() - 0.49) * 2
    stratVal *= 1 + baseDrift + 0.011 * stratShock
    benchVal *= 1 + 0.0003 + 0.0095 * benchShock
    peak = Math.max(peak, stratVal)
    const dd = (stratVal - peak) / peak
    maxDD = Math.min(maxDD, dd)
    equity.push({
      date: d.toISOString().slice(0, 10),
      strategy: round(stratVal, 4),
      benchmark: round(benchVal, 4),
    })
    drawdown.push({ date: d.toISOString().slice(0, 10), value: round(dd, 4) })

    // 生成交易记录（采样）
    if (r() > 0.93) {
      const isBuy = r() > 0.45
      trades.push({
        date: d.toISOString().slice(0, 10),
        action: isBuy ? '买入' : '卖出',
        price: round(rand(r, 3, 220), 2),
        qty: Math.round(rand(r, 100, 5000) / 100) * 100,
        reason: isBuy ? (cfg.strategy === 'ma' ? '金叉买入' : '信号触发') : (cfg.strategy === 'ma' ? '死叉卖出' : '止盈止损'),
      })
    }
  }

  const finalStrat = stratVal
  const finalBench = benchVal
  const years = days / 252
  const annRet = Math.pow(finalStrat, 1 / years) - 1
  const benchRet = Math.pow(finalBench, 1 / years) - 1

  return {
    equity,
    drawdown,
    trades: trades.slice(-20).reverse(),
    metrics: {
      总收益: round((finalStrat - 1) * 100, 2) + '%',
      年化收益: round(annRet * 100, 2) + '%',
      基准年化: round(benchRet * 100, 2) + '%',
      超额收益: round((annRet - benchRet) * 100, 2) + '%',
      最大回撤: round(maxDD * 100, 2) + '%',
      夏普比率: round(0.9 + annRet * 2.5 + (8 - cfg.stopLoss) * 0.05, 2),
      索提诺: round(1.3 + annRet * 3, 2),
      胜率: round(0.55 + r() * 0.12, 4),
      交易次数: trades.length,
      卡玛比率: round((annRet / Math.abs(maxDD)) , 2),
    },
  }
}

// ---- 图表 ----
const equityOption = computed(() => {
  if (!result.value) return {}
  const t = ct()
  const e = result.value.equity
  return {
    legend: { top: 0, right: 10, textStyle: { color: t.secondary }, icon: 'roundRect', itemWidth: 14, itemHeight: 3, data: ['策略净值', '基准净值'] },
    grid: { left: 16, right: 50, top: 36, bottom: 24, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: e.map((d) => d.date), axisLine: { lineStyle: { color: t.axis } }, axisLabel: { color: t.label, fontSize: 11 }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { color: t.label, fontSize: 11, formatter: (v) => v.toFixed(2) }, splitLine: { lineStyle: { color: t.split } } },
    tooltip: { trigger: 'axis' },
    series: [
      { name: '策略净值', type: 'line', data: e.map((d) => d.strategy), smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#3b82f6' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.28)' }, { offset: 1, color: 'rgba(59,130,246,0)' }] } } },
      { name: '基准净值', type: 'line', data: e.map((d) => d.benchmark), smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: t.secondary, type: 'dashed' } },
    ],
  }
})

const ddOption = computed(() => {
  if (!result.value) return {}
  const t = ct()
  const d = result.value.drawdown
  return {
    grid: { left: 16, right: 50, top: 20, bottom: 24, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: d.map((x) => x.date), axisLine: { lineStyle: { color: t.axis } }, axisLabel: { color: t.label, fontSize: 11 }, axisTick: { show: false } },
    yAxis: { type: 'value', max: 0, axisLabel: { color: t.label, fontSize: 11, formatter: (v) => (v * 100).toFixed(0) + '%' }, splitLine: { lineStyle: { color: t.split } } },
    tooltip: { trigger: 'axis', formatter: (p) => `${p[0].axisValue}<br/>回撤：<b style="color:#ef4444">${(p[0].value * 100).toFixed(2)}%</b>` },
    series: [{ type: 'line', data: d.map((x) => x.value), symbol: 'none', lineStyle: { width: 1.5, color: '#ef4444' }, areaStyle: { color: 'rgba(239,68,68,0.18)' } }],
  }
})

const metricList = computed(() => {
  if (!result.value) return []
  const m = result.value.metrics
  return [
    { k: '年化收益', v: m['年化收益'], tone: 'up' },
    { k: '基准年化', v: m['基准年化'], tone: 'flat' },
    { k: '超额收益', v: m['超额收益'], tone: 'up' },
    { k: '最大回撤', v: m['最大回撤'], tone: 'down' },
    { k: '夏普比率', v: m['夏普比率'], tone: 'flat' },
    { k: '索提诺', v: m['索提诺'], tone: 'flat' },
    { k: '卡玛比率', v: m['卡玛比率'], tone: 'flat' },
    { k: '胜率', v: (m['胜率'] * 100).toFixed(1) + '%', tone: 'up' },
    { k: '交易次数', v: m['交易次数'], tone: 'flat' },
  ]
})
</script>

<template>
  <div class="backtest">
    <!-- 左：策略编辑器 -->
    <aside class="panel editor">
      <div class="panel-title"><h3>🧪 策略编辑器</h3></div>
      <div class="form">
        <div class="field">
          <label>策略类型</label>
          <div class="strategy-grid">
            <button
              v-for="s in strategyOptions"
              :key="s.value"
              class="strategy-opt"
              :class="{ active: config.strategy === s.value }"
              @click="config.strategy = s.value"
            >
              <div class="so-name">{{ s.label }}</div>
              <div class="so-desc">{{ s.desc }}</div>
            </button>
          </div>
        </div>

        <div class="field">
          <label>回测标的</label>
          <select v-model="config.symbol" @change="config.symbolName = symbolOptions.find(s=>s.code===config.symbol)?.name">
            <option v-for="s in symbolOptions" :key="s.code" :value="s.code">{{ s.name }}</option>
          </select>
        </div>

        <div class="field">
          <label>回测周期</label>
          <div class="seg seg-full">
            <button v-for="p in periodOptions" :key="p.value" :class="{ active: config.period === p.value }" @click="config.period = p.value">{{ p.label }}</button>
          </div>
        </div>

        <div class="divider">择时参数</div>

        <div class="slider-field">
          <div class="sf-head">
            <label>快线周期</label>
            <span class="sf-val num">{{ config.fastMA }}</span>
          </div>
          <input type="range" v-model.number="config.fastMA" min="3" max="30" />
        </div>
        <div class="slider-field">
          <div class="sf-head">
            <label>慢线周期</label>
            <span class="sf-val num">{{ config.slowMA }}</span>
          </div>
          <input type="range" v-model.number="config.slowMA" min="10" max="60" />
        </div>

        <div class="divider">风控参数</div>

        <div class="slider-field">
          <div class="sf-head">
            <label>止损线 (%)</label>
            <span class="sf-val num down">-{{ config.stopLoss }}%</span>
          </div>
          <input type="range" v-model.number="config.stopLoss" min="1" max="20" />
        </div>
        <div class="slider-field">
          <div class="sf-head">
            <label>止盈线 (%)</label>
            <span class="sf-val num up">+{{ config.takeProfit }}%</span>
          </div>
          <input type="range" v-model.number="config.takeProfit" min="5" max="80" />
        </div>
        <div class="slider-field">
          <div class="sf-head">
            <label>仓位比例 (%)</label>
            <span class="sf-val num brand">{{ config.positionSize }}%</span>
          </div>
          <input type="range" v-model.number="config.positionSize" min="20" max="100" />
        </div>

        <div class="divider">成本设置</div>
        <div class="field-row">
          <div class="field">
            <label>手续费 (%)</label>
            <input type="number" v-model.number="config.commission" step="0.01" />
          </div>
          <div class="field">
            <label>滑点 (%)</label>
            <input type="number" v-model.number="config.slippage" step="0.01" />
          </div>
        </div>

        <button class="run-btn" :disabled="status === 'running'" @click="runBacktest">
          <span v-if="status === 'running'" class="spinner"></span>
          {{ status === 'running' ? '回测中…' : '▶ 运行回测' }}
        </button>
      </div>
    </aside>

    <!-- 右：结果区 -->
    <section class="result-area">
      <!-- 空状态 -->
      <div v-if="status === 'idle'" class="empty panel">
        <div class="empty-icon">📈</div>
        <h3>配置策略并运行回测</h3>
        <p>在左侧编辑策略参数，点击"运行回测"查看历史表现、收益曲线与风险指标。</p>
      </div>

      <!-- 运行中 -->
      <div v-else-if="status === 'running'" class="empty panel">
        <div class="empty-icon spin">⚙️</div>
        <h3>正在回测…</h3>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <p class="muted">{{ Math.floor(progress) }}% · 模拟撮合 {{ Math.floor(progress * 12) }} 根K线</p>
      </div>

      <!-- 结果 -->
      <template v-else>
        <!-- 指标条 -->
        <section class="metrics-bar panel">
          <div v-for="m in metricList" :key="m.k" class="mb-item">
            <div class="mb-k">{{ m.k }}</div>
            <div class="mb-v num" :class="m.tone">{{ m.v }}</div>
          </div>
        </section>

        <!-- 净值曲线 -->
        <section class="panel">
          <div class="panel-title">
            <h3>净值曲线</h3>
            <span class="sub">策略 vs {{ config.benchmark }} · {{ config.symbolName }}</span>
          </div>
          <EChart :option="equityOption" height="340px" />
        </section>

        <div class="row">
          <!-- 回撤 -->
          <div class="panel">
            <div class="panel-title"><h3>回撤曲线</h3><span class="sub">最大回撤 {{ result.metrics['最大回撤'] }}</span></div>
            <EChart :option="ddOption" height="260px" />
          </div>

          <!-- 交易明细 -->
          <div class="panel">
            <div class="panel-title"><h3>交易明细</h3><span class="sub">最近 {{ result.trades.length }} 笔</span></div>
            <table class="trade-table">
              <thead>
                <tr><th>日期</th><th>方向</th><th class="r">价格</th><th class="r">数量</th><th>原因</th></tr>
              </thead>
              <tbody>
                <tr v-for="(t, i) in result.trades" :key="i">
                  <td class="dim">{{ t.date }}</td>
                  <td><span class="act" :class="t.action === '买入' ? 'buy' : 'sell'">{{ t.action }}</span></td>
                  <td class="r num">{{ t.price }}</td>
                  <td class="r num">{{ t.qty.toLocaleString() }}</td>
                  <td class="dim">{{ t.reason }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.backtest {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: $space-5;
  min-height: calc(100vh - var(--topbar-h) - 48px);
}

/* 编辑器 */
.editor {
  display: flex;
  flex-direction: column;
  height: fit-content;
  position: sticky;
  top: 0;
}
.form {
  padding: $space-4 $space-5;
  display: flex;
  flex-direction: column;
  gap: $space-4;
  max-height: 70vh;
  overflow-y: auto;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  label {
    font-size: 12px;
    color: $text-secondary;
  }
  select, input[type="number"] {
    height: 36px;
    padding: 0 $space-3;
    background: $bg-panel-2;
    border: 1px solid $border-subtle;
    border-radius: $radius-md;
    color: $text-primary;
    font-size: 13px;
    outline: none;
    &:focus { border-color: $brand; }
  }
}
.field-row {
  display: flex;
  gap: $space-3;
  .field { flex: 1; }
}

.strategy-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-2;
}
.strategy-opt {
  text-align: left;
  padding: $space-3;
  background: $bg-panel-2;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  cursor: pointer;
  transition: $transition-fast;
  .so-name { font-size: 12px; font-weight: 600; color: $text-primary; }
  .so-desc { font-size: 10px; color: $text-tertiary; margin-top: 2px; line-height: 1.3; }
  &:hover { border-color: $border-default; }
  &.active {
    border-color: $brand;
    background: $brand-soft;
    .so-name { color: $brand; }
  }
}

.divider {
  font-size: 11px;
  color: $text-tertiary;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-top: $space-2;
  border-top: 1px solid $border-subtle;
  margin-top: $space-1;
}

.slider-field {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}
.sf-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  label { font-size: 12px; color: $text-secondary; }
  .sf-val { font-size: 14px; font-weight: 700; }
}
input[type="range"] {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  background: $bg-elevated;
  border-radius: 2px;
  outline: none;
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background: $brand;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid $bg-panel;
    box-shadow: 0 0 0 1px $brand;
  }
}

.seg-full {
  display: flex;
  width: 100%;
  button { flex: 1; }
}

.run-btn {
  margin-top: $space-2;
  height: 44px;
  background: linear-gradient(135deg, $brand, $purple);
  color: #fff;
  border-radius: $radius-md;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  transition: $transition-fast;
  &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(59,130,246,0.4); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}
.spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 结果区 */
.result-area {
  display: flex;
  flex-direction: column;
  gap: $space-5;
}
.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $space-10;
  text-align: center;
  min-height: 400px;
  .empty-icon {
    font-size: 56px;
    margin-bottom: $space-4;
    &.spin { animation: spin 2s linear infinite; }
  }
  h3 { font-size: 18px; margin-bottom: $space-2; }
  p { color: $text-secondary; max-width: 360px; }
}
.progress-bar {
  width: 280px;
  height: 6px;
  background: $bg-panel-2;
  border-radius: 999px;
  overflow: hidden;
  margin: $space-4 0;
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, $brand, $purple);
    border-radius: 999px;
    transition: width 0.2s;
  }
}

.metrics-bar {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 1px;
  background: $border-subtle;
  padding: 1px;
}
.mb-item {
  background: $bg-panel;
  padding: $space-4 $space-3;
  text-align: center;
  .mb-k { font-size: 11px; color: $text-tertiary; margin-bottom: 4px; }
  .mb-v {
    font-size: 17px;
    font-weight: 700;
    &.up { color: $up; }
    &.down { color: $down; }
  }
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-5;
}

.trade-table {
  width: 100%;
  border-collapse: collapse;
  th, td {
    padding: $space-2 $space-4;
    font-size: 12px;
    border-bottom: 1px solid $border-subtle;
    white-space: nowrap;
  }
  th { color: $text-tertiary; font-weight: 500; font-size: 10px; background: $bg-panel-2; }
  th.r, td.r { text-align: right; }
  .dim { color: $text-tertiary; }
  tbody tr:hover { background: $bg-panel-2; }
}
.act {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  &.buy { color: $up; background: $up-bg; }
  &.sell { color: $down; background: $down-bg; }
}
</style>
