<script setup>
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

// 策略/基金列表项在详情子路由下也需高亮，其余导航项保持精确匹配
const NESTED_PREFIXES = ['/app/strategies', '/app/funds']
function isActive(to) {
  if (route.path === to) return true
  return NESTED_PREFIXES.includes(to) && route.path.startsWith(`${to}/`)
}

const nav = [
  { to: '/app', label: '总览', icon: 'overview' },
  { to: '/app/market', label: '行情', icon: 'market' },
  { to: '/app/strategies', label: '策略', icon: 'strategy' },
  { to: '/app/holdings', label: '持仓', icon: 'holding' },
  { to: '/app/trades', label: '交易', icon: 'trade' },
]
const tools = [
  { to: '/app/funds', label: '基金', icon: 'fund' },
  { to: '/app/alerts', label: '预警', icon: 'alert', badge: true },
  { to: '/app/advisor', label: '投顾', icon: 'advisor' },
  { to: '/app/backtest', label: '回测', icon: 'backtest' },
  { to: '/app/news', label: '资讯', icon: 'news' },
]
</script>

<template>
  <aside class="sidebar">
    <div class="logo" title="趋势量化 · TrendQuant">
      <svg viewBox="0 0 32 32" width="28" height="28">
        <rect width="32" height="32" rx="8" fill="#3b82f6" />
        <path
          d="M7 21l5-6 4 3 6-9 3 4"
          fill="none"
          stroke="#fff"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>

    <nav>
      <RouterLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ active: isActive(item.to) }"
        :title="item.label"
      >
        <span class="ico" v-html="icons[item.icon]"></span>
        <span class="label">{{ item.label }}</span>
      </RouterLink>

      <div class="nav-divider"></div>

      <RouterLink
        v-for="item in tools"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ active: isActive(item.to) }"
        :title="item.label"
      >
        <span class="ico" v-html="icons[item.icon]"></span>
        <span class="label">{{ item.label }}</span>
        <span v-if="item.badge" class="nav-badge"></span>
      </RouterLink>
    </nav>

    <div class="bottom">
      <RouterLink class="nav-item" :to="'/app/settings'" title="设置" :class="{ active: $route.path === '/app/settings' }">
        <span class="ico" v-html="icons.settings"></span>
      </RouterLink>
      <button class="nav-item" title="帮助">
        <span class="ico" v-html="icons.help"></span>
      </button>
    </div>
  </aside>
</template>

<script>
// 内联 SVG 图标 (Feather 风格)
export const icons = {
  overview:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13h8V3H3z"/><path d="M13 21h8V3h-8z"/></svg>',
  market:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 3 8-8"/><path d="M14 6h7v7"/></svg>',
  strategy:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
  holding:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
  trade:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10l-4 4 4 4"/><path d="M3 14h11a4 4 0 004-4V4"/><path d="M17 14l4 4-4 4"/></svg>',
  settings:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  help:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  alert:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  fund:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
  advisor:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 013 3v1a3 3 0 01-6 0V5a3 3 0 013-3z"/><path d="M5 21v-2a7 7 0 0114 0v2"/><path d="M9 12l2 2 4-4"/></svg>',
  backtest:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
  news:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6z"/></svg>',
}
</script>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.sidebar {
  width: var(--sidebar-w);
  height: 100vh;
  background: var(--sidebar-bg);
  border-right: 1px solid $border-subtle;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-4 0;
  flex-shrink: 0;
  z-index: 10;
}

.logo {
  margin-bottom: $space-6;
}

nav {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  flex: 1;
}

.nav-divider {
  width: 24px;
  height: 1px;
  background: $border-subtle;
  margin: $space-2 auto;
}

.nav-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 7px;
  height: 7px;
  background: $danger;
  border-radius: 50%;
  border: 2px solid $bg-base;
}

.nav-item {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: $radius-md;
  color: $text-tertiary;
  transition: all $transition-fast;
  cursor: pointer;

  .ico {
    width: 22px;
    height: 22px;
    display: flex;
    :deep(svg) {
      width: 100%;
      height: 100%;
    }
  }
  .label {
    font-size: 10px;
    line-height: 1;
  }

  &:hover {
    color: $text-secondary;
    background: rgba(148, 163, 184, 0.06);
  }

  &.router-link-active,
  &.active {
    color: $brand;
    background: $brand-soft;
    &::before {
      content: '';
      position: absolute;
      left: -#{$space-4};
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 22px;
      background: $brand;
      border-radius: 0 3px 3px 0;
    }
  }
}

.bottom {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}
</style>
