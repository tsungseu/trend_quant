<script setup>
import { computed } from 'vue'
import { useAccountStore } from '@/stores/account'
import { useThemeStore } from '@/stores/theme'
import { fmtMoney, fmtPct, sign, chartTheme } from '@/mock/_helpers'
import StatCard from '@/components/StatCard.vue'
import EChart from '@/components/EChart.vue'

const account = useAccountStore()
const theme = useThemeStore()
const ct = () => (void theme.theme, chartTheme())

const ranges = [
  { key: '1D', label: '1日' },
  { key: '1W', label: '1周' },
  { key: '1M', label: '1月' },
  { key: '3M', label: '3月' },
  { key: '1Y', label: '1年' },
  { key: 'ALL', label: '成立以来' },
]

const info = computed(() => account.info)

// ---- 收益曲线 ECharts ----
const equityOption = computed(() => {
  const t = ct()
  const c = account.curve
  const dates = c.map((p) => p.date)
  const vals = c.map((p) => p.value)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  return {
    grid: { left: 16, right: 50, top: 30, bottom: 28, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: t.axis } },
      axisLabel: { color: t.label, fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      scale: true,
      min: min * 0.995,
      max: max * 1.005,
      axisLabel: {
        color: t.label,
        fontSize: 11,
        formatter: (v) => (v / 10000).toFixed(1) + 'w',
      },
      splitLine: { lineStyle: { color: t.split } },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (p) => {
        const d = p[0]
        return `${d.axisValue}<br/><b style="color:#3b82f6">总资产</b>：${fmtMoney(d.value)}`
      },
    },
    series: [
      {
        type: 'line',
        data: vals,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2.2, color: '#3b82f6' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59,130,246,0.35)' },
              { offset: 1, color: 'rgba(59,130,246,0)' },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: t.axis, type: 'dashed' },
          data: [{ yAxis: c[0]?.value, label: { show: false } }],
        },
      },
    ],
  }
})

// ---- 资产配置环形图 ----
const allocOption = computed(() => {
  const t = ct()
  return {
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {d}%',
  },
  legend: {
    orient: 'vertical',
    right: 0,
    top: 'center',
    icon: 'circle',
    itemWidth: 8,
    itemHeight: 8,
    textStyle: { color: t.secondary, fontSize: 12 },
  },
  series: [
    {
      type: 'pie',
      radius: ['58%', '78%'],
      center: ['38%', '50%'],
      avoidLabelOverlap: false,
      label: {
        show: true,
        position: 'center',
        formatter: () => '{a|总资产}\n{b|' + fmtMoney(info.value.totalAssets) + '}',
        rich: {
          a: { color: t.secondary, fontSize: 12, padding: [0, 0, 6, 0] },
          b: { color: '#f5b73d', fontSize: 18, fontWeight: 'bold' },
        },
      },
      labelLine: { show: false },
      itemStyle: {
        borderColor: 'var(--bg-panel)',
        borderWidth: 3,
      },
      data: info.value.allocations.map((a) => ({
        value: a.value,
        name: a.name,
        itemStyle: { color: a.color },
      })),
    },
  ],
  }
})

// ---- 月度收益热力 ----
const monthOption = computed(() => {
  const t = ct()
  const data = account.monthlyReturns.map((m, i) => [i, 0, m.ret])
  const values = data.map((d) => d[2])
  return {
    grid: { left: 0, right: 0, top: 10, bottom: 0, containLabel: true },
    tooltip: {
      formatter: (p) => `${account.monthlyReturns[p.value[0]].month}<br/>收益：${fmtPct(p.value[2])}`,
    },
    visualMap: {
      min: -0.06,
      max: 0.09,
      show: false,
      inRange: { color: ['#22c55e', t.label, '#ef4444'] },
    },
    xAxis: { type: 'category', show: false, data: account.monthlyReturns.map((m) => m.month) },
    yAxis: { type: 'category', show: false, data: [''] },
    series: [
      {
        type: 'heatmap',
        data,
        label: {
          show: true,
          formatter: (p) => fmtPct(p.value[2]).replace('+', ''),
          color: t.tertiary === '#5d6b8a' ? '#fff' : '#0f172a',
          fontSize: 11,
          fontWeight: 600,
        },
        itemStyle: { borderRadius: 6, borderColor: 'var(--bg-panel)', borderWidth: 2 },
      },
    ],
  }
})
</script>

<template>
  <div class="overview">
    <!-- 顶部资产大卡 + 关键指标 -->
    <section class="hero">
      <div class="hero-card panel">
        <div class="hero-top">
          <div class="hero-l">
            <div class="hero-label">总资产 (CNY)</div>
            <div class="hero-value num gold">{{ fmtMoney(info.totalAssets) }}</div>
            <div class="hero-sub">
              今日盈亏
              <span class="num" :class="info.todayProfit > 0 ? 'up' : 'down'">
                {{ sign(info.todayProfit) }}{{ fmtMoney(info.todayProfit).replace('¥', '¥ ') }}
                ({{ fmtPct(info.todayProfitPct) }})
              </span>
            </div>
          </div>
          <div class="hero-r">
            <div class="kv">
              <span class="k">持仓市值</span>
              <span class="v num">{{ fmtMoney(info.marketValue) }}</span>
            </div>
            <div class="kv">
              <span class="k">可用资金</span>
              <span class="v num">{{ fmtMoney(info.available) }}</span>
            </div>
            <div class="kv">
              <span class="k">累计收益</span>
              <span class="v num up">{{ sign(info.totalProfit) }}{{ fmtMoney(info.totalProfit).replace('¥', '¥ ') }} · {{ fmtPct(info.totalProfitPct) }}</span>
            </div>
          </div>
        </div>
      </div>

      <StatCard
        v-for="m in account.keyMetrics.slice(0, 4)"
        :key="m.label"
        :label="m.label"
        :value="m.value"
        :sub="m.sub"
        :tone="m.tone"
      />
    </section>

    <!-- 收益走势 + 资产配置 -->
    <section class="row-2">
      <div class="panel chart-panel">
        <div class="panel-title">
          <h3>收益走势</h3>
          <div class="range seg">
            <button
              v-for="r in ranges"
              :key="r.key"
              :class="{ active: account.activeRange === r.key }"
              @click="account.setRange(r.key)"
            >
              {{ r.label }}
            </button>
          </div>
        </div>
        <div class="range-stat">
          <span class="muted">区间收益：</span>
          <span class="num" :class="account.rangeProfit.pct > 0 ? 'up' : 'down'">
            {{ sign(account.rangeProfit.pct) }}{{ fmtMoney(account.rangeProfit.abs).replace('¥', '¥ ') }}
            ({{ fmtPct(account.rangeProfit.pct) }})
          </span>
        </div>
        <EChart :option="equityOption" height="320px" />
      </div>

      <div class="panel chart-panel">
        <div class="panel-title">
          <h3>资产配置</h3>
          <span class="sub">实时</span>
        </div>
        <EChart :option="allocOption" height="360px" />
      </div>
    </section>

    <!-- 关键指标网格 + 月度热力 -->
    <section class="row-2">
      <div class="panel">
        <div class="panel-title">
          <h3>核心绩效指标</h3>
          <span class="sub">近2年</span>
        </div>
        <div class="metrics-grid">
          <div v-for="m in account.keyMetrics" :key="m.label" class="metric">
            <div class="m-label">{{ m.label }}</div>
            <div class="m-value num" :class="m.tone">{{ m.value }}</div>
            <div class="m-sub">{{ m.sub }}</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">
          <h3>月度收益</h3>
          <span class="sub">近12个月</span>
        </div>
        <div class="month-heat">
          <EChart :option="monthOption" height="140px" />
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.overview {
  display: flex;
  flex-direction: column;
  gap: $space-5;
}

.hero {
  display: grid;
  grid-template-columns: 2.2fr repeat(4, 1fr);
  gap: $space-4;
}

.hero-card {
  padding: $space-5 $space-6;
  position: relative;
  overflow: hidden;
  &::before {
    content: '';
    position: absolute;
    top: -40%;
    right: -10%;
    width: 320px;
    height: 320px;
    background: radial-gradient(circle, rgba(245, 183, 61, 0.12), transparent 60%);
    pointer-events: none;
  }
}
.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  gap: $space-6;
}
.hero-l {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}
.hero-label {
  font-size: 12px;
  color: $text-secondary;
}
.hero-value {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -1px;
}
.hero-sub {
  font-size: 13px;
  color: $text-secondary;
}
.hero-r {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  position: relative;
  z-index: 1;
}
.kv {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-6;
  min-width: 200px;
  .k {
    font-size: 12px;
    color: $text-tertiary;
  }
  .v {
    font-size: 14px;
    font-weight: 600;
  }
}

.row-2 {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: $space-5;
}

.chart-panel {
  display: flex;
  flex-direction: column;
}
.range-stat {
  padding: $space-2 $space-5;
  font-size: 13px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: $border-subtle;
  padding: 1px;
}
.metric {
  background: $bg-panel;
  padding: $space-4 $space-5;
  display: flex;
  flex-direction: column;
  gap: 4px;
  .m-label {
    font-size: 12px;
    color: $text-secondary;
  }
  .m-value {
    font-size: 22px;
    font-weight: 700;
    &.up {
      color: $up;
    }
    &.down {
      color: $down;
    }
    &.flat {
      color: $text-primary;
    }
  }
  .m-sub {
    font-size: 11px;
    color: $text-tertiary;
  }
}

.month-heat {
  padding: $space-4 $space-5;
}
</style>
