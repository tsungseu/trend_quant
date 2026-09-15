<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMarketStore } from '@/stores/market'
import { useThemeStore } from '@/stores/theme'
import { useAlertsStore } from '@/stores/alerts'
import { fmtPct, fmtThousands } from '@/mock/_helpers'
import { dataModeLabel, runtime } from '@/config/runtime'

const route = useRoute()
const router = useRouter()
defineProps({ collapsed: Boolean, mobileOpen: Boolean })
defineEmits(['toggle-navigation'])
const searchText = ref('')
const searchOpen = ref(false)
const searchRef = ref(null)
const searchInput = ref(null)
const searchResults = computed(() => router.getRoutes()
  .filter((r) => r.meta?.title && !r.path.includes(':'))
  .filter((r) => `${r.meta.title} ${r.path}`.toLowerCase().includes(searchText.value.trim().toLowerCase())))
function openResult(path) {
  searchOpen.value = false
  searchText.value = ''
  router.push(path)
}
function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    searchInput.value?.focus()
    searchOpen.value = true
  }
  if (e.key === 'Escape') { searchOpen.value = false; pickerOpen.value = false }
}
const market = useMarketStore()
const theme = useThemeStore()
const alerts = useAlertsStore()

const totalNotif = computed(() => alerts.unreadFundNotifs)

// 标题优先使用路由 meta.title，仅在没有 meta 时回退到根名称
const pageTitle = computed(() => route.meta?.title || '趋势量化')

const isDark = computed(() => theme.theme === 'dark')

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
  if (searchRef.value && !searchRef.value.contains(e.target)) searchOpen.value = false
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
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <header class="topbar">
    <button class="icon-btn nav-toggle desktop-toggle" :aria-expanded="!collapsed" aria-controls="studio-navigation" aria-label="切换导航" @click="$emit('toggle-navigation')">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
    </button>
    <button class="icon-btn nav-toggle mobile-toggle" :aria-expanded="mobileOpen" aria-controls="studio-navigation" aria-label="打开导航" @click="$emit('toggle-navigation')">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
    </button>
    <div class="left">
      <nav class="breadcrumb" aria-label="面包屑"><RouterLink to="/app">工作台</RouterLink><span>/</span><span aria-current="page">{{ pageTitle }}</span></nav>
      <div class="left-meta">
        <span class="date">{{ dateLabel }}</span>
        <span class="mode-badge" :class="modeTone" :title="modeLabel">{{ modeLabel }}</span>
      </div>
    </div>

    <!-- 独立行情栏由 grid 排在顶栏下方 -->
    <div class="indices" aria-label="市场指数">
      <span class="market-caption">市场快照</span>
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
        <button class="add-btn" type="button" :aria-expanded="pickerOpen" @click.stop="togglePicker">+ 添加指数</button>
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
      <div ref="searchRef" class="search" @keydown.esc.stop="searchOpen = false">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
        <input ref="searchInput" v-model="searchText" placeholder="查找工作台模块" aria-label="查找工作台模块" :aria-expanded="searchOpen" aria-controls="module-results" @focus="searchOpen = true" @keydown.enter.prevent="searchResults[0] && openResult(searchResults[0].path)" />
        <kbd>Ctrl K</kbd>
        <div v-if="searchOpen" id="module-results" class="search-results">
          <span class="search-heading">快速前往</span>
          <button v-for="result in searchResults" :key="result.path" @click="openResult(result.path)">{{ result.meta.title }}<span>↗</span></button>
          <p v-if="!searchResults.length" class="search-empty">没有匹配的模块，请尝试“基金”或“策略”。</p>
        </div>
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
      </RouterLink>

      <div class="user">
        <div class="avatar">M</div>
        <div class="user-info">
          <div class="uname">个人工作空间</div>
          <div class="uid">MindQuant Studio</div>
        </div>
      </div>
    </div>
  </header>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.topbar {
  display: grid;
  grid-template-columns: 36px minmax(140px, 1fr) auto;
  align-items: center;
  column-gap: 12px;
  padding: 0 24px;
  border-bottom: 1px solid $border-subtle;
  background: $bg-panel;
  flex-shrink: 0;
  z-index: 12;
}
.nav-toggle { grid-column: 1; grid-row: 1; }
.icon-btn.mobile-toggle { display: none; }
.left { grid-column: 2; grid-row: 1; padding-block: 14px; }
.right { grid-column: 3; grid-row: 1; }
.breadcrumb { display: flex; align-items: center; gap: 10px; font-size: 13px; white-space: nowrap; }
.breadcrumb a, .breadcrumb > span:first-of-type { color: $text-tertiary; }
.breadcrumb a:hover { color: $brand; }
.market-caption { font-size: 11px; color: $text-tertiary; white-space: nowrap; padding-right: 8px; }
.search-results { position: absolute; top: 42px; right: 0; width: 300px; max-height: 340px; overflow-y: auto; background: $bg-panel; border: 1px solid $border-default; border-radius: 8px; padding: 8px; box-shadow: 0 6px 24px var(--shadow-color); z-index: 15; }
.search-results button { width: 100%; padding: 10px; text-align: left; display: flex; justify-content: space-between; border-radius: 4px; color: $text-primary; }
.search-results button:hover { background: $brand-soft; color: $brand; }
.search-heading { display: block; padding: 6px 10px; font-size: 11px; }
.search-empty { padding: 12px; font-size: 13px; }


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
  border-radius: 4px;
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
  grid-column: 1 / -1;
  grid-row: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid $border-subtle;
}

.idx {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 8px;
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
  position: relative;
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
    min-width: 0;
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
    white-space: nowrap;
    font-size: 10px;
    padding: 1px 5px;
    background: $bg-elevated;
    border-radius: 4px;
    color: $text-secondary;
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
  background: $brand-soft;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: $brand;
}
.user-info {
  .uname {
    font-size: 13px;
    font-weight: 600;
  }
  .uid {
    font-size: 10px;
    color: $text-tertiary;
  }
}

@media (max-width: 1100px) {
  .user-info, .search kbd { display: none; }
  .search { width: 185px; }
  .right { gap: 10px; }
}
@media (max-width: 760px) {
  .desktop-toggle { display: none; }
  .icon-btn.mobile-toggle { display: flex; }
  .topbar { padding-inline: 16px; grid-template-columns: 32px minmax(0, 1fr) auto; gap: 0 8px; }
  .date, .user, .search, .market-caption { display: none; }
  .right { gap: 4px; }
  .breadcrumb { font-size: 12px; gap: 6px; }
  .indices { gap: 8px 12px; }
  .idx { flex-wrap: wrap; gap: 4px; }
  .idx .num { font-size: 12px; }
  .idx-picker { margin-left: auto; }
  .left-meta { margin-top: 4px; }
}
</style>
