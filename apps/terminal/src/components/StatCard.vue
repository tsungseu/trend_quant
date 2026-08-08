<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  sub: { type: String, default: '' },
  tone: { type: String, default: 'flat' }, // up/down/flat/gold/brand
  spark: { type: Array, default: () => [] }, // 迷你 sparkline
  accent: { type: Boolean, default: false },
})

const sparkPoints = computed(() => {
  const arr = props.spark
  if (!arr || arr.length < 2) return ''
  const min = Math.min(...arr)
  const max = Math.max(...arr)
  const span = max - min || 1
  return arr
    .map((v, i) => `${((i / (arr.length - 1)) * 100).toFixed(1)},${(30 - ((v - min) / span) * 26 - 2).toFixed(1)}`)
    .join(' ')
})
</script>

<template>
  <div class="stat-card panel" :class="[tone, { accent }]">
    <div class="top">
      <span class="lbl">{{ label }}</span>
      <span v-if="sub" class="sub">{{ sub }}</span>
    </div>
    <div class="val num" :class="tone">{{ value }}</div>
    <div v-if="spark && spark.length" class="spark">
      <svg viewBox="0 0 100 30" preserveAspectRatio="none">
        <polyline
          :points="sparkPoints"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        />
      </svg>
    </div>
    <slot />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

/* 密集工作台风格：细边框、无发光、左侧色条区分涨跌/强调 */
.stat-card {
  padding: $space-3 $space-4;
  display: flex;
  flex-direction: column;
  gap: $space-2;
  position: relative;
  overflow: hidden;
  border-left: 2px solid transparent;
  transition: border-color $transition-fast, background $transition-fast;

  &:hover {
    background: $bg-panel-2;
  }

  &.up { border-left-color: $up; }
  &.down { border-left-color: $down; }
  &.gold { border-left-color: $gold; }
  &.brand { border-left-color: $brand; }
  &.accent { border-left-color: $brand; }

  .top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: $space-2;
  }
  .lbl {
    font-size: 12px;
    color: $text-secondary;
    white-space: nowrap;
  }
  .sub {
    font-size: 10px;
    color: $text-tertiary;
    text-align: right;
  }
  .val {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: $text-primary;
    &.up { color: $up; }
    &.down { color: $down; }
    &.gold { color: $gold; }
    &.brand { color: $brand; }
  }
  .spark {
    height: 26px;
    opacity: 0.85;
    .up & { color: $up; }
    .down & { color: $down; }
    .gold & { color: $gold; }
    .brand & { color: $brand; }
    svg {
      width: 100%;
      height: 100%;
    }
  }
}
</style>
