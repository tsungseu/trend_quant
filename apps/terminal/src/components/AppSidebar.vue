<script setup>
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

// 策略/基金列表项在详情子路由下也需高亮，其余导航项保持精确匹配
const NESTED_PREFIXES = ['/app/strategies', '/app/funds']
function isActive(to) {
  if (route.path === to) return true
  return NESTED_PREFIXES.includes(to) && route.path.startsWith(`${to}/`)
}

const groups = [
  {
    key: 'research',
    label: '投研',
    items: [
      { to: '/app', label: '总览', icon: 'overview' },
      { to: '/app/market', label: '行情', icon: 'market' },
      { to: '/app/strategies', label: '策略', icon: 'strategy' },
    ],
  },
  {
    key: 'portfolio',
    label: '组合',
    items: [
      { to: '/app/holdings', label: '持仓', icon: 'holding' },
      { to: '/app/trades', label: '交易', icon: 'trade' },
    ],
  },
  {
    key: 'tools',
    label: '工具',
    items: [
      { to: '/app/funds', label: '基金', icon: 'fund' },
      { to: '/app/alerts', label: '预警', icon: 'alert', badge: true },
      { to: '/app/advisor', label: '投顾', icon: 'advisor' },
      { to: '/app/backtest', label: '回测', icon: 'backtest' },
      { to: '/app/news', label: '资讯', icon: 'news' },
    ],
  },
  {
    key: 'data',
    label: '数据',
    items: [
      { to: '/app/data', label: '入口', icon: 'data', soon: true },
    ],
  },
]
</script>

<template>
  <aside class="sidebar">
    <RouterLink to="/app" class="logo" title="趋势量化 · TrendQuant">
      <svg viewBox="0 0 32 32" width="26" height="26">
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
      <span class="logo-text">趋势量化</span>
    </RouterLink>

    <nav>
      <div v-for="group in groups" :key="group.key" class="nav-group">
        <div class="group-label">{{ group.label }}</div>
        <RouterLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item.to) }"
          :title="item.label"
        >
          <span class="ico" v-html="icons[item.icon]"></span>
          <span class="label">{{ item.label }}</span>
          <span v-if="item.soon" class="soon-badge">即将推出</span>
          <span v-else-if="item.badge" class="nav-badge"></span>
        </RouterLink>
      </div>
    </nav>

    <div class="bottom">
      <RouterLink class="nav-item" :to="'/app/settings'" title="设置" :class="{ active: $route.path === '/app/settings' }">
        <span class="ico" v-html="icons.settings"></span>
        <span class="label">设置</span>
      </RouterLink>
      <button class="nav-item" title="帮助">
        <span class="ico" v-html="icons.help"></span>
        <span class="label">帮助</span>
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
  data:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>',
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
  padding: $space-4 $space-2;
  flex-shrink: 0;
  z-index: 10;
  overflow-y: auto;
  overflow-x: hidden;
}

.logo {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: 0 $space-2;
  margin-bottom: $space-5;
  flex-shrink: 0;

  .logo-text {
    font-size: 13px;
    font-weight: 700;
    color: $text-primary;
    white-space: nowrap;
    letter-spacing: 0.01em;
  }
}

nav {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  flex: 1;
  min-height: 0;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: $space-3;
}

.group-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: $text-tertiary;
  padding: 0 $space-2;
  margin-bottom: $space-1;
  text-transform: uppercase;
}

.nav-badge {
  position: absolute;
  top: 9px;
  right: $space-2;
  width: 7px;
  height: 7px;
  background: $danger;
  border-radius: 50%;
  border: 2px solid $bg-base;
}

.soon-badge {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 999px;
  color: $gold;
  background: $gold-soft;
  border: 1px solid rgba(245, 183, 61, 0.28);
  white-space: nowrap;
}

.nav-item {
  position: relative;
  width: 100%;
  height: 36px;
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: 0 $space-2;
  border-radius: $radius-md;
  color: $text-secondary;
  transition: background $transition-fast, color $transition-fast;
  cursor: pointer;

  .ico {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    display: flex;
    :deep(svg) {
      width: 100%;
      height: 100%;
    }
  }
  .label {
    font-size: 13px;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &:hover {
    color: $text-primary;
    background: $bg-hover;
  }

  &.router-link-active,
  &.active {
    color: $brand;
    background: $brand-soft;
    font-weight: 600;
  }
}

.bottom {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
  padding-top: $space-2;
  border-top: 1px solid $border-subtle;
}
</style>
