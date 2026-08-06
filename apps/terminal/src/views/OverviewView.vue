<script setup>
import { computed, ref, onMounted } from 'vue'
import { useAccountStore } from '@/stores/account'
import { useThemeStore } from '@/stores/theme'
import { fmtMoney, fmtSignedMoney, fmtPct, sign, round, chartTheme } from '@/mock/_helpers'
import { qualityLabel } from '@/utils/dataQuality'
import StatCard from '@/components/StatCard.vue'
import EChart from '@/components/EChart.vue'

const account = useAccountStore()
const theme = useThemeStore()
const ct = () => (void theme.theme, chartTheme())

const info = computed(() => account.info || {})

// 账户数据质量提示：本地历史快照（非真实实时账户），保持免责可见
const accountQuality = computed(() => qualityLabel(info.value))

// ---- 收益走势区间切换 ----
const ranges = [
  { key: '1D', label: '1日' },
  { key: '1W', label: '1周' },
  { key: '1M', label: '1月' },
  { key: '3M', label: '3月' },
  { key: '1Y', label: '1年' },
  { key: 'ALL', label: '成立以来' },
]

// ---- 收益走势 vs 市场基准（组合 / 沪深300[真实] / 纳斯达克100[模拟]）----
const equityOption = computed(() => {
  const t = ct()
  const c = account.curve
  if (!c || c.length < 2 || !c[0] || !c[0].value) return { series: [] }
  const bench = account.vsBenchmark || []
  const benchByDate = new Map(bench.map((p) => [p.date, p]))
  // 只有基准能覆盖至少一半区间点时才叠加基准线，避免大量 null 导致 ECharts 报错
  const covered = c.filter((p) => benchByDate.has(p.date)).length
  const hasBench = covered >= Math.ceil(c.length / 2)
  const baseVal = c[0].value
  const baseHs = hasBench ? benchByDate.get(c[0].date)?.hs300 : null
  const baseNdx = hasBench ? benchByDate.get(c[0].date)?.ndx100 : null
  const hsSeriesName = '沪深300' + (account.benchmarkHasRealHs300 ? '·真实' : '·模拟')
  const ndxSeriesName = '纳斯达克100' + (account.benchmarkHasRealNdx ? '·真实' : '·模拟')
  const dates = c.map((p) => p.date)
  const mine = c.map((p) => round((p.value / baseVal - 1) * 100, 2))
  const series = [{
    name: '我的组合', type: 'line', smooth: true, symbol: 'none',
    data: mine,
    lineStyle: { width: 2.2, color: '#3b82f6' },
    areaStyle: {
      color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.22)' }, { offset: 1, color: 'rgba(59,130,246,0)' }] },
    },
    markLine: { silent: true, symbol: 'none', lineStyle: { color: t.axis, type: 'dashed' }, data: [{ yAxis: 0, label: { show: false } }] },
  }]
  if (hasBench) {
    series.push({
      name: hsSeriesName,
      type: 'line', smooth: true, symbol: 'none',
      data: c.map((p) => {
        const b = benchByDate.get(p.date)
        return b && baseHs ? round((b.hs300 / baseHs - 1) * 100, 2) : '-'
      }),
      lineStyle: { width: 1.5, color: '#f5b73d' },
      connectNulls: true,
    })
    series.push({
      name: ndxSeriesName, type: 'line', smooth: true, symbol: 'none',
      data: c.map((p) => {
        const b = benchByDate.get(p.date)
        return b && baseNdx ? round((b.ndx100 / baseNdx - 1) * 100, 2) : '-'
      }),
      lineStyle: { width: 1.5, color: '#a855f7' },
      connectNulls: true,
    })
  }
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        let s = params[0].axisValue + '<br/>'
        params.forEach((p) => {
          if (p.value == null || p.value === '-') return
          s += `${p.marker} ${p.seriesName}：<b style="color:${p.value >= 0 ? '#ef4444' : '#22c55e'}">${p.value > 0 ? '+' : ''}${p.value}%</b><br/>`
        })
        return s
      },
    },
    legend: {
      top: 0, right: 10,
      textStyle: { color: t.secondary, fontSize: 12 },
      icon: 'roundRect', itemWidth: 16, itemHeight: 3,
      data: hasBench ? ['我的组合', hsSeriesName, ndxSeriesName] : ['我的组合'],
    },
    grid: { left: 16, right: 24, top: 36, bottom: 24, containLabel: true },
    xAxis: {
      type: 'category', boundaryGap: false, data: dates,
      axisLine: { lineStyle: { color: t.axis } },
      axisLabel: { color: t.label, fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value', scale: true,
      axisLabel: { color: t.label, fontSize: 11, formatter: (v) => (v > 0 ? '+' : '') + v + '%' },
      splitLine: { lineStyle: { color: t.split } },
    },
    series,
  }
})

// ---- 资产配置环形图 ----
const allocOption = computed(() => {
  const t = ct()
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    legend: { orient: 'vertical', right: 0, top: 'center', icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: t.secondary, fontSize: 12 } },
    series: [{
      type: 'pie', radius: ['58%', '78%'], center: ['38%', '50%'], avoidLabelOverlap: false,
      label: {
        show: true, position: 'center',
        formatter: () => '{a|总资产}\n{b|' + fmtMoney(info.value.totalAssets ?? 0) + '}',
        rich: { a: { color: t.secondary, fontSize: 12, padding: [0, 0, 6, 0] }, b: { color: '#f5b73d', fontSize: 18, fontWeight: 'bold' } },
      },
      labelLine: { show: false },
      itemStyle: { borderColor: 'var(--bg-panel)', borderWidth: 3 },
      data: (info.value.allocations || []).map((a) => ({ value: a.value, name: a.name, itemStyle: { color: a.color } })),
    }],
  }
})

// ---- 顶部收益总览卡片：昨日/本周/本月/本年 收益金额 ----
const periodCards = computed(() => {
  const p = account.periodProfits || {}
  return [
    { key: 'day', label: '昨日收益(元)', value: p.day ?? 0, sub: '相较前日' },
    { key: 'week', label: '本周收益(元)', value: p.week ?? 0, sub: '本周累计' },
    { key: 'month', label: '本月收益(元)', value: p.month ?? 0, sub: '本月累计' },
    { key: 'year', label: '本年收益(元)', value: p.year ?? 0, sub: '年初至今' },
  ]
})

// 当日收益明细
const breakdown = computed(() => account.todayBreakdown)
const breakdownTotal = computed(() => breakdown.value.reduce((s, b) => s + b.contribution, 0))

// 挂载时加载真实沪深300 基准（失败自动降级为模拟并标注）
onMounted(() => {
  account.loadBenchmark()
})
</script>

<template>
  <div class="overview">
    <!-- ① 顶部资产大卡 + 收益总览卡片 -->
    <section class="hero">
      <div class="hero-card panel">
        <div class="hero-top">
          <div class="hero-l">
            <div class="hero-label">
              总资产 (CNY)
              <span class="quality-chip" :title="accountQuality">{{ accountQuality }}</span>
            </div>
            <div class="hero-value num gold">{{ fmtMoney(info.totalAssets ?? 0) }}</div>
            <div class="hero-sub">
              今日盈亏
              <span class="num" :class="(info.todayProfit ?? 0) > 0 ? 'up' : 'down'">
                {{ sign(info.todayProfit ?? 0) }}{{ fmtMoney(info.todayProfit ?? 0).replace('¥', '¥ ') }}
                ({{ fmtPct(info.todayProfitPct ?? 0) }})
              </span>
            </div>
          </div>
          <div class="hero-r">
            <div class="kv">
              <span class="k">持仓市值</span>
              <span class="v num">{{ fmtMoney(info.marketValue ?? 0) }}</span>
            </div>
            <div class="kv">
              <span class="k">可用资金</span>
              <span class="v num">{{ fmtMoney(info.available ?? 0) }}</span>
            </div>
            <div class="kv">
              <span class="k">累计收益</span>
              <span class="v num up">{{ sign(info.totalProfit ?? 0) }}{{ fmtMoney(info.totalProfit ?? 0).replace('¥', '¥ ') }} · {{ fmtPct(info.totalProfitPct ?? 0) }}</span>
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

    <!-- ② 收益总览：昨日/本周/本月/本年 -->
    <section class="profit-summary">
      <div v-for="c in periodCards" :key="c.key" class="ps-card panel" :class="c.value >= 0 ? 'up' : 'down'">
        <div class="ps-label">{{ c.label }}</div>
        <div class="ps-value num">
          {{ fmtSignedMoney(c.value).replace('¥', '¥ ') }}
        </div>
        <div class="ps-sub muted">{{ c.sub }}</div>
      </div>
    </section>

    <!-- ③ 收益走势 + 资产配置 -->
    <section class="row-2">
      <div class="panel chart-panel">
        <div class="panel-title">
          <h3>收益走势</h3>
          <span class="sub">vs 沪深300 · 纳斯达克100（{{ account.benchmarkHasRealHs300 ? '沪深300为真实行情' : '沪深300为模拟基准' }}，纳指100为{{ account.benchmarkHasRealNdx ? '真实行情' : '模拟基准' }}）</span>
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
        <EChart :option="equityOption" height="280px" />
      </div>

      <div class="panel chart-panel">
        <div class="panel-title">
          <h3>资产配置</h3>
          <span class="sub">实时</span>
        </div>
        <EChart :option="allocOption" height="340px" />
      </div>
    </section>

    <!-- ⑥ 核心绩效指标 -->
    <section class="panel">
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
    </section>

    <!-- ⑦ 当日收益明细 -->
    <section class="panel">
      <div class="panel-title">
        <h3>当日收益明细</h3>
        <span class="sub">{{ fmtSignedMoney(info.todayProfit ?? 0).replace('¥', '¥ ') }} · {{ fmtPct(info.todayProfitPct ?? 0) }}</span>
      </div>
      <div class="breakdown">
        <div v-for="b in breakdown" :key="b.name" class="bd-row" :class="b.contribution >= 0 ? 'up' : 'down'">
          <div class="bd-left">
            <span class="bd-dot" :style="{ background: b.color }"></span>
            <div class="bd-info">
              <div class="bd-name">{{ b.name }}</div>
              <div class="bd-sub num muted">市值 {{ fmtMoney(b.value) }} · {{ fmtPct(b.trend) }}</div>
            </div>
          </div>
          <div class="bd-right">
            <div class="bd-contribution num">{{ fmtSignedMoney(b.contribution) }}</div>
            <div class="bd-pct num muted">{{ fmtPct(b.contributionPct) }}</div>
          </div>
        </div>
        <div class="bd-total">
          <span>合计</span>
          <span class="num" :class="breakdownTotal >= 0 ? 'up' : 'down'">
            {{ fmtSignedMoney(breakdownTotal) }}
          </span>
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
  gap: $space-4;
}

.hero {
  display: grid;
  grid-template-columns: 2.2fr repeat(4, 1fr);
  gap: $space-3;
}

.hero-card {
  padding: $space-4 $space-5;
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
  display: flex;
  align-items: center;
  gap: $space-2;
}
.quality-chip {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 999px;
  color: $warning;
  background: $gold-soft;
  border: 1px solid rgba(245, 183, 61, 0.28);
  white-space: nowrap;
}
.hero-value { font-size: 34px; font-weight: 700; letter-spacing: -1px; }
.hero-sub { font-size: 13px; color: $text-secondary; }
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
  .k { font-size: 12px; color: $text-tertiary; }
  .v { font-size: 14px; font-weight: 600; }
}

/* ② 收益总览卡片 */
.profit-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $space-3;
}
.ps-card {
  padding: $space-3 $space-4;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-left: 2px solid transparent;
  &.up { border-left-color: $up; }
  &.down { border-left-color: $down; }
}
.ps-label { font-size: 12px; color: $text-secondary; }
.ps-value {
  font-size: 24px;
  font-weight: 700;
  .up & { color: $up; }
  .down & { color: $down; }
}
.ps-sub { font-size: 11px; }

/* 收益走势 + 资产配置 行 */
.row-2 {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: $space-4;
}
.chart-panel {
  display: flex;
  flex-direction: column;
}
.range-stat {
  padding: $space-2 $space-5;
  font-size: 13px;
}

/* 核心绩效指标 */
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
  .m-label { font-size: 12px; color: $text-secondary; }
  .m-value {
    font-size: 22px;
    font-weight: 700;
    &.up { color: $up; }
    &.down { color: $down; }
    &.flat { color: $text-primary; }
  }
  .m-sub { font-size: 11px; color: $text-tertiary; }
}

/* ⑤ 当日收益明细 */
.breakdown { padding: $space-3 $space-5 $space-2; }
.bd-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 0;
  border-bottom: 1px solid $border-subtle;
  &:last-of-type { border-bottom: none; }
}
.bd-left { display: flex; align-items: center; gap: $space-3; min-width: 0; }
.bd-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.bd-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.bd-name { font-size: 13px; font-weight: 500; }
.bd-sub { font-size: 11px; }
.bd-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.bd-contribution { font-size: 14px; font-weight: 600; }
.bd-pct { font-size: 11px; }
.bd-row.up .bd-contribution { color: $up; }
.bd-row.down .bd-contribution { color: $down; }

.bd-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-4 0 $space-2;
  margin-top: $space-2;
  border-top: 1px solid $border-default;
  font-size: 14px;
  font-weight: 600;
  .num.up { color: $up; }
  .num.down { color: $down; }
}
</style>
