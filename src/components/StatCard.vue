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
    <div class="val num">{{ value }}</div>
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

.stat-card {
  padding: $space-4 $space-5;
  display: flex;
  flex-direction: column;
  gap: $space-2;
  position: relative;
  overflow: hidden;
  transition: transform $transition-fast, border-color $transition-fast;
  &:hover {
    transform: translateY(-2px);
    border-color: $border-default;
  }
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 60%, var(--c, transparent));
    opacity: 0.06;
    pointer-events: none;
  }
  &.up {
    --c: #{$up};
    color: $up;
  }
  &.down {
    --c: #{$down};
    color: $down;
  }
  &.gold {
    --c: #{$gold};
    color: $gold;
  }
  &.brand {
    --c: #{$brand};
    color: $brand;
  }

  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .lbl {
    font-size: 12px;
    color: $text-secondary;
  }
  .sub {
    font-size: 10px;
    color: $text-tertiary;
  }
  .val {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.5px;
    &.up {
      color: $up;
    }
  }
  .spark {
    height: 30px;
    color: inherit;
    opacity: 0.7;
    svg {
      width: 100%;
      height: 100%;
    }
  }
}
</style>
