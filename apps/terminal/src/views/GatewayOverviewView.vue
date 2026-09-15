<script setup>
import { ref, computed, onMounted } from 'vue'
import { GatewayClient } from '@trendquant/gateway-client'

// CodeRouterX 模型网关 · 概览
// 数据来源：apps/api 的 /console/*（mock）或真实网关（VITE_GATEWAY_API_URL）

const loading = ref(true)
const error = ref('')
const data = ref(null)
const isMock = ref(false)

const apiBase = import.meta.env.VITE_GATEWAY_API_URL || 'http://localhost:8080'

// 占位 token：真实环境由 Clerk 注入；本地 dev fake 鉴权下任意值即可
async function getToken() {
  return window.__TQ_RAG_TOKEN__ || 'dev-token'
}

const client = new GatewayClient({
  baseUrl: import.meta.env.VITE_GATEWAY_API_URL || undefined,
  fallbackBaseUrl: 'http://localhost:8080',
  getToken,
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await client.overview()
    isMock.value = !client.isRealGateway
  } catch (e) {
    error.value = '加载失败：' + (e?.message || '未知错误') + '。请确认后端已启动（npm run dev:api）。'
  } finally {
    loading.value = false
  }
}

onMounted(load)

// 格式化：金额带币种、数字千分位、百分比带符号
function fmtMoney(v, currency = 'CNY') {
  const sym = currency === 'CNY' ? '¥' : '$'
  return sym + Number(v).toFixed(2)
}
function fmtNum(v) {
  return Number(v).toLocaleString('en-US')
}
function fmtPct(v) {
  const s = v >= 0 ? '+' : ''
  return s + Number(v).toFixed(1) + '%'
}
function fmtTime(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// KPI 四项，统一形状便于 v-for
const kpiCards = computed(() => {
  if (!data.value) return []
  const k = data.value.kpi
  return [
    { label: '余额', ...k.balance, fmt: (v, c) => fmtMoney(v, c) },
    { label: '今日消费', ...k.todayCost, fmt: (v, c) => fmtMoney(v, c) },
    { label: '今日请求', ...k.todayRequests, fmt: (v) => fmtNum(v) },
    { label: '错误率', ...k.errorRate, fmt: (v) => v.toFixed(2) + '%' },
  ]
})

// 趋势迷你折线图（SVG，无依赖）
const trendPath = computed(() => {
  if (!data.value?.trend?.points?.length) return ''
  const pts = data.value.trend.points
  const w = 100, h = 32
  const max = Math.max(...pts.map((p) => p.requests), 1)
  const step = w / (pts.length - 1)
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - (p.requests / max) * h).toFixed(1)}`).join(' ')
})

// 最近请求：状态码着色
function statusClass(code) {
  if (code >= 500) return 'bad'
  if (code >= 400) return 'warn'
  return 'ok'
}
</script>

<template>
  <div class="gateway-page">
    <header class="page-head">
      <div>
        <h1>模型网关 · 概览</h1>
        <p class="muted">CodeRouterX — 一个聚合 Key，接入全网大模型</p>
      </div>
      <span v-if="isMock" class="badge mock" title="当前数据来自 apps/api 的 mock 接口，配置 VITE_GATEWAY_API_URL 后切换至真实网关">
        演示数据
      </span>
    </header>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading && !data" class="muted loading">加载中…</p>

    <template v-if="data">
      <!-- KPI 卡片 -->
      <section class="kpi-grid">
        <div v-for="k in kpiCards" :key="k.label" class="kpi-card">
          <div class="kpi-label">{{ k.label }}</div>
          <div class="kpi-value">{{ k.fmt(k.value, k.currency) }}</div>
          <div class="kpi-delta" :class="k.deltaPct >= 0 ? 'up' : 'down'">
            {{ fmtPct(k.deltaPct) }} <span class="vs">较昨日</span>
          </div>
        </div>
      </section>

      <!-- 趋势 + 配额 -->
      <section class="two-col">
        <div class="card">
          <div class="card-head">
            <span>最近 12 小时请求量</span>
            <span class="muted small">每小时</span>
          </div>
          <svg v-if="trendPath" class="trend-chart" viewBox="0 0 100 32" preserveAspectRatio="none">
            <path :d="trendPath" fill="none" stroke="var(--brand, #3b82f6)" stroke-width="1" />
          </svg>
          <div v-else class="muted small">无数据</div>
        </div>
        <div class="card">
          <div class="card-head"><span>配额使用</span></div>
          <div class="quota-row">
            <span class="muted">RPM 限额</span>
            <span class="mono">{{ fmtNum(data.quota.rpmLimit) }}</span>
          </div>
          <div class="quota-bar"><i :style="{ width: data.quota.usedPct + '%' }"></i></div>
          <div class="quota-row">
            <span class="muted">已用</span>
            <span class="mono">{{ data.quota.usedPct }}%</span>
          </div>
          <div class="quota-row">
            <span class="muted">TPM 限额</span>
            <span class="mono">{{ fmtNum(data.quota.tpmLimit) }}</span>
          </div>
        </div>
      </section>

      <!-- 最近请求 -->
      <section class="card recent">
        <div class="card-head"><span>最近请求</span><span class="muted small">{{ data.recentRequests.length }} 条</span></div>
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>模型</th>
              <th>Tokens(入/出)</th>
              <th>费用</th>
              <th>状态</th>
              <th>延迟</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in data.recentRequests" :key="i">
              <td class="mono small">{{ fmtTime(r.at) }}</td>
              <td class="mono">{{ r.model }}</td>
              <td class="mono">{{ r.tokensIn }} / {{ r.tokensOut }}</td>
              <td class="mono">¥{{ r.cost.toFixed(4) }}</td>
              <td><span class="status-dot" :class="statusClass(r.status)"></span><span class="mono small">{{ r.status }}</span></td>
              <td class="mono small">{{ r.latencyMs }}ms</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.gateway-page {
  padding: $space-6;
  max-width: 1200px;
  margin: 0 auto;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: $space-5;
  h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
  .muted { margin: 0; font-size: 13px; }
}

.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  &.mock {
    background: $gold-soft;
    color: $gold;
    border: 1px solid rgba(245, 183, 61, 0.28);
  }
}

.muted { color: $text-tertiary; }
.small { font-size: 11.5px; }
.mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-feature-settings: 'tnum' 1; }
.loading { padding: 40px; text-align: center; }
.error { color: $danger; background: rgba(239, 68, 68, 0.08); padding: 12px 16px; border-radius: $radius-md; }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $space-4;
  margin-bottom: $space-5;
  @media (max-width: 768px) { grid-template-columns: repeat(2, 1fr); }
}

.kpi-card {
  background: $bg-panel;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  padding: $space-4;
}
.kpi-label { font-size: 12px; color: $text-tertiary; margin-bottom: 6px; }
.kpi-value { font-size: 24px; font-weight: 700; font-family: ui-monospace, monospace; }
.kpi-delta { font-size: 12px; margin-top: 6px; font-weight: 600; }
.kpi-delta.up { color: $up; }
.kpi-delta.down { color: $down; }
.kpi-delta .vs { color: $text-tertiary; font-weight: 400; margin-left: 4px; }

.two-col {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: $space-4;
  margin-bottom: $space-5;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
}

.card {
  background: $bg-panel;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  padding: $space-4;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $space-3;
  font-weight: 600;
  font-size: 13px;
}

.trend-chart {
  width: 100%;
  height: 80px;
  display: block;
}

.quota-row {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  margin: 8px 0 4px;
}
.quota-bar {
  height: 6px;
  background: $bg-hover;
  border-radius: 3px;
  overflow: hidden;
  margin: 4px 0 8px;
  > i { display: block; height: 100%; background: $brand; }
}

.recent table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid $border-subtle; }
  th { color: $text-tertiary; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
  tbody tr:last-child td { border-bottom: 0; }
}

.status-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
  &.ok { background: $up; }
  &.warn { background: $gold; }
  &.bad { background: $danger; }
}
</style>
