<script setup>
import { computed } from 'vue'
import { holdings } from '@/mock/holdings'
import { useAccountStore } from '@/stores/account'
import { useThemeStore } from '@/stores/theme'
import { fmtMoney, fmtPct, sign, chartTheme } from '@/mock/_helpers'
import EChart from '@/components/EChart.vue'

const account = useAccountStore()
const theme = useThemeStore()
const ct = () => (void theme.theme, chartTheme())

const sorted = computed(() =>
  [...holdings].sort((a, b) => b.marketValue - a.marketValue)
)

const totalMV = computed(() => holdings.reduce((s, h) => s + h.marketValue, 0))
const totalCost = computed(() => holdings.reduce((s, h) => s + h.costValue, 0))
const totalProfit = computed(() => totalMV.value - totalCost.value)
const totalProfitPct = computed(() => totalProfit.value / totalCost.value)
const profitCount = computed(() => holdings.filter((h) => h.profit > 0).length)

// 持仓行业分布
const sectorPie = computed(() => {
  const map = {}
  holdings.forEach((h) => {
    map[h.sector] = (map[h.sector] || 0) + h.marketValue
  })
  const colors = ['#3b82f6', '#a855f7', '#f5b73d', '#22c55e', '#06b6d4', '#ef4444', '#ec4899']
  return Object.entries(map).map(([name, value], i) => ({
    name,
    value: +value.toFixed(2),
    itemStyle: { color: colors[i % colors.length] },
  }))
})

const sectorOption = computed(() => {
  const t = ct()
  return {
  tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
  legend: {
    bottom: 0,
    icon: 'circle',
    itemWidth: 7,
    itemHeight: 7,
    textStyle: { color: t.secondary, fontSize: 11 },
  },
  series: [{
    type: 'pie',
    radius: ['46%', '70%'],
    center: ['50%', '42%'],
    avoidLabelOverlap: false,
    label: { show: false },
    itemStyle: { borderColor: 'var(--bg-panel)', borderWidth: 2 },
    data: sectorPie.value,
  }],
  }
})

// 持仓盈亏柱
const profitBarOption = computed(() => {
  const t = ct()
  return {
  grid: { left: 16, right: 16, top: 16, bottom: 24, containLabel: true },
  xAxis: {
    type: 'category',
    data: sorted.value.map((h) => h.name),
    axisLine: { lineStyle: { color: t.axis } },
    axisLabel: { color: t.label, fontSize: 10, interval: 0, rotate: 30 },
    axisTick: { show: false },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: t.label, fontSize: 11, formatter: (v) => (v / 10000).toFixed(0) + 'w' },
    splitLine: { lineStyle: { color: t.split } },
  },
  tooltip: { trigger: 'axis' },
  series: [{
    type: 'bar',
    data: sorted.value.map((h) => ({
      value: h.profit,
      itemStyle: { color: h.profit >= 0 ? '#ef4444' : '#22c55e', borderRadius: [4, 4, 0, 0] },
    })),
    barWidth: '50%',
  }],
  }
})
</script>

<template>
  <div class="holdings">
    <!-- 概览 -->
    <section class="summary panel">
      <div class="sm">
        <div class="lbl">持仓市值</div>
        <div class="val gold num">{{ fmtMoney(totalMV) }}</div>
      </div>
      <div class="sm">
        <div class="lbl">持仓成本</div>
        <div class="val num">{{ fmtMoney(totalCost) }}</div>
      </div>
      <div class="sm">
        <div class="lbl">累计盈亏</div>
        <div class="val num up">{{ sign(totalProfit) }}{{ fmtMoney(totalProfit) }}</div>
      </div>
      <div class="sm">
        <div class="lbl">累计收益率</div>
        <div class="val up num">{{ fmtPct(totalProfitPct) }}</div>
      </div>
      <div class="sm">
        <div class="lbl">持仓只数</div>
        <div class="val num">{{ holdings.length }} <span class="dim">只</span></div>
      </div>
      <div class="sm">
        <div class="lbl">盈亏比 (盈/亏)</div>
        <div class="val num">{{ profitCount }} / {{ holdings.length - profitCount }}</div>
      </div>
    </section>

    <!-- 行业分布 + 盈亏柱 -->
    <section class="row">
      <div class="panel">
        <div class="panel-title"><h3>行业分布</h3><span class="sub">按市值</span></div>
        <EChart :option="sectorOption" height="280px" />
      </div>
      <div class="panel">
        <div class="panel-title"><h3>个股盈亏</h3><span class="sub">元</span></div>
        <EChart :option="profitBarOption" height="280px" />
      </div>
    </section>

    <!-- 持仓表 -->
    <section class="panel">
      <div class="panel-title">
        <h3>持仓明细</h3>
        <div class="tb-actions">
          <input class="filter-input" placeholder="筛选代码/名称" />
          <button class="btn btn-ghost btn-sm">导出</button>
        </div>
      </div>
      <table class="h-table">
        <thead>
          <tr>
            <th>代码 / 名称</th>
            <th class="r">持仓</th>
            <th class="r">成本价</th>
            <th class="r">现价</th>
            <th class="r">市值</th>
            <th class="r">盈亏</th>
            <th class="r">收益率</th>
            <th class="r">仓位</th>
            <th class="c">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in sorted" :key="h.code">
            <td>
              <div class="sym">
                <span class="nm">{{ h.name }}</span>
                <span class="cd">{{ h.code }}</span>
              </div>
            </td>
            <td class="r num">{{ h.qty.toLocaleString() }}</td>
            <td class="r num dim">{{ h.costPrice }}</td>
            <td class="r num" :class="h.price >= h.costPrice ? 'up' : 'down'">{{ h.price }}</td>
            <td class="r num">{{ fmtMoney(h.marketValue).replace('¥', '¥ ') }}</td>
            <td class="r num" :class="h.profit > 0 ? 'up' : 'down'">{{ sign(h.profit) }}{{ fmtMoney(h.profit).replace('¥', '¥ ') }}</td>
            <td class="r">
              <span class="pct-pill num" :class="h.profit > 0 ? 'up' : 'down'">
                {{ fmtPct(h.profitPct) }}
              </span>
            </td>
            <td class="r">
              <div class="bar-wrap">
                <div class="bar" :style="{ width: (h.weight * 100).toFixed(1) + '%' }"></div>
                <span class="num">{{ (h.weight * 100).toFixed(1) }}%</span>
              </div>
            </td>
            <td class="c">
              <button class="op buy">买</button>
              <button class="op sell">卖</button>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>合计</td>
            <td class="r"></td>
            <td class="r"></td>
            <td class="r"></td>
            <td class="r num gold">{{ fmtMoney(totalMV).replace('¥', '¥ ') }}</td>
            <td class="r num up">{{ sign(totalProfit) }}{{ fmtMoney(totalProfit).replace('¥', '¥ ') }}</td>
            <td class="r up num">{{ fmtPct(totalProfitPct) }}</td>
            <td class="r num">100%</td>
            <td class="c"></td>
          </tr>
        </tfoot>
      </table>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.holdings {
  display: flex;
  flex-direction: column;
  gap: $space-5;
}

.summary {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1px;
  background: $border-subtle;
  padding: 1px;
}
.sm {
  background: $bg-panel;
  padding: $space-4 $space-5;
  display: flex;
  flex-direction: column;
  gap: 4px;
  .lbl {
    font-size: 11px;
    color: $text-tertiary;
  }
  .val {
    font-size: 20px;
    font-weight: 700;
    &.up { color: $up; }
    &.gold { color: $gold; }
    .dim {
      font-size: 12px;
      color: $text-tertiary;
      font-weight: 400;
    }
  }
}

.row {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: $space-5;
}

.tb-actions {
  display: flex;
  gap: $space-2;
}
.filter-input {
  background: $bg-panel-2;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  padding: 6px 12px;
  font-size: 12px;
  color: $text-primary;
  outline: none;
  width: 160px;
  &::placeholder {
    color: $text-tertiary;
  }
}

.h-table {
  width: 100%;
  border-collapse: collapse;
  th, td {
    padding: $space-3 $space-5;
    font-size: 13px;
    border-bottom: 1px solid $border-subtle;
    white-space: nowrap;
  }
  th {
    color: $text-tertiary;
    font-weight: 500;
    font-size: 11px;
    background: $bg-panel-2;
    position: sticky;
    top: 0;
  }
  th.r, td.r {
    text-align: right;
  }
  th.c, td.c {
    text-align: center;
  }
  tfoot td {
    background: $bg-panel-2;
    font-weight: 600;
    border-top: 1px solid $border-default;
    border-bottom: none;
  }
  tbody tr:hover {
    background: $bg-panel-2;
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

.pct-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  &.up {
    color: $up;
    background: $up-bg;
  }
  &.down {
    color: $down;
    background: $down-bg;
  }
}

.bar-wrap {
  display: flex;
  align-items: center;
  gap: $space-2;
  width: 80px;
  justify-content: flex-end;
  .bar {
    height: 5px;
    background: $brand;
    border-radius: 3px;
    min-width: 4px;
  }
  span {
    font-size: 11px;
    color: $text-secondary;
    min-width: 36px;
    text-align: right;
  }
}

.op {
  width: 28px;
  height: 24px;
  border-radius: $radius-sm;
  font-size: 11px;
  font-weight: 500;
  margin: 0 2px;
  &.buy {
    color: $up;
    border: 1px solid $up;
    background: transparent;
    &:hover {
      background: $up-bg;
    }
  }
  &.sell {
    color: $down;
    border: 1px solid $down;
    background: transparent;
    &:hover {
      background: $down-bg;
    }
  }
}
</style>
