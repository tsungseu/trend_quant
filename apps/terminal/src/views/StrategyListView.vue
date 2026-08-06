<script setup>
import { ref, computed } from 'vue'
import { strategies } from '@/mock/strategies'
import { fmtMoney } from '@/mock/_helpers'
import StrategyCard from '@/components/StrategyCard.vue'

const filter = ref('all') // all / running / paused / stopped
const sort = ref('ann') // ann / sharpe / dd / capital

const filtered = computed(() => {
  let list = strategies.filter((s) => {
    if (filter.value === 'all') return true
    return s.status === filter.value
  })
  return list
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

    <!-- 筛选 -->
    <div class="toolbar">
      <div class="seg">
        <button
          v-for="t in tabs"
          :key="t.key"
          :class="{ active: filter === t.key }"
          @click="filter = t.key"
        >{{ t.label }}</button>
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
  gap: $space-5;
}

.summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr) auto;
  gap: $space-6;
  padding: $space-5 $space-6;
  align-items: center;
}
.sum-item {
  .lbl {
    font-size: 12px;
    color: $text-secondary;
    margin-bottom: 4px;
  }
  .val {
    font-size: 22px;
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
    justify-self: end;
  }
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: $space-5;
}
</style>
