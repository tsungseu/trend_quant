<script setup>
import { ref, onMounted } from 'vue'
import { createGatewayClient, fmtMoney, fmtDate, fmtDateTime } from '@/composables/useGateway'

const client = createGatewayClient()
const loading = ref(true)
const error = ref('')
const wallet = ref(null)
const isMock = ref(false)
const hint = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    wallet.value = await client.wallet()
    isMock.value = !client.isRealGateway
  } catch (e) {
    error.value = '加载失败：' + (e?.message || '未知错误') + '。请确认后端已启动（npm run dev:api）。'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function recharge() {
  hint.value = '演示模式：充值入口已预留，真实网关就绪后对接支付通道。'
}
</script>

<template>
  <div class="gateway-page">
    <header class="page-head">
      <div>
        <h1>钱包</h1>
        <p class="muted">余额、消费流水与实名状态</p>
      </div>
      <div class="head-actions">
        <span v-if="isMock" class="badge mock">演示数据</span>
        <button type="button" class="btn primary" @click="recharge">充值</button>
      </div>
    </header>

    <p v-if="hint" class="hint">{{ hint }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading && !wallet" class="muted loading">加载中…</p>

    <template v-if="wallet">
      <section class="top-grid">
        <div class="card balance-card">
          <div class="kpi-label">当前余额</div>
          <div class="balance">{{ fmtMoney(wallet.balance.value, wallet.balance.currency) }}</div>
          <div class="muted small">
            累计消费 {{ fmtMoney(wallet.cumulativeCost.value, wallet.cumulativeCost.currency) }}
            · 自 {{ fmtDate(wallet.cumulativeCost.since) }}
          </div>
        </div>
        <div class="card realname-card">
          <div class="kpi-label">实名认证</div>
          <div class="rn-row">
            <span class="rn-badge" :class="wallet.realname.verified ? 'ok' : 'warn'">
              {{ wallet.realname.verified ? '已实名' : '未实名' }}
            </span>
            <span v-if="wallet.realname.name" class="mono">{{ wallet.realname.name }}</span>
          </div>
          <div class="muted small">提交于 {{ fmtDateTime(wallet.realname.submittedAt) }}</div>
          <p class="muted small rn-note">
            实名用于充值与开票合规。设置页后续单独拆出；当前信息来自网关钱包接口。
          </p>
        </div>
      </section>

      <section class="card table-wrap">
        <div class="card-head"><span>近期流水</span><span class="muted small">{{ wallet.transactions.length }} 条</span></div>
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>类型</th>
              <th>说明</th>
              <th>金额</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in wallet.transactions" :key="tx.id">
              <td class="mono small">{{ fmtDateTime(tx.at) }}</td>
              <td>
                <span class="tx-type" :class="tx.type">
                  {{ tx.type === 'recharge' ? '充值' : '消费' }}
                </span>
              </td>
              <td class="small">{{ tx.desc || tx.method || '—' }}</td>
              <td class="mono" :class="tx.amount >= 0 ? 'up' : 'down'">
                {{ tx.amount >= 0 ? '+' : '' }}{{ fmtMoney(Math.abs(tx.amount), tx.currency) }}
              </td>
              <td class="small">{{ tx.status }}</td>
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
.btn {
  height: 32px; padding: 0 14px; border-radius: $radius-md; font-size: 13px; font-weight: 600; cursor: pointer; border: none;
  &.primary { background: $brand; color: #fff; }
}
.muted { color: $text-tertiary; }
.small { font-size: 11.5px; }
.mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-feature-settings: 'tnum' 1; }
.up { color: $up; }
.down { color: $down; }
.error { color: $danger; background: rgba(239, 68, 68, 0.08); padding: 12px 16px; border-radius: $radius-md; }
.hint { font-size: 12.5px; color: $text-secondary; }
.loading { padding: 40px; text-align: center; }
.top-grid {
  display: grid; grid-template-columns: 1.4fr 1fr; gap: $space-4; margin-bottom: $space-5;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
}
.card {
  background: $bg-panel; border: 1px solid $border-subtle; border-radius: $radius-md; padding: $space-4;
}
.kpi-label { font-size: 12px; color: $text-tertiary; margin-bottom: 8px; }
.balance { font-size: 32px; font-weight: 700; font-family: ui-monospace, monospace; margin-bottom: 8px; }
.rn-row { display: flex; align-items: center; gap: $space-3; margin-bottom: 8px; }
.rn-badge {
  font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
  &.ok { background: $down-bg; color: $down; }
  &.warn { background: $gold-soft; color: $gold; }
}
.rn-note { margin: 12px 0 0; line-height: 1.5; }
.table-wrap { padding: 0; overflow: hidden; }
.card-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: $space-4 $space-4 0; font-weight: 600; font-size: 13px;
}
table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-top: $space-3; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid $border-subtle; }
th { color: $text-tertiary; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
tbody tr:last-child td { border-bottom: 0; }
.tx-type {
  font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
  &.recharge { background: $down-bg; color: $down; }
  &.consume { background: $brand-soft; color: $brand; }
}
</style>
