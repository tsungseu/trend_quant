<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  // route-based link, rendered as <RouterLink>
  to: { type: [String, Object], default: null },
  // plain link, rendered as <a> (used when `to` is not provided)
  href: { type: String, default: '' },
  activeClass: { type: String, default: 'is-active' },
})
</script>

<template>
  <RouterLink v-if="to" :to="to" class="tq-nav-link" :active-class="activeClass">
    <slot />
  </RouterLink>
  <a v-else :href="href" class="tq-nav-link">
    <slot />
  </a>
</template>

<style scoped>
.tq-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.tq-nav-link:hover {
  color: var(--text-primary);
}

.tq-nav-link.is-active {
  color: var(--brand);
}
</style>
