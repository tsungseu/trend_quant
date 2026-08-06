<script setup>
import { onMounted, onUnmounted, watchEffect } from 'vue'
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
  <div class="layout">
    <AppSidebar />
    <div class="main">
      <AppTopbar />
      <main class="content grid-bg">
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
  height: 100vh;
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
}
</style>
