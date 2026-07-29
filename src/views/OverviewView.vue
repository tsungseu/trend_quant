<script setup>
import { computed, ref } from 'vue'
import { useAccountStore } from '@/stores/account'
import { useThemeStore } from '@/stores/theme'
import { fmtMoney, fmtPct, sign, round, chartTheme } from '@/mock/_helpers'
import StatCard from '@/components/StatCard.vue'
import EChart from '@/components/EChart.vue'

const account = useAccountStore()
const theme = useThemeStore()
const ct = () => (void theme.theme, chartTheme())

const info = computed(() => account.info)

// ---- 收益走势区间切换 ----
const ranges = [
  { key: '1D', label: '1日' },
  { key: '1W', label: '1周' },
  { key: '1M', label: '1月' },
  { key: '3M', label: '3月' },
  { key: '1Y', label: '1年' },
  { key: 'ALL', label: '成立以来' },
]

// ---- 收益走势 vs 市场基准（组合 / 沪深300 / 纳斯达克100，净值化%）----
const equityOption = computed(() => {
  const t = ct()
  const c = account.curve
  if (!c || c.length < 2) return { series: [] }
  const bench = account.vsBenchmark || []
  const benchByDate = new Map(bench.map((p) => [p.date, p]))
  // 只有基准能覆盖至少一半区间点时才叠加基准线，避免大量 null 导致 ECharts 报错
  const covered = c.filter((p) => benchByDate.has(p.date)).length
  const hasBench = covered >= Math.ceil(c.length / 2)
  const baseVal = c[0].value
  const baseHs = hasBench ? benchByDate.get(c[0].date)?.hs300 : null
  const baseNdx = hasBench ? benchByDate.get(c[0].date)?.ndx100 : null
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
      name: '沪深300', type: 'line', smooth: true, symbol: 'none',
      data: c.map((p) => {
        const b = benchByDate.get(p.date)
        return b && baseHs ? round((b.hs300 / baseHs - 1) * 100, 2) : '-'
      }),
      lineStyle: { width: 1.5, color: '#f5b73d' },
      connectNulls: true,
    })
    series.push({
      name: '纳斯达克100', type: 'line', smooth: true, symbol: 'none',
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
      data: hasBench ? ['我的组合', '沪深300', '纳斯达克100'] : ['我的组合'],
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
        formatter: () => '{a|总资产}\n{b|' + fmtMoney(info.value.totalAssets) + '}',
        rich: { a: { color: t.secondary, fontSize: 12, padding: [0, 0, 6, 0] }, b: { color: '#f5b73d', fontSize: 18, fontWeight: 'bold' } },
      },
      labelLine: { show: false },
      itemStyle: { borderColor: 'var(--bg-panel)', borderWidth: 3 },
      data: info.value.allocations.map((a) => ({ value: a.value, name: a.name, itemStyle: { color: a.color } })),
    }],
  }
})

// ---- 顶部收益总览卡片：昨日/本周/本月/本年 收益金额 ----
const periodCards = computed(() => {
  const p = account.periodProfits
  return [
    { key: 'day', label: '昨日收益(元)', value: p.day, sub: '相较前日' },
    { key: 'week', label: '本周收益(元)', value: p.week, sub: '本周累计' },
    { key: 'month', label: '本月收益(元)', value: p.month, sub: '本月累计' },
    { key: 'year', label: '本年收益(元)', value: p.year, sub: '年初至今' },
  ]
})

// ---- 收益日历：日/周/月/年 四级视图 ----
const calRange = ref('month')   // day | week | month | year
const calUnit = ref('abs')      // abs(¥) | pct(%)

// 按周聚合：每周收益（周一为周首），用于"周"视图柱状图
const weeklyReturns = computed(() => {
  const all = account.dailyReturns
  const map = new Map() // weekKey -> { profit, ret, days }
  for (const d of all) {
    const date = new Date(d.date)
    // 周一为一周起点
    const day = date.getDay() || 7
    const monday = new Date(date)
    monday.setDate(date.getDate() - day + 1)
    const key = monday.toISOString().slice(0, 10)
    const w = map.get(key) || { weekStart: key, profit: 0, ret: 1, days: 0 }
    w.profit += d.profit
    w.ret *= (1 + d.ret)
    w.days += 1
    map.set(key, w)
  }
  return [...map.values()]
    .map((w) => ({ ...w, ret: w.ret - 1 }))
    .slice(-8) // 近 8 周
})

// 取值函数：按当前单位
const fmtCalVal = (v) => calUnit.value === 'pct' ? (v * 100).toFixed(2) + '%' : (v > 0 ? '+' : '') + Math.round(v).toLocaleString()
const fmtCalValShort = (v) => {
  if (calUnit.value === 'pct') return (v * 100).toFixed(1)
  const abs = Math.abs(v)
  if (abs >= 10000) return (v / 10000).toFixed(1) + '万'
  return Math.round(v).toString()
}

// "周"视图 ECharts 柱状图（红涨绿跌）
const weeklyOption = computed(() => {
  const t = ct()
  const weeks = weeklyReturns.value
  const isPct = calUnit.value === 'pct'
  const valOf = (d) => isPct ? d.ret : d.profit
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const w = weeks[params[0].dataIndex]
        if (!w) return ''
        return `${w.weekStart} 起<br/>收益：<b style="color:${w.profit >= 0 ? '#ef4444' : '#22c55e'}">${fmtCalVal(valOf(w))}</b><br/>${w.days} 个交易日`
      },
    },
    grid: { left: 44, right: 16, top: 16, bottom: 28, containLabel: true },
    xAxis: {
      type: 'category',
      data: weeks.map((w) => {
        const d = new Date(w.weekStart)
        return `${d.getMonth() + 1}/${d.getDate()}`
      }),
      axisLine: { lineStyle: { color: t.axis } },
      axisLabel: { color: t.label, fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value', scale: true,
      axisLabel: { color: t.label, fontSize: 11, formatter: (v) => isPct ? v + '%' : (v / 10000).toFixed(1) + '万' },
      splitLine: { lineStyle: { color: t.split } },
    },
    series: [{
      type: 'bar',
      data: weeks.map((w) => ({
        value: valOf(w),
        itemStyle: { color: w.profit >= 0 ? '#ef4444' : '#22c55e', borderRadius: [4, 4, 0, 0] },
      })),
      barWidth: '45%',
      label: {
        show: true, position: 'top',
        formatter: (p) => fmtCalValShort(valOf(weeks[p.dataIndex])),
        color: t.tertiary, fontSize: 10,
      },
    }],
  }
})

// "月"视图：近6周按周一列对齐的网格（纯 HTML 渲染）
const monthGrid = computed(() => {
  const map = new Map(account.dailyReturns.map((d) => [d.date, d]))
  const all = account.dailyReturns
  const last = all[all.length - 1]?.date
  if (!last) return { weeks: [] }
  // 取近 6 周（42 天），按周一为列首对齐
  const end = new Date(last)
  const endDay = end.getDay() || 7
  const sunday = new Date(end)
  sunday.setDate(end.getDate() - (endDay - 1) + 6) // 本周日
  const start = new Date(sunday)
  start.setDate(sunday.getDate() - 41) // 往前 6 周
  const weeks = []
  const isPct = calUnit.value === 'pct'
  const valOf = (d) => (isPct ? d.ret : d.profit)
  for (let w = 0; w < 6; w++) {
    const row = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + w * 7 + i)
      const key = d.toISOString().slice(0, 10)
      const item = map.get(key)
      row.push({
        date: key,
        day: d.getDate(),
        inMonth: d.getMonth() === new Date(last).getMonth(),
        hasData: !!item,
        val: item ? valOf(item) : null,
        raw: item,
      })
    }
    weeks.push(row)
  }
  return { weeks }
})

// "年"视图：近 12 个月，每月一行 31 格（纯 HTML，按月分组）
const yearGrid = computed(() => {
  const map = new Map(account.dailyReturns.map((d) => [d.date, d]))
  const all = account.dailyReturns
  const last = all[all.length - 1]?.date
  if (!last) return { months: [] }
  const lastD = new Date(last)
  const isPct = calUnit.value === 'pct'
  const valOf = (d) => (isPct ? d.ret : d.profit)
  const months = []
  for (let m = 11; m >= 0; m--) {
    const ref = new Date(lastD.getFullYear(), lastD.getMonth() - m, 1)
    const y = ref.getFullYear()
    const mo = ref.getMonth()
    const daysInMonth = new Date(y, mo + 1, 0).getDate()
    const cells = []
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${y}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const item = map.get(key)
      cells.push({
        date: key,
        day,
        hasData: !!item,
        val: item ? valOf(item) : null,
        raw: item,
      })
    }
    months.push({ label: `${y}-${String(mo + 1).padStart(2, '0')}`, cells })
  }
  return { months }
})

// 颜色：根据收益值返回背景色（红涨绿跌，幅度决定深浅）
const cellColor = (val) => {
  if (val == null) return 'transparent'
  if (val === 0) return 'rgba(148,163,184,0.12)'
  const isPct = calUnit.value === 'pct'
  const abs = Math.abs(val)
  const max = isPct ? 0.03 : 5000
  const intensity = Math.min(abs / max, 1)
  const alpha = 0.25 + intensity * 0.65
  return val >= 0 ? `rgba(239,68,68,${alpha})` : `rgba(34,197,94,${alpha})`
}

// "日"视图数据：最近一个交易日 + 近 7 日对比
const dayView = computed(() => {
  const all = account.dailyReturns
  const last = all[all.length - 1] || { profit: 0, ret: 0, date: '' }
  const recent = all.slice(-7)
  const sum = recent.reduce((s, d) => s + d.profit, 0)
  return { last, recent, weekSum: sum, weekSumPct: recent.reduce((s, d) => s + d.ret, 0) }
})

// 当日收益明细
const breakdown = computed(() => account.todayBreakdown)
const breakdownTotal = computed(() => breakdown.value.reduce((s, b) => s + b.contribution, 0))

// 日视图近7日柱状图高度（按绝对值占比，最大 100%）
function barHeight(d) {
  const vals = dayView.value.recent.map((x) => Math.abs(calUnit.value === 'pct' ? x.ret : x.profit))
  const max = Math.max(...vals, 1)
  const v = Math.abs(calUnit.value === 'pct' ? d.ret : d.profit)
  return Math.max(8, Math.round((v / max) * 100))
}
</script>

<template>
  <div class="overview">
    <!-- ① 顶部资产大卡 + 收益总览卡片 -->
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

    <!-- ② 收益总览：昨日/本周/本月/本年 -->
    <section class="profit-summary">
      <div v-for="c in periodCards" :key="c.key" class="ps-card panel" :class="c.value >= 0 ? 'up' : 'down'">
        <div class="ps-label">{{ c.label }}</div>
        <div class="ps-value num">
          {{ c.value > 0 ? '+' : '' }}{{ c.value.toLocaleString() }}
        </div>
        <div class="ps-sub muted">{{ c.sub }}</div>
      </div>
    </section>

    <!-- ③ 收益走势 + 资产配置 -->
    <section class="row-2">
      <div class="panel chart-panel">
        <div class="panel-title">
          <h3>收益走势</h3>
          <span class="sub">vs 沪深300 · 纳斯达克100</span>
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

    <!-- ④ 收益日历 -->
    <section class="panel">
      <div class="panel-title">
        <h3>收益日历</h3>
        <div class="cal-controls">
          <div class="seg cal-range-seg">
            <button :class="{ active: calRange === 'day' }" @click="calRange = 'day'">日</button>
            <button :class="{ active: calRange === 'week' }" @click="calRange = 'week'">周</button>
            <button :class="{ active: calRange === 'month' }" @click="calRange = 'month'">月</button>
            <button :class="{ active: calRange === 'year' }" @click="calRange = 'year'">年</button>
          </div>
          <div class="seg cal-unit-seg">
            <button :class="{ active: calUnit === 'abs' }" @click="calUnit = 'abs'">¥</button>
            <button :class="{ active: calUnit === 'pct' }" @click="calUnit = 'pct'">%</button>
          </div>
        </div>
      </div>

      <!-- 日视图：单日大卡片 -->
      <div v-if="calRange === 'day'" class="cal-day">
        <div class="cd-main" :class="dayView.last.profit >= 0 ? 'up' : 'down'">
          <div class="cd-date muted">{{ dayView.last.date }} 收益</div>
          <div class="cd-value num">
            {{ calUnit === 'pct' ? fmtPct(dayView.last.ret) : (dayView.last.profit > 0 ? '+' : '') + '¥' + Math.round(dayView.last.profit).toLocaleString() }}
          </div>
        </div>
        <div class="cd-recent">
          <div class="cdr-title muted">近 7 日</div>
          <div class="cdr-bars">
            <div v-for="(d, i) in dayView.recent" :key="i" class="cdr-col" :title="d.date + ': ' + fmtCalVal(calUnit === 'pct' ? d.ret : d.profit)">
              <div class="cdr-bar" :class="d.profit >= 0 ? 'up' : 'down'">
                <div class="cdr-fill" :style="{ height: barHeight(d) + '%' }"></div>
              </div>
              <div class="cdr-val num" :class="d.profit >= 0 ? 'up' : 'down'">{{ fmtCalValShort(calUnit === 'pct' ? d.ret : d.profit) }}</div>
              <div class="cdr-day muted">{{ new Date(d.date).getDate() }}</div>
            </div>
          </div>
          <div class="cdr-sum">
            <span class="muted">本周合计</span>
            <span class="num" :class="dayView.weekSum >= 0 ? 'up' : 'down'">
              {{ calUnit === 'pct' ? fmtPct(dayView.weekSumPct) : (dayView.weekSum > 0 ? '+' : '') + '¥' + Math.round(dayView.weekSum).toLocaleString() }}
            </span>
          </div>
        </div>
      </div>

      <!-- 周视图：柱状图 -->
      <div v-else-if="calRange === 'week'" class="cal-chart">
        <EChart :option="weeklyOption" height="260px" />
      </div>

      <!-- 月视图：HTML 网格 -->
      <div v-else-if="calRange === 'month'" class="cal-month">
        <div class="cm-weekday">
          <span v-for="w in ['周一','周二','周三','周四','周五','周六','周日']" :key="w">{{ w }}</span>
        </div>
        <div class="cm-grid">
          <template v-for="(week, wi) in monthGrid.weeks" :key="wi">
            <div
              v-for="(c, ci) in week"
              :key="wi + '-' + ci"
              class="cm-cell"
              :class="{ dim: !c.inMonth, empty: !c.hasData }"
              :style="{ background: c.hasData ? cellColor(c.val) : '' }"
              :title="c.date + (c.hasData ? '：' + fmtCalVal(c.val) : '')"
            >
              <span class="cm-day">{{ c.day }}</span>
              <span v-if="c.hasData" class="cm-val">{{ fmtCalValShort(c.val) }}</span>
            </div>
          </template>
        </div>
      </div>

      <!-- 年视图：12 个月小日历 -->
      <div v-else class="cal-year">
        <div v-for="mo in yearGrid.months" :key="mo.label" class="cy-month">
          <div class="cy-label muted">{{ mo.label }}</div>
          <div class="cy-cells">
            <div
              v-for="c in mo.cells"
              :key="c.date"
              class="cy-cell"
              :class="{ empty: !c.hasData }"
              :style="{ background: c.hasData ? cellColor(c.val) : '' }"
              :title="c.date + (c.hasData ? '：' + fmtCalVal(c.val) : '')"
            ></div>
          </div>
        </div>
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
        <span class="sub">{{ info.todayProfit >= 0 ? '+' : '' }}¥{{ info.todayProfit.toLocaleString() }} · {{ fmtPct(info.todayProfitPct) }}</span>
      </div>
      <div class="breakdown">
        <div v-for="b in breakdown" :key="b.name" class="bd-row" :class="b.contribution >= 0 ? 'up' : 'down'">
          <div class="bd-left">
            <span class="bd-dot" :style="{ background: b.color }"></span>
            <div class="bd-info">
              <div class="bd-name">{{ b.name }}</div>
              <div class="bd-sub num muted">市值 ¥{{ b.value.toLocaleString() }} · {{ fmtPct(b.trend) }}</div>
            </div>
          </div>
          <div class="bd-right">
            <div class="bd-contribution num">{{ b.contribution > 0 ? '+' : '' }}¥{{ b.contribution.toLocaleString() }}</div>
            <div class="bd-pct num muted">{{ fmtPct(b.contributionPct) }}</div>
          </div>
        </div>
        <div class="bd-total">
          <span>合计</span>
          <span class="num" :class="breakdownTotal >= 0 ? 'up' : 'down'">
            {{ breakdownTotal > 0 ? '+' : '' }}¥{{ Math.round(breakdownTotal).toLocaleString() }}
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
  gap: $space-5;
}

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
.hero-label { font-size: 12px; color: $text-secondary; }
.hero-value { font-size: 36px; font-weight: 700; letter-spacing: -1px; }
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
  gap: $space-4;
}
.ps-card {
  padding: $space-4 $space-5;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-left: 3px solid transparent;
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

/* ③ 收益日历 */
.cal-controls {
  display: flex;
  gap: $space-3;
  align-items: center;
}
.cal-range-seg, .cal-unit-seg {
  display: flex;
  button {
    padding: 3px 12px;
    font-size: 11px;
    &.active { color: $brand; background: $brand-soft; }
  }
}
.cal-chart { padding: $space-2 $space-3; }

/* 月视图 HTML 网格 */
.cal-month { padding: $space-3 $space-4 $space-4; }
.cm-weekday {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 4px;
  span {
    text-align: center;
    font-size: 11px;
    color: $text-tertiary;
  }
}
.cm-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: 1fr;
  gap: 4px;
}
.cm-cell {
  border-radius: 6px;
  padding: 4px 6px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 48px;
  border: 1px solid $border-subtle;
  &.dim { opacity: 0.35; }
  &.empty { background: transparent; }
  .cm-day { font-size: 11px; color: rgba(255,255,255,0.95); font-weight: 600; }
  .cm-val {
    font-size: 10px; color: #fff; font-weight: 500;
    font-family: 'JetBrains Mono', monospace;
    white-space: nowrap; overflow: hidden;
  }
}

/* 年视图 12 个月小日历 */
.cal-year {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $space-3;
  padding: $space-4;
}
.cy-month {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cy-label { font-size: 11px; font-weight: 500; }
.cy-cells {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.cy-cell {
  aspect-ratio: 1;
  border-radius: 2px;
  min-height: 8px;
  &.empty { background: rgba(148,163,184,0.08); }
}

/* 日视图 */
.cal-day {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 1px;
  background: $border-subtle;
  padding: 1px;
}
.cd-main {
  background: $bg-panel;
  padding: $space-6 $space-5;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: $space-2;
  border-left: 4px solid transparent;
  &.up { border-left-color: $up; .cd-value { color: $up; } }
  &.down { border-left-color: $down; .cd-value { color: $down; } }
}
.cd-date { font-size: 12px; }
.cd-value { font-size: 32px; font-weight: 700; }
.cd-recent {
  background: $bg-panel;
  padding: $space-4 $space-5;
  display: flex;
  flex-direction: column;
  gap: $space-2;
}
.cdr-title { font-size: 11px; }
.cdr-bars {
  display: flex;
  align-items: flex-end;
  gap: $space-2;
  flex: 1;
  min-height: 100px;
}
.cdr-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
.cdr-bar {
  width: 100%;
  height: 80px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  .cdr-fill {
    width: 60%;
    border-radius: 3px 3px 0 0;
    transition: height 0.3s $ease;
  }
  &.up .cdr-fill { background: $up; }
  &.down .cdr-fill { background: $down; }
}
.cdr-val { font-size: 10px; font-weight: 600; &.up { color: $up; } &.down { color: $down; } }
.cdr-day { font-size: 10px; }
.cdr-sum {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: $space-2;
  border-top: 1px solid $border-subtle;
  font-size: 13px;
  font-weight: 600;
  .num.up { color: $up; }
  .num.down { color: $down; }
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
