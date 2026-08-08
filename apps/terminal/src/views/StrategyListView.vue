<script setup>
import { ref, computed } from 'vue'
import { strategies, getBacktest } from '@/mock/strategies'
import { fmtMoney } from '@/mock/_helpers'
import StrategyCard from '@/components/StrategyCard.vue'

const filter = ref('all') // all / running / paused / stopped
const sort = ref('ann') // ann / sharpe / dd / capital

// 排序取值：年化/夏普/回撤取自回测指标，资金取自策略本身
function sortValue(s) {
  const m = getBacktest(s.id).metrics || {}
  switch (sort.value) {
    case 'sharpe': return m['夏普比率'] ?? 0
    case 'dd': return m['最大回撤'] ?? 0 // 回撤为负，越大（接近0）越靠前
    case 'capital': return s.capital ?? 0
    case 'ann':
    default: return m['年化收益'] ?? 0
  }
}

const filtered = computed(() => {
  const list = strategies.filter((s) => {
    if (filter.value === 'all') return true
    return s.status === filter.value
  })
  return [...list].sort((a, b) => sortValue(b) - sortValue(a))
})

const stats = computed(() => {
  const total = strategies.reduce((s, x) => s + x.capital, 0)
  const running = strategies.filter((s) => s.status === 'running').length
  return { count: strategies.length, total, running }
})

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'running', label: '运行中' },
  { key: 'paused', label: '已暂停' },
  { key: 'stopped', label: '已停止' },
]

const sorts = [
  { key: 'ann', label: '年化' },
  { key: 'sharpe', label: '夏普' },
  { key: 'dd', label: '回撤' },
  { key: 'capital', label: '资金' },
]
</script>

<template>
  <div class="strategy-list">
    <!-- 概览条 -->
    <section class="summary panel">
      <div class="sum-item">
        <div class="lbl">运行中策略</div>
        <div class="val brand">{{ stats.running }} <span class="dim">/ {{ stats.count }}</span></div>
      </div>
      <div class="sum-item">
        <div class="lbl">策略总资金</div>
        <div class="val gold num">{{ fmtMoney(stats.total) }}</div>
      </div>
      <div class="sum-item">
        <div class="lbl">本月策略收益</div>
        <div class="val up num">+¥18,642.30 <span class="dim">+3.42%</span></div>
      </div>
      <div class="sum-item action">
        <button class="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          新建策略
        </button>
      </div>
    </section>

    <!-- 筛选 + 排序 -->
    <div class="toolbar">
      <div class="seg">
        <button
          v-for="t in tabs"
          :key="t.key"
          :class="{ active: filter === t.key }"
          @click="filter = t.key"
        >{{ t.label }}</button>
      </div>
      <div class="toolbar-r">
        <span class="sort-label">排序</span>
        <div class="seg">
          <button
            v-for="s in sorts"
            :key="s.key"
            :class="{ active: sort === s.key }"
            @click="sort = s.key"
          >{{ s.label }}</button>
        </div>
      </div>
    </div>

    <!-- 策略卡片网格 -->
    <section class="grid">
      <StrategyCard v-for="s in filtered" :key="s.id" :strategy="s" />
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.strategy-list {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr) auto;
  gap: 0;
  padding: 0;
  align-items: stretch;
}
.sum-item {
  padding: $space-4 $space-5;
  border-right: 1px solid $border-subtle;
  display: flex;
  flex-direction: column;
  justify-content: center;
  .lbl {
    font-size: 12px;
    color: $text-secondary;
    margin-bottom: 4px;
  }
  .val {
    font-size: 20px;
    font-weight: 700;
    &.brand {
      color: $brand;
    }
    &.gold {
      color: $gold;
    }
    &.up {
      color: $up;
    }
    .dim {
      font-size: 13px;
      font-weight: 500;
      color: $text-tertiary;
    }
  }
  &.action {
    justify-self: stretch;
    align-items: flex-end;
    border-right: none;
  }
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-4;
}
.toolbar-r {
  display: flex;
  align-items: center;
  gap: $space-3;
}
.sort-label {
  font-size: 12px;
  color: $text-tertiary;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: $space-4;
}
</style>
