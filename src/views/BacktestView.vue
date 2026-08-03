<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useLlmStore } from '@/stores/llm'
import { chartTheme } from '@/mock/_helpers'
import { fetchStockKline } from '@/api/dataClient'
import { streamChat } from '@/api/llm'
import {
  runStrategyBacktest,
  normalizeBars,
  resolveKlineCode,
  buildAiPrompt,
  fallbackAiComment,
} from '@/domain/backtest'
import { createThinkStripper } from '@/utils/stripThink'
import EChart from '@/components/EChart.vue'
import MiniMarkdown from '@/components/MiniMarkdown.vue'

const theme = useThemeStore()
const llmStore = useLlmStore()
const ct = () => (void theme.theme, chartTheme())

const config = ref({
  strategy: 'ma',
  symbol: 'SH510300',
  symbolName: '沪深300ETF',
  period: '1Y',
  benchmark: '买入持有',
  initialCapital: 100000,
  fastMA: 5,
  slowMA: 20,
  stopLoss: 5,
  takeProfit: 30,
  positionSize: 80,
  commission: 0.03,
  slippage: 0.05,
})

const strategyOptions = [
  { value: 'ma', label: '双均线择时', desc: '快线上穿慢线买入，下穿卖出' },
  { value: 'grid', label: '网格交易', desc: '相对均线低吸高抛' },
  { value: 'momentum', label: '动量轮动', desc: '价格动量转强时持有' },
  { value: 'factor', label: '多因子', desc: '均线交叉 + RSI 过滤' },
]

const symbolOptions = [
  { code: 'SH510300', name: '沪深300ETF', market: 'CN' },
  { code: 'SH510050', name: '上证50ETF', market: 'CN' },
  { code: 'SZ159915', name: '创业板ETF', market: 'CN' },
  { code: 'SH512880', name: '证券ETF', market: 'CN' },
  { code: 'usNDX', name: '纳斯达克100', market: 'US' },
  { code: 'usINX', name: '标普500', market: 'US' },
]

const periodOptions = [
  { value: '6M', label: '近半年', days: 126 },
  { value: '1Y', label: '近一年', days: 252 },
  { value: '3Y', label: '近三年', days: 756 },
]

const status = ref('idle') // idle | running | done | error
const progress = ref(0)
const progressLabel = ref('')
const runError = ref('')
const result = ref(null)
const aiComment = ref('')
const aiStatus = ref('idle') // idle | streaming | done | fallback
let abortCtrl = null
let cancelled = false

function onSymbolChange() {
  const s = symbolOptions.find((x) => x.code === config.value.symbol)
  config.value.symbolName = s?.name || config.value.symbol
}

async function runBacktest() {
  if (status.value === 'running') return
  cancelled = false
  status.value = 'running'
  progress.value = 8
  progressLabel.value = '拉取真实行情…'
  result.value = null
  runError.value = ''
  aiComment.value = ''
  aiStatus.value = 'idle'
  if (abortCtrl) abortCtrl.abort()
  abortCtrl = null

  const cfg = { ...config.value }
  const days = periodOptions.find((p) => p.value === cfg.period)?.days || 252
  const klineCode = resolveKlineCode(cfg.symbol)

  try {
    progress.value = 25
    const klineState = await fetchStockKline(klineCode, days + 40)
    if (cancelled) return
    progress.value = 55
    progressLabel.value = '计算策略净值…'

    const bars = normalizeBars(klineState)
    const bt = runStrategyBacktest(bars, cfg)
    if (cancelled) return

    result.value = {
      ...bt,
      meta: {
        bars: bars.length,
        source: klineState?.source || 'market',
        quality: klineState?.quality || 'eod',
        asOf: klineState?.asOf || bars[bars.length - 1]?.date || '',
        symbol: cfg.symbol,
        symbolName: cfg.symbolName,
      },
    }
    progress.value = 85
    progressLabel.value = '生成 AI 解读…'
    status.value = 'done'
    progress.value = 100

    await generateAiComment(cfg, bt.metrics, bars.length, result.value.meta.source)
  } catch (e) {
    if (cancelled) return
    console.warn('[backtest]', e)
    runError.value = e?.message || '回测失败'
    status.value = 'error'
    progress.value = 0
  }
}

async function generateAiComment(cfg, metrics, barsCount, dataSource) {
  const payload = {
    config: cfg,
    metrics,
    symbolName: cfg.symbolName,
    barsCount,
    dataSource,
  }

  if (!llmStore.configComplete) {
    aiComment.value = fallbackAiComment(payload)
    aiStatus.value = 'fallback'
    return
  }

  const provider = llmStore.activeProvider
  aiStatus.value = 'streaming'
  aiComment.value = ''
  abortCtrl = new AbortController()
  const stripper = createThinkStripper()
  try {
    await streamChat(
      { ...provider, model: provider.model },
      [
        {
          role: 'system',
          content:
            '你是趋势量化的回测分析助手。只做历史回测解读与研究提示，输出简洁中文 Markdown，必须声明不构成投资建议。不要输出思考过程标签。',
        },
        { role: 'user', content: buildAiPrompt(payload) },
      ],
      (t) => {
        aiComment.value += stripper.push(t)
      },
      { signal: abortCtrl.signal }
    )
    if (!aiComment.value.trim()) aiComment.value = fallbackAiComment(payload)
    aiStatus.value = 'done'
  } catch (e) {
    console.warn('[backtest] ai failed:', e?.message)
    aiComment.value = fallbackAiComment(payload)
    aiStatus.value = 'fallback'
  }
}

onUnmounted(() => {
  cancelled = true
  if (abortCtrl) abortCtrl.abort()
})

const equityOption = computed(() => {
  if (!result.value) return {}
  const t = ct()
  const e = result.value.equity
  return {
    legend: { top: 0, right: 10, textStyle: { color: t.secondary }, icon: 'roundRect', itemWidth: 14, itemHeight: 3, data: ['策略净值', '买入持有'] },
    grid: { left: 16, right: 50, top: 36, bottom: 24, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: e.map((d) => d.date), axisLine: { lineStyle: { color: t.axis } }, axisLabel: { color: t.label, fontSize: 11 }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { color: t.label, fontSize: 11, formatter: (v) => v.toFixed(2) }, splitLine: { lineStyle: { color: t.split } } },
    tooltip: { trigger: 'axis' },
    series: [
      { name: '策略净值', type: 'line', data: e.map((d) => d.strategy), smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#3b82f6' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.28)' }, { offset: 1, color: 'rgba(59,130,246,0)' }] } } },
      { name: '买入持有', type: 'line', data: e.map((d) => d.benchmark), smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: t.secondary, type: 'dashed' } },
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
    <aside class="panel editor">
      <div class="panel-title"><h3>策略编辑器</h3></div>
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
          <select v-model="config.symbol" @change="onSymbolChange">
            <optgroup label="A股 ETF">
              <option v-for="s in symbolOptions.filter(x => x.market === 'CN')" :key="s.code" :value="s.code">{{ s.name }}</option>
            </optgroup>
            <optgroup label="海外指数">
              <option v-for="s in symbolOptions.filter(x => x.market === 'US')" :key="s.code" :value="s.code">{{ s.name }}</option>
            </optgroup>
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
          <div class="sf-head"><label>快线周期</label><span class="sf-val num">{{ config.fastMA }}</span></div>
          <input type="range" v-model.number="config.fastMA" min="3" max="30" />
        </div>
        <div class="slider-field">
          <div class="sf-head"><label>慢线周期</label><span class="sf-val num">{{ config.slowMA }}</span></div>
          <input type="range" v-model.number="config.slowMA" min="10" max="60" />
        </div>

        <div class="divider">风控参数</div>
        <div class="slider-field">
          <div class="sf-head"><label>止损线 (%)</label><span class="sf-val num down">-{{ config.stopLoss }}%</span></div>
          <input type="range" v-model.number="config.stopLoss" min="1" max="20" />
        </div>
        <div class="slider-field">
          <div class="sf-head"><label>止盈线 (%)</label><span class="sf-val num up">+{{ config.takeProfit }}%</span></div>
          <input type="range" v-model.number="config.takeProfit" min="5" max="80" />
        </div>
        <div class="slider-field">
          <div class="sf-head"><label>仓位比例 (%)</label><span class="sf-val num brand">{{ config.positionSize }}%</span></div>
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
        <p class="hint">使用真实日K；海外指数走 Yahoo 代理。AI 解读依赖设置页已配置的模型。</p>
      </div>
    </aside>

    <section class="result-area">
      <div v-if="status === 'idle'" class="empty panel">
        <div class="empty-icon">📈</div>
        <h3>配置策略并运行回测</h3>
        <p>基于真实日K撮合双均线/动量/网格等策略，并可用 AI 解读结果。标的含 A 股 ETF 与纳斯达克100、标普500。</p>
      </div>

      <div v-else-if="status === 'running'" class="empty panel">
        <div class="empty-icon spin">⚙️</div>
        <h3>正在回测…</h3>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <p class="muted">{{ Math.floor(progress) }}% · {{ progressLabel }}</p>
      </div>

      <div v-else-if="status === 'error'" class="empty panel">
        <div class="empty-icon">⚠️</div>
        <h3>回测失败</h3>
        <p>{{ runError }}</p>
        <button class="retry" @click="runBacktest">重试</button>
      </div>

      <template v-else>
        <section class="metrics-bar panel">
          <div v-for="m in metricList" :key="m.k" class="mb-item">
            <div class="mb-k">{{ m.k }}</div>
            <div class="mb-v num" :class="m.tone">{{ m.v }}</div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-title">
            <h3>净值曲线</h3>
            <span class="sub">
              策略 vs 买入持有 · {{ config.symbolName }}
              <template v-if="result?.meta"> · {{ result.meta.bars }}根K · {{ result.meta.source }}</template>
            </span>
          </div>
          <EChart :option="equityOption" height="340px" />
        </section>

        <section class="panel ai-panel">
          <div class="panel-title">
            <h3>AI 解读</h3>
            <span class="sub">
              <template v-if="aiStatus === 'streaming'">生成中…</template>
              <template v-else-if="aiStatus === 'fallback'">本地摘要（未配置完整模型）</template>
              <template v-else>模型分析</template>
            </span>
          </div>
          <div class="ai-body">
            <MiniMarkdown v-if="aiComment" :content="aiComment" />
            <p v-else class="muted">等待解读…</p>
          </div>
        </section>

        <div class="row">
          <div class="panel">
            <div class="panel-title"><h3>回撤曲线</h3><span class="sub">最大回撤 {{ result.metrics['最大回撤'] }}</span></div>
            <EChart :option="ddOption" height="260px" />
          </div>

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
  label { font-size: 12px; color: $text-secondary; }
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
.hint {
  font-size: 11px;
  color: $text-tertiary;
  line-height: 1.5;
  margin: 0;
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
  p { color: $text-secondary; max-width: 400px; }
}
.retry {
  margin-top: $space-4;
  padding: 8px 16px;
  border-radius: $radius-md;
  background: $brand;
  color: #fff;
  font-size: 13px;
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

.ai-panel .ai-body {
  padding: $space-4 $space-5 $space-5;
  font-size: 13px;
  line-height: 1.7;
  color: $text-secondary;
  .muted { color: $text-tertiary; margin: 0; }
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
