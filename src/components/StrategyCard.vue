<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { getBacktest } from '@/mock/strategies'
import { fmtMoney } from '@/mock/_helpers'

const props = defineProps({
  strategy: { type: Object, required: true },
})

const bt = getBacktest(props.strategy.id)
const annRet = (bt.metrics['年化收益'] * 100).toFixed(2) + '%'
const sharpe = bt.metrics['夏普比率']
const maxDD = (bt.metrics['最大回撤'] * 100).toFixed(2) + '%'

const statusText = {
  running: '运行中',
  paused: '已暂停',
  stopped: '已停止',
}

// 迷你 sparkline：在脚本中预算 points 字符串，避免模板内多行表达式解析失败
const spark = computed(() => bt.equity.map((e) => e.strategy))
const sparkArea = computed(() => toPoints(spark.value, 200, 50, true))
const sparkLine = computed(() => toPoints(spark.value, 200, 50, false))

function toPoints(arr, w, h, closed) {
  if (!arr.length) return ''
  const min = Math.min(...arr)
  const max = Math.max(...arr)
  const span = max - min || 1
  const pts = arr.map((v, i) => {
    const x = (i / (arr.length - 1)) * w
    const y = h - ((v - min) / span) * (h - 6) - 3
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return closed ? `0,${h} ${pts.join(' ')} ${w},${h}` : pts.join(' ')
}
</script>

<template>
  <RouterLink :to="`/strategies/${strategy.id}`" class="strategy-card panel">
    <div class="head">
      <div class="ico" :style="{ background: strategy.color + '22', color: strategy.color }">
        <span class="icon-dot"></span>
      </div>
      <div class="meta">
        <div class="name">{{ strategy.name }}</div>
        <div class="sub">{{ strategy.market }} · 风险{{ strategy.risk }}</div>
      </div>
      <span class="badge" :class="strategy.status">{{ statusText[strategy.status] }}</span>
    </div>

    <div class="spark-wrap">
      <svg viewBox="0 0 200 50" preserveAspectRatio="none">
        <defs>
          <linearGradient :id="`g-${strategy.id}`" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="strategy.color" stop-opacity="0.3" />
            <stop offset="100%" :stop-color="strategy.color" stop-opacity="0" />
          </linearGradient>
        </defs>
        <polygon
          :points="sparkArea"
          :fill="`url(#g-${strategy.id})`"
        />
        <polyline
          :points="sparkLine"
          fill="none"
          :stroke="strategy.color"
          stroke-width="1.6"
        />
      </svg>
    </div>

    <div class="metrics">
      <div class="m">
        <span class="ml">年化</span>
        <span class="mv up">{{ annRet }}</span>
      </div>
      <div class="m">
        <span class="ml">夏普</span>
        <span class="mv">{{ sharpe }}</span>
      </div>
      <div class="m">
        <span class="ml">回撤</span>
        <span class="mv down">{{ maxDD }}</span>
      </div>
      <div class="m">
        <span class="ml">运行</span>
        <span class="mv">{{ strategy.days }}天</span>
      </div>
    </div>

    <div class="foot">
      <span class="capital">{{ fmtMoney(strategy.capital) }}</span>
      <span class="more">查看详情 ›</span>
    </div>
  </RouterLink>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.strategy-card {
  display: block;
  padding: $space-4 $space-5;
  transition: transform $transition-fast, border-color $transition-fast, box-shadow $transition-fast;
  cursor: pointer;
  &:hover {
    transform: translateY(-3px);
    border-color: $border-default;
    box-shadow: $shadow-md;
  }
}

.head {
  display: flex;
  align-items: center;
  gap: $space-3;
}
.ico {
  width: 36px;
  height: 36px;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  .icon-dot {
    width: 14px;
    height: 14px;
    border-radius: 4px;
    background: currentColor;
    opacity: 0.85;
  }
}
.meta {
  flex: 1;
  min-width: 0;
  .name {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sub {
    font-size: 11px;
    color: $text-tertiary;
  }
}

.spark-wrap {
  height: 50px;
  margin: $space-3 0;
  svg {
    width: 100%;
    height: 100%;
  }
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $space-2;
  padding: $space-3 0;
  border-top: 1px solid $border-subtle;
  border-bottom: 1px solid $border-subtle;
}
.m {
  display: flex;
  flex-direction: column;
  gap: 2px;
  .ml {
    font-size: 10px;
    color: $text-tertiary;
  }
  .mv {
    font-size: 14px;
    font-weight: 600;
    color: $text-primary;
    &.up {
      color: $up;
    }
    &.down {
      color: $down;
    }
  }
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $space-3;
  .capital {
    font-size: 15px;
    font-weight: 700;
    color: $gold;
  }
  .more {
    font-size: 12px;
    color: $brand;
  }
}
</style>
