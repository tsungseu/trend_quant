<script setup>
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'ghost'].includes(v),
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['md', 'lg'].includes(v),
  },
  // when set, renders an <a> instead of a <button>
  href: { type: String, default: '' },
  type: { type: String, default: 'button' },
})
</script>

<template>
  <a v-if="href" :href="href" class="tq-btn" :class="[variant, size]">
    <slot />
  </a>
  <button v-else :type="type" class="tq-btn" :class="[variant, size]">
    <slot />
  </button>
</template>

<style scoped>
.tq-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  border: 1px solid transparent;
  font-family: inherit;
  font-weight: 600;
  line-height: 1.2;
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.15s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.15s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.tq-btn:active {
  transform: translateY(1px);
}

.tq-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Sizes */
.tq-btn.md {
  height: 36px;
  padding: 0 16px;
  font-size: 14px;
}

.tq-btn.lg {
  height: 44px;
  padding: 0 24px;
  font-size: 15px;
}

/* Variants */
.tq-btn.primary {
  background: var(--brand);
  border-color: var(--brand);
  color: var(--text-inverse);
}

.tq-btn.primary:hover {
  background: var(--brand-hover);
  border-color: var(--brand-hover);
}

.tq-btn.secondary {
  background: var(--bg-elevated);
  border-color: var(--border-default);
  color: var(--text-primary);
}

.tq-btn.secondary:hover {
  background: var(--bg-hover);
  border-color: var(--border-strong);
}

.tq-btn.ghost {
  background: transparent;
  border-color: transparent;
  color: var(--text-secondary);
}

.tq-btn.ghost:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
</style>
