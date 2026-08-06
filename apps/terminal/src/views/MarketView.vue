<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useMarketStore } from '@/stores/market'
import { useThemeStore } from '@/stores/theme'
import { getKlines, getIntraday } from '@/mock/market'
import { DATA_QUALITY, DATA_SOURCE, makeMock, qualityClass, qualityLabel } from '@/utils/dataQuality'
import { fmtMoney, fmtPct, sign, chartTheme } from '@/mock/_helpers'
import EChart from '@/components/EChart.vue'

const market = useMarketStore()
const theme = useThemeStore()
const ct = () => (void theme.theme, chartTheme())
const chartTab = ref('kline') // kline / intraday
const maSet = ref([5, 20]) // 默认显示 MA5 MA20

// 选中标的时拉真实 K线 + 分时
onMounted(() => {
  market.fetchKline(market.activeCode)
  market.fetchRealIntraday(market.activeCode)
})
watch(() => market.activeCode, (c) => {
  if (c) {
    market.fetchKline(c)
    market.fetchRealIntraday(c)
  }
})
watch(chartTab, (t) => {
  if (t === 'intraday' && market.activeCode) market.fetchRealIntraday(market.activeCode)
})

// 真实数据优先，回退 mock；显式带上质量元信息
const klinesState = computed(() => {
  const real = market.realKlines[market.activeCode]
  if (real?.klines?.length) return real
  const mock = getKlines(market.activeCode)
  return makeMock(mock, mock[mock.length - 1]?.date || '')
})
const intradayState = computed(() => {
  const real = market.realIntraday[market.activeCode]
  if (real?.ticks?.length) return { ...real, ticks: real.ticks, prevClose: real.prevClose }
  const m = getIntraday(market.activeCode)
  return makeMock(m, m.ticks?.[m.ticks.length - 1]?.t || '')
})
const klines = computed(() => klinesState.value.klines || klinesState.value.data || [])
const intraday = computed(() => {
  const t = intradayState.value.ticks || intradayState.value.data?.ticks || []
  const p = intradayState.value.prevClose ?? intradayState.value.data?.prevClose ?? 0
  return { ticks: t, prevClose: p }
})
const active = computed(() => market.activeStock)
const activeState = computed(() => {
  // 自选股列表项本身在 store 里带了 source/quality/isFallback
  const s = market.stocks.find((x) => x.code === market.activeCode)
  if (!s) return null
  if (s.quality && s.source) return s
  return makeMock(s, '')
})
const klineQualityCls = computed(() => qualityClass(klinesState.value))
const klineQualityText = computed(() => qualityLabel(klinesState.value))
const intradayQualityCls = computed(() => qualityClass(intradayState.value))
const intradayQualityText = computed(() => qualityLabel(intradayState.value))

// 计算 MA
function calcMA(data, n) {
  const result = []
  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) {
      result.push('-')
      continue
    }
    let sum = 0
    for (let j = 0; j < n; j++) sum += data[i - j].close
    result.push(+(sum / n).toFixed(2))
  }
  return result
}

const klineOption = computed(() => {
  const t = ct()
  const data = klines.value
  const up = '#ef4444'
  const down = '#22c55e'
  const maColors = { 5: '#f5b73d', 10: '#a855f7', 20: '#3b82f6' }
  const series = [
    {
      name: '日K',
      type: 'candlestick',
      data: data.map((d) => [d.open, d.close, d.low, d.high]),
      itemStyle: {
        color: up,
        color0: down,
        borderColor: up,
        borderColor0: down,
      },
    },
  ]
  maSet.value.forEach((n) => {
    series.push({
      name: `MA${n}`,
      type: 'line',
      data: calcMA(data, n),
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 1.2, color: maColors[n] },
    })
  })
  // 成交量
  const volData = data.map((d) => ({
    value: d.volume,
    itemStyle: { color: d.close >= d.open ? up : down, opacity: 0.5 },
  }))
  series.push({
    name: '成交量',
    type: 'bar',
    data: volData,
    xAxisIndex: 1,
    yAxisIndex: 1,
  })

  return {
    animation: false,
    legend: {
      top: 0,
      right: 10,
      textStyle: { color: t.secondary },
      icon: 'roundRect',
      itemWidth: 14,
      itemHeight: 3,
      data: maSet.value.map((n) => `MA${n}`).concat(['日K', '成交量']),
    },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    grid: [
      { left: 16, right: 50, top: 36, height: '58%' },
      { left: 16, right: 50, top: '74%', height: '18%' },
    ],
    xAxis: [
      {
        type: 'category',
        data: data.map((d) => d.date),
        boundaryGap: true,
        axisLine: { lineStyle: { color: t.axis } },
        axisLabel: { show: false },
        axisTick: { show: false },
      },
      {
        type: 'category',
        gridIndex: 1,
        data: data.map((d) => d.date),
        axisLabel: { color: t.label, fontSize: 11 },
        axisTick: { show: false },
      },
    ],
    yAxis: [
      { scale: true, splitLine: { lineStyle: { color: t.split } }, axisLabel: { color: t.label } },
      { gridIndex: 1, splitNumber: 2, axisLabel: { color: t.label, formatter: (v) => (v / 10000).toFixed(0) + 'w' }, splitLine: { show: false } },
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1],
        start: 60,
        end: 100,
      },
      {
        type: 'slider',
        xAxisIndex: [0, 1],
        bottom: 6,
        height: 16,
        start: 60,
        end: 100,
        borderColor: 'transparent',
        backgroundColor: 'rgba(148,163,184,0.05)',
        fillerColor: 'rgba(59,130,246,0.12)',
        handleStyle: { color: '#3b82f6' },
        textStyle: { color: t.label },
      },
    ],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    series,
  }
})

const intradayOption = computed(() => {
  const t = ct()
  const { ticks, prevClose } = intraday.value
  const up = '#ef4444'
  const down = '#22c55e'
  return {
    legend: { show: false },
    grid: { left: 16, right: 50, top: 20, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ticks.map((t) => t.t),
      axisLine: { lineStyle: { color: t.axis } },
      axisLabel: { color: t.label, fontSize: 11, interval: 5 },
      axisTick: { show: false },
    },
    yAxis: {
      scale: true,
      axisLabel: { color: t.label, fontSize: 11 },
      splitLine: { lineStyle: { color: t.split } },
    },
    tooltip: { trigger: 'axis' },
    series: [
      {
        name: '价格',
        type: 'line',
        data: ticks.map((t) => t.price),
        symbol: 'none',
        lineStyle: { width: 1.6, color: '#3b82f6' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59,130,246,0.25)' },
              { offset: 1, color: 'rgba(59,130,246,0)' },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: t.axis, type: 'dashed' },
          data: [{ yAxis: prevClose, label: { formatter: '昨收 {c}', color: t.secondary, fontSize: 10 } }],
        },
      },
      {
        name: '均价',
        type: 'line',
        data: ticks.map((t) => t.avg),
        symbol: 'none',
        lineStyle: { width: 1.2, color: '#f5b73d' },
      },
    ],
  }
})

function toggleMA(n) {
  const i = maSet.value.indexOf(n)
  if (i >= 0) maSet.value.splice(i, 1)
  else maSet.value.push(n)
  maSet.value.sort((a, b) => a - b)
}
</script>

<template>
  <div class="market">
    <!-- 行情列表 -->
    <aside class="panel watchlist">
      <div class="panel-title">
        <h3>自选股</h3>
        <span class="sub">{{ market.stocks.length }} 只</span>
      </div>
      <div class="wl-head">
        <span>名称代码</span>
        <span>最新价</span>
        <span>涨跌幅</span>
      </div>
      <ul class="wl-body">
        <li
          v-for="s in market.stocks"
          :key="s.code"
          :class="{ active: s.code === market.activeCode }"
          @click="market.select(s.code)"
        >
          <div class="sym">
            <span class="nm">{{ s.name }}</span>
            <span class="cd">{{ s.code }}</span>
          </div>
          <span class="px num" :class="s.changePct > 0 ? 'up' : 'down'">{{ s.price }}</span>
          <span class="pct num" :class="s.changePct > 0 ? 'up' : 'down'">
            {{ fmtPct(s.changePct) }}
          </span>
        </li>
      </ul>
    </aside>

    <!-- 主图表区 -->
    <section class="chart-area">
      <!-- 标的头部信息 -->
      <div class="panel stock-head">
        <div class="s-main">
          <h2>{{ active.name }}
            <span class="tag">{{ active.code }}</span>
            <span class="tag sector">{{ active.sector }}</span>
          </h2>
          <div class="s-price num" :class="active.changePct > 0 ? 'up' : 'down'">
            {{ active.price }}
            <span class="chg num">{{ sign(active.change) }}{{ active.change }} ({{ fmtPct(active.changePct) }})</span>
          </div>
        </div>
        <div class="s-quotations num">
          <div class="q"><span>今开</span><b :class="active.open >= active.prevClose ? 'up' : 'down'">{{ active.open }}</b></div>
          <div class="q"><span>昨收</span><b>{{ active.prevClose }}</b></div>
          <div class="q"><span>最高</span><b class="up">{{ active.high }}</b></div>
          <div class="q"><span>最低</span><b class="down">{{ active.low }}</b></div>
          <div class="q"><span>成交量</span><b>{{ (active.volume / 10000).toFixed(1) }}万</b></div>
          <div class="q"><span>市值</span><b>{{ (active.marketCap / 100000000).toFixed(1) }}亿</b></div>
        </div>
        <div class="s-actions">
          <div class="seg">
            <button :class="{ active: chartTab === 'kline' }" @click="chartTab = 'kline'">日K</button>
            <button :class="{ active: chartTab === 'intraday' }" @click="chartTab = 'intraday'">分时</button>
          </div>
          <!-- 修复：原嵌套 button 不合法，改为 div 容器内的 button -->
          <div v-if="chartTab === 'kline'" class="ma-toggles seg">
            <button v-for="n in [5, 10, 20]" :key="n" :class="{ active: maSet.includes(n) }" @click="toggleMA(n)">MA{{ n }}</button>
          </div>
          <span
            class="data-source-tag"
            :class="chartTab === 'kline' ? klineQualityCls : intradayQualityCls"
            :title="qualityLabel(chartTab === 'kline' ? klinesState : intradayState)"
          >
            {{ chartTab === 'kline' ? klineQualityText : intradayQualityText }}
          </span>
        </div>
      </div>

      <!-- 图表 -->
      <div class="panel chart-box">
        <EChart v-if="chartTab === 'kline'" :option="klineOption" height="520px" />
        <EChart v-else :option="intradayOption" height="520px" />
      </div>
    </section>

    <!-- 右侧：板块 + 盘口 -->
    <aside class="side-right">
      <div class="panel">
        <div class="panel-title"><h3>板块涨跌</h3></div>
        <ul class="sectors">
          <li v-for="sct in market.sectorList" :key="sct.name" class="sector-item">
            <div class="sec-l">
              <span class="sec-name">{{ sct.name }}</span>
              <span class="sec-lead muted">领涨 {{ sct.lead }}</span>
            </div>
            <span class="num" :class="sct.changePct > 0 ? 'up' : 'down'">{{ fmtPct(sct.changePct) }}</span>
          </li>
        </ul>
      </div>

      <div class="panel">
        <div class="panel-title">
          <h3>五档盘口</h3>
          <span class="sub">{{ active.name }} · 模拟盘口</span>
        </div>
        <div class="book">
          <div v-for="(b, i) in 5" :key="'s'+i" class="book-row sell">
            <span class="dim">卖{{ 5 - i }}</span>
            <span class="num down">{{ (+active.price - (5 - i) * 0.01).toFixed(2) }}</span>
            <span class="num muted">{{ Math.round(800 - i * 120) }}</span>
          </div>
          <div class="book-mid" :class="active.changePct > 0 ? 'up' : 'down'">{{ active.price }}</div>
          <div v-for="(b, i) in 5" :key="'b'+i" class="book-row buy">
            <span class="dim">买{{ i + 1 }}</span>
            <span class="num up">{{ (+active.price + (i + 1) * 0.01).toFixed(2) }}</span>
            <span class="num muted">{{ Math.round(600 - i * 90) }}</span>
          </div>
        </div>
        <div class="book-note muted">盘口量为模拟估算，仅供界面演示，不构成交易依据。</div>
      </div>
    </aside>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.market {
  display: grid;
  grid-template-columns: 280px 1fr 260px;
  gap: $space-5;
  height: 100%;
}

/* 自选列表 */
.watchlist {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.wl-head,
.wl-body li {
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr;
  gap: $space-2;
  padding: 0 $space-4;
}
.wl-head {
  padding-top: $space-3;
  padding-bottom: $space-2;
  font-size: 11px;
  color: $text-tertiary;
  border-bottom: 1px solid $border-subtle;
}
.wl-body {
  overflow-y: auto;
  li {
    padding: $space-3 $space-4;
    align-items: center;
    cursor: pointer;
    border-left: 2px solid transparent;
    transition: background $transition-fast;
    &:hover {
      background: $bg-panel-2;
    }
    &.active {
      background: $brand-soft;
      border-left-color: $brand;
    }
  }
}
.sym {
  display: flex;
  flex-direction: column;
  gap: 1px;
  .nm {
    font-size: 13px;
    font-weight: 500;
  }
  .cd {
    font-size: 10px;
    color: $text-tertiary;
  }
}
.px {
  font-size: 13px;
  font-weight: 600;
}
.pct {
  font-size: 12px;
  text-align: right;
}

/* 主图表区 */
.chart-area {
  display: flex;
  flex-direction: column;
  gap: $space-5;
  min-width: 0;
}
.stock-head {
  padding: $space-4 $space-5;
  display: flex;
  align-items: center;
  gap: $space-6;
  flex-wrap: wrap;
}
.s-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.s-main h2 {
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: $space-2;
  .tag {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    background: $bg-panel-2;
    color: $text-tertiary;
    font-weight: 400;
    &.sector {
      color: $brand;
    }
  }
}
.s-price {
  font-size: 26px;
  font-weight: 700;
  display: flex;
  align-items: baseline;
  gap: $space-3;
  .chg {
    font-size: 13px;
    font-weight: 500;
  }
}
.s-quotations {
  display: grid;
  grid-template-columns: repeat(3, auto);
  gap: $space-2 $space-6;
  margin-left: auto;
  .q {
    display: flex;
    flex-direction: column;
    gap: 2px;
    span {
      font-size: 11px;
      color: $text-tertiary;
    }
    b {
      font-size: 13px;
      font-weight: 600;
    }
  }
}
.s-actions {
  display: flex;
  gap: $space-3;
  align-items: center;
}
.data-source-tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  color: $text-tertiary;
  background: $bg-panel-2;
  margin-left: $space-2;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  &.real { color: $success; background: rgba(34,197,94,0.1); }
  &.warn { color: $warning; background: rgba(245,183,61,0.12); }
  &.fallback { color: $text-tertiary; }
}
.chart-box {
  padding: $space-4;
  flex: 1;
  min-height: 0;
}

/* 右侧 */
.side-right {
  display: flex;
  flex-direction: column;
  gap: $space-5;
}
.sectors {
  padding: $space-2;
}
.sector-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 $space-4;
  border-radius: $radius-sm;
  &:hover {
    background: $bg-panel-2;
  }
  .sec-l {
    display: flex;
    flex-direction: column;
    gap: 1px;
    .sec-name {
      font-size: 13px;
    }
    .sec-lead {
      font-size: 10px;
    }
  }
  span.num {
    font-size: 14px;
    font-weight: 600;
  }
}

.book {
  padding: $space-3 $space-4;
}
.book-row {
  display: grid;
  grid-template-columns: 40px 1fr 60px;
  gap: $space-3;
  padding: 5px 0;
  font-size: 12px;
  align-items: center;
  &.buy span:nth-child(2) {
    color: $up;
  }
  &.sell span:nth-child(2) {
    color: $down;
  }
}
.book-mid {
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  padding: $space-3 0;
  margin: $space-2 0;
  border-top: 1px solid $border-subtle;
  border-bottom: 1px solid $border-subtle;
  font-family: 'JetBrains Mono', monospace;
  &.up {
    color: $up;
  }
  &.down {
    color: $down;
  }
}
.book-note {
  padding: $space-2 $space-4 $space-3;
  font-size: 10px;
  line-height: 1.4;
}
</style>


<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.market {
  display: grid;
  grid-template-columns: 280px 1fr 260px;
  gap: $space-5;
  height: 100%;
}

/* 自选列表 */
.watchlist {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.wl-head,
.wl-body li {
  display: grid;
  grid-template-columns: 1.3fr 1fr 1fr;
  gap: $space-2;
  padding: 0 $space-4;
}
.wl-head {
  padding-top: $space-3;
  padding-bottom: $space-2;
  font-size: 11px;
  color: $text-tertiary;
  border-bottom: 1px solid $border-subtle;
}
.wl-body {
  overflow-y: auto;
  li {
    padding: $space-3 $space-4;
    align-items: center;
    cursor: pointer;
    border-left: 2px solid transparent;
    transition: background $transition-fast;
    &:hover {
      background: $bg-panel-2;
    }
    &.active {
      background: $brand-soft;
      border-left-color: $brand;
    }
  }
}
.sym {
  display: flex;
  flex-direction: column;
  gap: 1px;
  .nm {
    font-size: 13px;
    font-weight: 500;
  }
  .cd {
    font-size: 10px;
    color: $text-tertiary;
  }
}
.px {
  font-size: 13px;
  font-weight: 600;
}
.pct {
  font-size: 12px;
  text-align: right;
}

/* 主图表区 */
.chart-area {
  display: flex;
  flex-direction: column;
  gap: $space-5;
  min-width: 0;
}
.stock-head {
  padding: $space-4 $space-5;
  display: flex;
  align-items: center;
  gap: $space-6;
  flex-wrap: wrap;
}
.s-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.s-main h2 {
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: $space-2;
  .tag {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    background: $bg-panel-2;
    color: $text-tertiary;
    font-weight: 400;
    &.sector {
      color: $brand;
    }
  }
}
.s-price {
  font-size: 26px;
  font-weight: 700;
  display: flex;
  align-items: baseline;
  gap: $space-3;
  .chg {
    font-size: 13px;
    font-weight: 500;
  }
}
.s-quotations {
  display: grid;
  grid-template-columns: repeat(3, auto);
  gap: $space-2 $space-6;
  margin-left: auto;
  .q {
    display: flex;
    flex-direction: column;
    gap: 2px;
    span {
      font-size: 11px;
      color: $text-tertiary;
    }
    b {
      font-size: 13px;
      font-weight: 600;
    }
  }
}
.s-actions {
  display: flex;
  gap: $space-3;
  align-items: center;
}
.data-source-tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  color: $text-tertiary;
  background: $bg-panel-2;
  margin-left: $space-2;
  &.real {
    color: $success;
    background: rgba(34,197,94,0.1);
  }
}
.chart-box {
  padding: $space-4;
  flex: 1;
  min-height: 0;
}

/* 右侧 */
.side-right {
  display: flex;
  flex-direction: column;
  gap: $space-5;
}
.sectors {
  padding: $space-2;
}
.sector-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 $space-4;
  border-radius: $radius-sm;
  &:hover {
    background: $bg-panel-2;
  }
  .sec-l {
    display: flex;
    flex-direction: column;
    gap: 1px;
    .sec-name {
      font-size: 13px;
    }
    .sec-lead {
      font-size: 10px;
    }
  }
  span.num {
    font-size: 14px;
    font-weight: 600;
  }
}

.book {
  padding: $space-3 $space-4;
}
.book-row {
  display: grid;
  grid-template-columns: 40px 1fr 60px;
  gap: $space-3;
  padding: 5px 0;
  font-size: 12px;
  align-items: center;
  &.buy span:nth-child(2) {
    color: $up;
  }
  &.sell span:nth-child(2) {
    color: $down;
  }
}
.book-mid {
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  padding: $space-3 0;
  margin: $space-2 0;
  border-top: 1px solid $border-subtle;
  border-bottom: 1px solid $border-subtle;
  font-family: 'JetBrains Mono', monospace;
  &.up {
    color: $up;
  }
  &.down {
    color: $down;
  }
}
</style>
