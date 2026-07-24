<script setup>
import { onMounted } from 'vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopbar from '@/components/AppTopbar.vue'
import { useMarketStore } from '@/stores/market'
import { useFundsStore } from '@/stores/funds'
import { useAlertsStore } from '@/stores/alerts'

const market = useMarketStore()
const funds = useFundsStore()
const alerts = useAlertsStore()

let alertTimer = null

// 周期检查基金买卖点预警：用实时估值/净值 vs 规则价位
function checkFundPriceAlerts() {
  const prices = []
  for (const code of funds.watchlist) {
    // 优先实时估值，其次净值
    const est = funds.getEstimate(code)
    const nav = funds.byCode[code]?.navs
    const price = est?.gsz || (nav?.length ? nav[nav.length - 1].nav : 0)
    if (price) prices.push({ code, name: '', price })
  }
  if (prices.length) alerts.checkFundAlerts(prices)
}

onMounted(() => {
  // 启动行情模拟实时刷新
  market.startLive()
  // 启动顶栏指数真实快照同步（东方财富，10s 一次）
  market.startIndexSync()
  // 启动基金买卖点预警检查（30s 一次）
  alertTimer = setInterval(checkFundPriceAlerts, 30000)
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
  padding: $space-6;
}
</style>
