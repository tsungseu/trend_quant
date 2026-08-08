<script setup>
import { computed } from 'vue'
import { round } from '@/mock/_helpers'

const props = defineProps({
  value: { type: Number, required: true },
  digits: { type: Number, default: 2 },
  // null => 自动按符号；'up'/'down'/'flat' 强制
  tone: { type: String, default: null },
  showSign: { type: Boolean, default: false },
  pct: { type: Boolean, default: false }, // 显示成百分比
  strong: { type: Boolean, default: false },
})

const cls = computed(() => {
  const t = props.tone
  if (t) return t
  if (props.value > 0) return 'up'
  if (props.value < 0) return 'down'
  return 'flat'
})

const text = computed(() => {
  if (props.pct) {
    const p = round(props.value * 100, props.digits)
    return (props.value > 0 && props.showSign ? '+' : '') + p.toFixed(props.digits) + '%'
  }
  const v = round(props.value, props.digits)
  return (props.value > 0 && props.showSign ? '+' : '') + v.toFixed(props.digits)
})
</script>

<template>
  <span class="price-text num" :class="[cls, { strong }]">{{ text }}</span>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.price-text {
  font-variant-numeric: tabular-nums;
  &.strong {
    font-weight: 600;
  }
  &.up {
    color: $up;
  }
  &.down {
    color: $down;
  }
  &.flat {
    color: $flat;
  }
}
</style>
