<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { strategies, getBacktest } from '@/mock/strategies'
import { useThemeStore } from '@/stores/theme'
import { fmtMoney, fmtPct, sign, chartTheme } from '@/mock/_helpers'
import EChart from '@/components/EChart.vue'

const route = useRoute()
const router = useRouter()
const theme = useThemeStore()
const ct = () => (void theme.theme, chartTheme())

const strategy = computed(
  () => strategies.find((s) => s.id === route.params.id) || strategies[0]
)
const bt = computed(() => getBacktest(strategy.value.id))

const statusText = { running: '运行中', paused: '已暂停', stopped: '已停止' }

const metricList = computed(() => [
  { k: '年化收益', v: fmtPct(bt.value.metrics['年化收益']), tone: 'up' },
  { k: '基准年化', v: fmtPct(bt.value.metrics['基准年化']), tone: 'flat' },
  { k: '最大回撤', v: fmtPct(bt.value.metrics['最大回撤']), tone: 'down' },
  { k: '夏普比率', v: bt.value.metrics['夏普比率'], tone: 'flat' },
  { k: '索提诺比率', v: bt.value.metrics['索提诺'], tone: 'flat' },
  { k: '卡玛比率', v: bt.value.metrics['卡玛比率'], tone: 'flat' },
  { k: '胜率', v: (bt.value.metrics['胜率'] * 100).toFixed(1) + '%', tone: 'up' },
  { k: '盈亏比', v: bt.value.metrics['盈亏比'], tone: 'up' },
  { k: '交易次数', v: bt.value.metrics['交易次数'], tone: 'flat' },
])

// 回测净值曲线（策略 vs 基准）
const equityOption = computed(() => {
  const t = ct()
  const e = bt.value.equity
  return {
    legend: {
      top: 0,
      right: 10,
      textStyle: { color: t.secondary },
      icon: 'roundRect',
      itemWidth: 14,
      itemHeight: 3,
      data: ['策略净值', '基准净值'],
    },
    grid: { left: 16, right: 50, top: 36, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: e.map((d) => d.date),
      axisLine: { lineStyle: { color: t.axis } },
      axisLabel: { color: t.label, fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: t.label, fontSize: 11, formatter: (v) => v.toFixed(2) },
      splitLine: { lineStyle: { color: t.split } },
    },
    tooltip: { trigger: 'axis' },
    dataZoom: [{ type: 'inside' }],
    series: [
      {
        name: '策略净值',
        type: 'line',
        data: e.map((d) => d.strategy),
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: '#3b82f6' },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
            { offset: 0, color: 'rgba(59,130,246,0.28)' },
            { offset: 1, color: 'rgba(59,130,246,0)' },
          ]},
        },
      },
      {
        name: '基准净值',
        type: 'line',
        data: e.map((d) => d.benchmark),
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.5, color: t.secondary, type: 'dashed' },
      },
    ],
  }
})

// 回撤曲线
const ddOption = computed(() => {
  const t = ct()
  const d = bt.value.drawdown
  return {
    grid: { left: 16, right: 50, top: 20, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: d.map((x) => x.date),
      axisLine: { lineStyle: { color: t.axis } },
      axisLabel: { color: t.label, fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      max: 0,
      axisLabel: { color: t.label, fontSize: 11, formatter: (v) => (v * 100).toFixed(0) + '%' },
      splitLine: { lineStyle: { color: t.split } },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (p) => `${p[0].axisValue}<br/>回撤：<b style="color:#ef4444">${(p[0].value * 100).toFixed(2)}%</b>`,
    },
    series: [{
      type: 'line',
      data: d.map((x) => x.value),
      symbol: 'none',
      lineStyle: { width: 1.5, color: '#ef4444' },
      areaStyle: { color: 'rgba(239,68,68,0.18)' },
    }],
  }
})

// 月度柱
const monthOption = computed(() => {
  const t = ct()
  const m = bt.value.monthly
  return {
    grid: { left: 16, right: 16, top: 20, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category',
      data: m.map((_, i) => 'M' + (12 - i)),
      axisLine: { lineStyle: { color: t.axis } },
      axisLabel: { color: t.label, fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: t.label, fontSize: 11, formatter: (v) => (v * 100).toFixed(0) + '%' },
      splitLine: { lineStyle: { color: t.split } },
    },
    tooltip: { trigger: 'axis', formatter: (p) => (p[0].value * 100).toFixed(2) + '%' },
    series: [{
      type: 'bar',
      data: m.map((x) => ({
        value: x.ret,
        itemStyle: { color: x.ret >= 0 ? '#ef4444' : '#22c55e', borderRadius: [3, 3, 0, 0] },
      })),
      barWidth: '60%',
    }],
  }
})
</script>

<template>
  <div class="strategy-detail" v-if="strategy">
    <!-- 返回 + 头部 -->
    <div class="head-bar">
      <button class="btn btn-ghost btn-sm" @click="router.push('/strategies')">‹ 返回策略</button>
    </div>

    <section class="profile panel">
      <div class="p-left">
        <div class="p-ico" :style="{ background: strategy.color + '22', color: strategy.color }">
          <span class="dot"></span>
        </div>
        <div class="p-info">
          <div class="p-name">
            {{ strategy.name }}
            <span class="badge" :class="strategy.status">{{ statusText[strategy.status] }}</span>
          </div>
          <div class="p-desc muted">{{ strategy.desc }}</div>
          <div class="p-tags">
            <span class="tag">{{ strategy.market }}</span>
            <span class="tag">风险{{ strategy.risk }}</span>
            <span class="tag">运行 {{ strategy.days }} 天</span>
            <span class="tag">资金 {{ fmtMoney(strategy.capital) }}</span>
          </div>
        </div>
      </div>
      <div class="p-actions">
        <button v-if="strategy.status !== 'running'" class="btn btn-primary">启动策略</button>
        <button v-else class="btn btn-ghost">暂停</button>
        <button class="btn btn-ghost">调参</button>
        <button class="btn btn-ghost">导出报告</button>
      </div>
    </section>

    <!-- 指标条 -->
    <section class="metrics-bar panel">
      <div v-for="m in metricList" :key="m.k" class="mb-item">
        <div class="mb-k">{{ m.k }}</div>
        <div class="mb-v num" :class="m.tone">{{ m.v }}</div>
      </div>
    </section>

    <!-- 回测净值 + 月度 -->
    <section class="row">
      <div class="panel">
        <div class="panel-title">
          <h3>回测净值曲线</h3>
          <span class="sub">策略 vs 基准 · 近一年</span>
        </div>
        <EChart :option="equityOption" height="360px" />
      </div>
      <div class="panel">
        <div class="panel-title">
          <h3>月度收益</h3>
        </div>
        <EChart :option="monthOption" height="360px" />
      </div>
    </section>

    <!-- 回撤 + 参数 -->
    <section class="row">
      <div class="panel">
        <div class="panel-title">
          <h3>回撤曲线</h3>
          <span class="sub">最大回撤 {{ fmtPct(bt.metrics['最大回撤']) }}</span>
        </div>
        <EChart :option="ddOption" height="300px" />
      </div>

      <div class="panel">
        <div class="panel-title"><h3>策略参数</h3></div>
        <div class="params">
          <div v-for="(v, k) in strategy.params" :key="k" class="param">
            <span class="pk">{{ k }}</span>
            <span class="pv">{{ v }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 近期成交 -->
    <section class="panel">
      <div class="panel-title">
        <h3>策略近期成交</h3>
        <span class="sub">最近 {{ bt.trades.length }} 笔</span>
      </div>
      <table class="trade-table">
        <thead>
          <tr>
            <th>日期</th><th>方向</th><th>标的</th><th class="r">价格</th>
            <th class="r">数量</th><th class="r">金额</th><th class="r">盈亏</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(t, i) in bt.trades" :key="i">
            <td class="dim">{{ t.date }}</td>
            <td>
              <span class="act" :class="t.action === '买入' ? 'buy' : 'sell'">{{ t.action }}</span>
            </td>
            <td>{{ t.symbol }}</td>
            <td class="r num">{{ t.price }}</td>
            <td class="r num">{{ t.qty }}</td>
            <td class="r num">{{ fmtMoney(t.price * t.qty) }}</td>
            <td class="r num" :class="t.pnl > 0 ? 'up' : 'down'">{{ sign(t.pnl) }}{{ fmtMoney(t.pnl).replace('¥', '¥') }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.strategy-detail {
  display: flex;
  flex-direction: column;
  gap: $space-5;
}
.head-bar {
  display: flex;
}

.profile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-6;
  padding: $space-5 $space-6;
  flex-wrap: wrap;
}
.p-left {
  display: flex;
  gap: $space-4;
  align-items: flex-start;
}
.p-ico {
  width: 48px;
  height: 48px;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  .dot {
    width: 18px;
    height: 18px;
    border-radius: 5px;
    background: currentColor;
    opacity: 0.85;
  }
}
.p-name {
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: $space-3;
}
.p-desc {
  font-size: 13px;
  margin: $space-2 0 $space-3;
  max-width: 600px;
}
.p-tags {
  display: flex;
  gap: $space-2;
  flex-wrap: wrap;
  .tag {
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 999px;
    background: $bg-panel-2;
    color: $text-secondary;
  }
}
.p-actions {
  display: flex;
  gap: $space-2;
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
  .mb-k {
    font-size: 11px;
    color: $text-tertiary;
    margin-bottom: 4px;
  }
  .mb-v {
    font-size: 18px;
    font-weight: 700;
    &.up { color: $up; }
    &.down { color: $down; }
  }
}

.row {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: $space-5;
}

.params {
  padding: $space-3 $space-5 $space-5;
}
.param {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 0;
  border-bottom: 1px solid $border-subtle;
  &:last-child {
    border-bottom: none;
  }
  .pk {
    font-size: 13px;
    color: $text-secondary;
  }
  .pv {
    font-size: 13px;
    font-weight: 600;
    color: $text-primary;
  }
}

.trade-table {
  width: 100%;
  border-collapse: collapse;
  th, td {
    padding: $space-3 $space-5;
    text-align: left;
    font-size: 13px;
    border-bottom: 1px solid $border-subtle;
  }
  th {
    color: $text-tertiary;
    font-weight: 500;
    font-size: 11px;
    background: $bg-panel-2;
  }
  th.r, td.r {
    text-align: right;
  }
  .dim {
    color: $text-tertiary;
  }
  .act {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    &.buy {
      color: $up;
      background: $up-bg;
    }
    &.sell {
      color: $down;
      background: $down-bg;
    }
  }
  tbody tr:hover {
    background: $bg-panel-2;
  }
}
</style>
