<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { createGatewayClient, fmtMoney, fmtNum, fmtDate } from '@/composables/useGateway'

const client = createGatewayClient()
const loading = ref(true)
const error = ref('')
const series = ref([])
const isMock = ref(false)
const days = ref(14)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await client.usage(days.value)
    series.value = res.series || []
    isMock.value = !client.isRealGateway
  } catch (e) {
    error.value = '加载失败：' + (e?.message || '未知错误') + '。请确认后端已启动（npm run dev:api）。'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(days, load)

const totals = computed(() => {
  const requests = series.value.reduce((s, p) => s + p.requests, 0)
  const cost = series.value.reduce((s, p) => s + p.cost, 0)
  return { requests, cost }
})

const barPath = computed(() => {
  if (!series.value.length) return []
  const max = Math.max(...series.value.map((p) => p.requests), 1)
  const n = series.value.length
  const gap = 0.2
  const w = (100 - gap * (n - 1)) / n
  return series.value.map((p, i) => {
    const h = (p.requests / max) * 90
    const x = i * (w + gap)
    const y = 100 - h
    return { x, y, w, h, date: p.date, requests: p.requests, cost: p.cost }
  })
})
</script>

<template>
  <div class="gateway-page">
    <header class="page-head">
      <div>
        <h1>用量</h1>
        <p class="muted">按天汇总请求量与消费 · 演示阶段数据来自 mock</p>
      </div>
      <div class="head-actions">
        <span v-if="isMock" class="badge mock">演示数据</span>
        <div class="seg">
          <button type="button" :class="{ active: days === 7 }" @click="days = 7">7 天</button>
          <button type="button" :class="{ active: days === 14 }" @click="days = 14">14 天</button>
          <button type="button" :class="{ active: days === 30 }" @click="days = 30">30 天</button>
        </div>
      </div>
    </header>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading && !series.length" class="muted loading">加载中…</p>

    <template v-if="series.length">
      <section class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">区间请求</div>
          <div class="kpi-value">{{ fmtNum(totals.requests) }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">区间消费</div>
          <div class="kpi-value">{{ fmtMoney(totals.cost) }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">日均请求</div>
          <div class="kpi-value">{{ fmtNum(Math.round(totals.requests / series.length)) }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">日均消费</div>
          <div class="kpi-value">{{ fmtMoney(totals.cost / series.length) }}</div>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><span>请求量趋势</span><span class="muted small">近 {{ days }} 天</span></div>
        <svg class="bars" viewBox="0 0 100 100" preserveAspectRatio="none">
          <rect
            v-for="(b, i) in barPath"
            :key="i"
            :x="b.x"
            :y="b.y"
            :width="b.w"
            :height="b.h"
            rx="0.4"
            fill="var(--brand, #3b82f6)"
            opacity="0.85"
          >
            <title>{{ b.date }} · {{ b.requests }} 次 · ¥{{ b.cost.toFixed(2) }}</title>
          </rect>
        </svg>
      </section>

      <section class="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>请求数</th>
              <th>消费</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in [...series].reverse()" :key="p.date">
              <td class="mono">{{ fmtDate(p.date) }}</td>
              <td class="mono">{{ fmtNum(p.requests) }}</td>
              <td class="mono">{{ fmtMoney(p.cost) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.gateway-page { padding: $space-6; max-width: 1200px; margin: 0 auto; }
.page-head {
  display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: $space-5; gap: $space-4;
  h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
  .muted { margin: 0; font-size: 13px; }
}
.head-actions { display: flex; align-items: center; gap: $space-3; }
.badge.mock {
  font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 999px;
  background: $gold-soft; color: $gold; border: 1px solid rgba(245, 183, 61, 0.28);
}
.seg {
  display: inline-flex; background: $bg-base; border: 1px solid $border-subtle; border-radius: $radius-md; padding: 2px;
  button {
    background: transparent; border: 0; color: $text-tertiary; font-size: 12.5px; padding: 5px 12px;
    border-radius: $radius-sm; cursor: pointer; font-family: inherit;
    &.active { background: $bg-panel; color: $text-primary; font-weight: 600; }
  }
}
.muted { color: $text-tertiary; }
.small { font-size: 11.5px; }
.mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-feature-settings: 'tnum' 1; }
.error { color: $danger; background: rgba(239, 68, 68, 0.08); padding: 12px 16px; border-radius: $radius-md; }
.loading { padding: 40px; text-align: center; }
.kpi-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: $space-4; margin-bottom: $space-5;
  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
}
.kpi-card {
  background: $bg-panel; border: 1px solid $border-subtle; border-radius: $radius-md; padding: $space-4;
}
.kpi-label { font-size: 12px; color: $text-tertiary; margin-bottom: 6px; }
.kpi-value { font-size: 22px; font-weight: 700; font-family: ui-monospace, monospace; }
.card {
  background: $bg-panel; border: 1px solid $border-subtle; border-radius: $radius-md; padding: $space-4; margin-bottom: $space-4;
}
.card-head {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: $space-3;
  font-weight: 600; font-size: 13px;
}
.bars { width: 100%; height: 160px; display: block; }
.table-wrap { padding: 0; overflow: hidden; }
table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid $border-subtle; }
th { color: $text-tertiary; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
tbody tr:last-child td { border-bottom: 0; }
</style>
