<script setup>
import { onMounted, onUnmounted, watchEffect, ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { safeGetItem, safeSetItem } from '@/utils/storage'
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopbar from '@/components/AppTopbar.vue'
import { useMarketStore } from '@/stores/market'
import { useFundsStore } from '@/stores/funds'
import { useAlertsStore } from '@/stores/alerts'
import { usePrefsStore } from '@/stores/prefs'
import { runtime } from '@/config/runtime'

const market = useMarketStore()
const funds = useFundsStore()
const alerts = useAlertsStore()
const prefs = usePrefsStore()
const route = useRoute()
const showPageHeading = computed(() =>
  !['overview', 'fund-detail', 'data', 'not-found'].includes(route.name)
  && !String(route.name).startsWith('gateway-'))
const collapsed = ref(safeGetItem('studio.sidebar.collapsed') === 'true')
const mobileOpen = ref(false)
watch(collapsed, (value) => safeSetItem('studio.sidebar.collapsed', String(value)))
watch(() => route.path, () => { mobileOpen.value = false })
function toggleNavigation() {
  if (window.matchMedia('(max-width: 760px)').matches) mobileOpen.value = !mobileOpen.value
  else collapsed.value = !collapsed.value
}
function focusContent() {
  document.getElementById('studio-content')?.focus()
}

// 界面字号写入根节点 CSS 变量，供全局 rem/px 缩放（影响界面文字，不影响布局/图标）
watchEffect(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--ui-font-scale', String(prefs.prefs.fontScale / 100))
  }
})

let alertTimer = null
let alertChecking = false

// 周期检查基金价格提醒：优先刷新估值，失败则回退到最新净值，并携带数据质量元信息
async function checkFundPriceAlerts() {
  if (alertChecking) return
  alertChecking = true
  try {
    await Promise.allSettled(funds.watchlist.map((code) => funds.fetchEstimate(code, { force: true })))
    const prices = []
    for (const code of funds.watchlist) {
      const estState = funds.estimateCache[code]
      const est = funds.getEstimate(code)
      const navState = funds.navMeta(code)
      const navs = funds.byCode[code]?.navs || []
      const nav = navs.length ? navs[navs.length - 1] : null
      const price = Number(est?.gsz || nav?.nav || 0)
      const meta = est?.gsz ? estState : navState
      if (Number.isFinite(price) && price > 0) {
        prices.push({
          code,
          name: funds.getMeta(code)?.name || funds.getMeta(code)?.short || '',
          price,
          meta,
        })
      }
    }
    if (prices.length) alerts.checkFundAlerts(prices)
  } finally {
    alertChecking = false
  }
}

onMounted(() => {
  if (runtime.enableMockLive) market.startLive()
  market.startIndexSync()
  checkFundPriceAlerts()
  alertTimer = setInterval(checkFundPriceAlerts, 30000)
})

onUnmounted(() => {
  if (alertTimer) {
    clearInterval(alertTimer)
    alertTimer = null
  }
  market.stopLive()
  market.stopIndexSync()
})
</script>

<template>
  <div class="layout" :class="{ 'nav-collapsed': collapsed, 'nav-open': mobileOpen }" @keydown.esc="mobileOpen = false">
    <a href="#studio-content" class="skip-link" @click.prevent="focusContent">跳转到主要内容</a>
    <AppSidebar :collapsed="collapsed" :mobile-open="mobileOpen" />
    <button v-if="mobileOpen" class="nav-backdrop" aria-label="关闭导航" @click="mobileOpen = false" />
    <div class="main">
      <AppTopbar :collapsed="collapsed" :mobile-open="mobileOpen" @toggle-navigation="toggleNavigation" />
      <main id="studio-content" class="content" tabindex="-1">
        <header v-if="showPageHeading" class="section-heading"><h1>{{ route.meta.title }}</h1></header>
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.layout {
  display: flex;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: $bg-app;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: $space-5 $space-6;
  container-type: inline-size;
}

.content > * { max-width: 1680px; margin-inline: auto; }
.section-heading { margin-bottom: 20px; }
.section-heading h1 { font-size: 24px; font-weight: 600; letter-spacing: -.5px; }
.nav-backdrop { display: none; }
.skip-link { position: fixed; top: -60px; left: 16px; z-index: 50; padding: 10px 16px; background: $brand; color: white; border-radius: 6px; }
.skip-link:focus { top: 8px; }
@media (max-width: 760px) {
  .content { padding: 16px; }
  .nav-backdrop { display: block; position: fixed; inset: 0; z-index: 19; background: rgba(0, 0, 0, .35); }
}
</style>
