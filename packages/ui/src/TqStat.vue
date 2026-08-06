<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  // positive -> up color, negative -> down color, 0/undefined -> muted
  delta: { type: Number, default: undefined },
})

const hasDelta = computed(() => props.delta !== undefined && props.delta !== null)

const deltaClass = computed(() => {
  if (!hasDelta.value || props.delta === 0) return 'flat'
  return props.delta > 0 ? 'up' : 'down'
})

const deltaText = computed(() => {
  if (!hasDelta.value) return ''
  const sign = props.delta > 0 ? '+' : ''
  return `${sign}${props.delta}`
})
</script>

<template>
  <div class="tq-stat">
    <span class="tq-stat-label">{{ label }}</span>
    <span class="tq-stat-value">{{ value }}</span>
    <span v-if="hasDelta" class="tq-stat-delta" :class="deltaClass">{{ deltaText }}</span>
  </div>
</template>

<style scoped>
.tq-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tq-stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.tq-stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
  font-variant-numeric: tabular-nums;
}

.tq-stat-delta {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.tq-stat-delta.up {
  color: var(--up);
}

.tq-stat-delta.down {
  color: var(--down);
}

.tq-stat-delta.flat {
  color: var(--text-tertiary);
}
</style>
