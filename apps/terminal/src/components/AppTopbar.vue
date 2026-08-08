<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAccountStore } from '@/stores/account'
import { useMarketStore } from '@/stores/market'
import { useThemeStore } from '@/stores/theme'
import { useAlertsStore } from '@/stores/alerts'
import { fmtMoney, fmtPct, fmtThousands } from '@/mock/_helpers'
import { dataModeLabel, runtime } from '@/config/runtime'

const route = useRoute()
const account = useAccountStore()
const market = useMarketStore()
const theme = useThemeStore()
const alerts = useAlertsStore()

const totalNotif = computed(() => alerts.unreadFundNotifs)

// 标题优先使用路由 meta.title，仅在没有 meta 时回退到根名称
const pageTitle = computed(() => route.meta?.title || '趋势量化')

const isDark = computed(() => theme.theme === 'dark')

const totalAssets = computed(() => account.info.totalAssets)
const pickerOpen = ref(false)
const pickerRef = ref(null)
const STORAGE_KEY = 'topbar.overseas.indices'
const overseasAllCodes = Object.keys(market.overseasIndexMeta || {})
const selectedOverseasCodes = ref([])

function loadSelections() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => overseasAllCodes.includes(x)) : []
  } catch {
    return []
  }
}

function saveSelections(codes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes))
}

function togglePicker() {
  pickerOpen.value = !pickerOpen.value
}

function toggleOverseasCode(code) {
  const set = new Set(selectedOverseasCodes.value)
  if (set.has(code)) set.delete(code)
  else set.add(code)
  selectedOverseasCodes.value = overseasAllCodes.filter((x) => set.has(x))
  saveSelections(selectedOverseasCodes.value)
  // 首次勾选某指数但快照尚未拉到时，触发一次补拉；已有时无需重复请求
  const hasData = selectedOverseasCodes.value.every((c) => market.overseasSnapshot[c]?.price)
  if (!hasData) market.fetchOverseasIndices()
}

const visibleOverseas = computed(() => selectedOverseasCodes.value
  .map((code) => ({ code, ...(market.overseasSnapshot[code] || {}) }))
  .filter((item) => Number(item.price) > 0)
)

function onDocClick(e) {
  if (!pickerRef.value) return
  if (!pickerRef.value.contains(e.target)) pickerOpen.value = false
}

// 运行时日期 + 星期（中国习惯）
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const dateLabel = computed(() => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} · ${WEEK[d.getDay()]}`
})

const modeLabel = computed(() => dataModeLabel())
// 数据模式徽标色调：demo=提示色，direct=品牌色，proxy(已配置)=成功色
const modeTone = computed(() => {
  if (runtime.dataMode === 'proxy' && runtime.proxyBase) return 'proxy'
  if (runtime.dataMode === 'direct') return 'direct'
  return 'demo'
})

onMounted(() => {
  selectedOverseasCodes.value = loadSelections()
  // 海外指数快照由 App.vue 的 startIndexSync() 统一拉取并 60s 轮询，
  // 这里只负责按用户选择渲染，无需重复触发请求
  document.addEventListener('click', onDocClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
})
</script>

<template>
  <header class="topbar">
    <div class="left">
      <h1 class="title">{{ pageTitle }}</h1>
      <div class="left-meta">
        <span class="date">{{ dateLabel }}</span>
        <span class="mode-badge" :class="modeTone" :title="modeLabel">{{ modeLabel }}</span>
      </div>
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
          fmtThousands(idx.price)
        }}</span>
        <span class="num pct" :class="idx.changePct > 0 ? 'up' : 'down'">
          {{ fmtPct(idx.changePct) }}
        </span>
      </div>

      <div
        v-for="ov in visibleOverseas"
        :key="ov.code"
        class="idx"
      >
        <span class="idx-name">{{ market.overseasIndexMeta[ov.code] || ov.name || ov.code }}</span>
        <span class="num" :class="(ov.changePct ?? 0) > 0 ? 'up' : 'down'">{{
          fmtThousands(ov.price)
        }}</span>
        <span class="num pct" :class="(ov.changePct ?? 0) > 0 ? 'up' : 'down'">
          {{ fmtPct(ov.changePct ?? 0) }}
        </span>
      </div>

      <div ref="pickerRef" class="idx-picker">
        <button class="add-btn" type="button" @click.stop="togglePicker">+ 添加指数</button>
        <div v-if="pickerOpen" class="picker-pop" @click.stop>
          <label v-for="code in overseasAllCodes" :key="code" class="picker-item">
            <input
              type="checkbox"
              :checked="selectedOverseasCodes.includes(code)"
              @change="toggleOverseasCode(code)"
            />
            <span>{{ market.overseasIndexMeta[code] }}</span>
          </label>
        </div>
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

      <RouterLink to="/app/alerts" class="icon-btn" title="通知">
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
  background: $bg-panel;
  flex-shrink: 0;
}

.left {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 120px;
  .title {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
}

.left-meta {
  display: flex;
  align-items: center;
  gap: $space-2;
}
.date {
  font-size: 11px;
  color: $text-tertiary;
}
.mode-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.6;
  white-space: nowrap;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;

  &::before {
    content: '';
    width: 5px;
    height: 5px;
    flex-shrink: 0;
    border-radius: 50%;
    background: currentColor;
  }

  &.demo {
    color: $warning;
    background: $gold-soft;
  }
  &.direct {
    color: $brand;
    background: $brand-soft;
  }
  &.proxy {
    color: $success;
    background: rgba(34, 197, 94, 0.12);
  }
}

.indices {
  display: flex;
  gap: $space-6;
  margin-left: auto;
  margin-right: auto;
  align-items: center;
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
.idx-picker {
  position: relative;
}
.add-btn {
  height: 26px;
  padding: 0 10px;
  border: 1px dashed $border-default;
  border-radius: 999px;
  background: transparent;
  color: $text-secondary;
  font-size: 12px;
  cursor: pointer;
  &:hover {
    border-color: $brand;
    color: $text-primary;
    background: $bg-panel-2;
  }
}
.picker-pop {
  position: absolute;
  top: 32px;
  right: 0;
  min-width: 150px;
  padding: $space-2;
  border: 1px solid $border-default;
  border-radius: $radius-md;
  background: $bg-elevated;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: $text-secondary;
  padding: 4px 6px;
  border-radius: 6px;
  &:hover { background: $bg-panel-2; }
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
