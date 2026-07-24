<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAccountStore } from '@/stores/account'
import { useMarketStore } from '@/stores/market'
import { useThemeStore } from '@/stores/theme'
import { useAlertsStore } from '@/stores/alerts'
import { fmtMoney, fmtPct } from '@/mock/_helpers'

const route = useRoute()
const account = useAccountStore()
const market = useMarketStore()
const theme = useThemeStore()
const alerts = useAlertsStore()

const totalNotif = computed(() => alerts.unreadFundNotifs)

const titleMap = {
  '/': '资产总览',
  '/market': '行情看盘',
  '/strategies': '量化策略',
  '/holdings': '我的持仓',
  '/trades': '交易记录',
  '/alerts': '预警中心',
  '/advisor': 'AI 投顾',
  '/backtest': '回测编辑器',
  '/news': '资讯',
  '/funds': '基金量化',
}

const pageTitle = computed(() => {
  if (route.path.startsWith('/strategies/')) return '策略详情'
  if (route.path.startsWith('/funds/')) return '基金详情'
  return titleMap[route.path] || '趋势量化'
})

const isDark = computed(() => theme.theme === 'dark')

const totalAssets = computed(() => account.info.totalAssets)
</script>

<template>
  <header class="topbar">
    <div class="left">
      <h1 class="title">{{ pageTitle }}</h1>
      <div class="date">2026-07-17 · 周五</div>
    </div>

    <!-- 三大指数滚动 -->
    <div class="indices">
      <div
        v-for="idx in market.stocks.filter((s) => s.isIndex)"
        :key="idx.code"
        class="idx"
      >
        <span class="idx-name">{{ idx.name }}</span>
        <span class="num" :class="idx.changePct > 0 ? 'up' : 'down'">{{
          idx.price.toLocaleString()
        }}</span>
        <span class="num pct" :class="idx.changePct > 0 ? 'up' : 'down'">
          {{ fmtPct(idx.changePct) }}
        </span>
      </div>
    </div>

    <div class="right">
      <div class="search">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
        <input placeholder="搜索股票 / 代码 / 策略" />
        <kbd>⌘K</kbd>
      </div>

      <div class="assets">
        <div class="lbl">总资产</div>
        <div class="val num">{{ fmtMoney(totalAssets) }}</div>
      </div>

      <button class="icon-btn theme-toggle" :title="isDark ? '切换到浅色' : '切换到深色'" @click="theme.toggle">
        <!-- 太阳（浅色时显示，点击切深） -->
        <svg v-if="!isDark" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
        <!-- 月亮（深色时显示，点击切浅） -->
        <svg v-else viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      </button>

      <RouterLink to="/alerts" class="icon-btn" title="通知">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" />
        </svg>
        <span v-if="totalNotif" class="dot notif-count">{{ totalNotif }}</span>
        <span v-else class="dot"></span>
      </RouterLink>

      <div class="user">
        <div class="avatar">徐</div>
        <div class="user-info">
          <div class="uname">徐先生</div>
          <div class="uid">VIP · 实盘</div>
        </div>
      </div>
    </div>
  </header>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.topbar {
  height: var(--topbar-h);
  display: flex;
  align-items: center;
  gap: $space-6;
  padding: 0 $space-6;
  border-bottom: 1px solid $border-subtle;
  background: rgba(14, 20, 34, 0.7);
  backdrop-filter: blur(12px);
  flex-shrink: 0;
}

.left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 120px;
  .title {
    font-size: 17px;
    font-weight: 600;
  }
  .date {
    font-size: 11px;
    color: $text-tertiary;
  }
}

.indices {
  display: flex;
  gap: $space-6;
  margin-left: auto;
  margin-right: auto;
}
.idx {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  .idx-name {
    font-size: 11px;
    color: $text-tertiary;
  }
  .num {
    font-size: 13px;
    font-weight: 600;
    &.pct {
      font-size: 11px;
      font-weight: 500;
    }
  }
}

.right {
  display: flex;
  align-items: center;
  gap: $space-4;
  margin-left: auto;
}

.search {
  display: flex;
  align-items: center;
  gap: $space-2;
  width: 240px;
  height: 34px;
  padding: 0 $space-3;
  background: $bg-panel-2;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  color: $text-tertiary;

  input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: $text-primary;
    font-size: 13px;
    &::placeholder {
      color: $text-tertiary;
    }
  }
  kbd {
    font-size: 10px;
    padding: 1px 5px;
    background: $bg-elevated;
    border-radius: 4px;
    color: $text-secondary;
  }
}

.assets {
  text-align: right;
  .lbl {
    font-size: 10px;
    color: $text-tertiary;
  }
  .val {
    font-size: 15px;
    font-weight: 700;
    color: $gold;
  }
}

.icon-btn {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-md;
  color: $text-secondary;
  transition: all $transition-fast;
  &:hover {
    background: $bg-panel-2;
    color: $text-primary;
  }
  .dot {
    position: absolute;
    top: 8px;
    right: 9px;
    width: 7px;
    height: 7px;
    background: $danger;
    border-radius: 50%;
    border: 2px solid $bg-app;
  }
  .notif-count {
    width: auto;
    height: auto;
    min-width: 16px;
    padding: 0 4px;
    font-size: 10px;
    line-height: 12px;
    color: #fff;
    text-align: center;
    top: 4px;
    right: 0;
  }
}

.user {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding-left: $space-3;
  border-left: 1px solid $border-subtle;
}
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, $brand, $purple);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}
.user-info {
  .uname {
    font-size: 13px;
    font-weight: 600;
  }
  .uid {
    font-size: 10px;
    color: $gold;
  }
}
</style>
