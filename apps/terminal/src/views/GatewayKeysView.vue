<script setup>
import { ref, computed, onMounted } from 'vue'
import { createGatewayClient, fmtDate, relativeTime } from '@/composables/useGateway'

const client = createGatewayClient()
const loading = ref(true)
const error = ref('')
const keys = ref([])
const isMock = ref(false)
const statusFilter = ref('all')
const search = ref('')
const createdPlain = ref(null) // 新建后明文仅展示一次
const hint = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await client.keys()
    keys.value = res.keys || []
    isMock.value = !client.isRealGateway
  } catch (e) {
    error.value = '加载失败：' + (e?.message || '未知错误') + '。请确认后端已启动（npm run dev:api）。'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return keys.value.filter((k) => {
    if (statusFilter.value !== 'all' && k.status !== statusFilter.value) return false
    if (q && !String(k.name).toLowerCase().includes(q) && !String(k.prefix).toLowerCase().includes(q)) return false
    return true
  })
})

const stats = computed(() => {
  const all = keys.value.length
  const active = keys.value.filter((k) => k.status === 'active').length
  return { all, active, disabled: all - active }
})

function createKey() {
  // mock 阶段：本地追加一条，明文只展示一次
  const id = 'key_' + Math.random().toString(36).slice(2, 8)
  const plain = `sk-cr-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
  const row = {
    id,
    name: '新建 Key',
    prefix: plain.slice(0, 8) + '********************************' + plain.slice(-4),
    status: 'active',
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    todayRequests: 0,
  }
  keys.value = [row, ...keys.value]
  createdPlain.value = plain
  hint.value = '明文 Key 仅展示一次，请立即复制保存。'
}

function toggleStatus(k) {
  k.status = k.status === 'active' ? 'disabled' : 'active'
  hint.value = k.status === 'active' ? `已启用「${k.name}」` : `已停用「${k.name}」`
}

function copyText(text) {
  if (!navigator.clipboard) {
    hint.value = '当前环境不支持剪贴板'
    return
  }
  navigator.clipboard.writeText(text).then(
    () => { hint.value = '已复制到剪贴板' },
    () => { hint.value = '复制失败' },
  )
}

function titleTime(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}
</script>

<template>
  <div class="gateway-page">
    <header class="page-head">
      <div>
        <h1>API Key</h1>
        <p class="muted">用于调用网关的所有 API · 明文仅在创建时展示一次</p>
      </div>
      <div class="head-actions">
        <span v-if="isMock" class="badge mock">演示数据</span>
        <button type="button" class="btn primary" @click="createKey">+ 新建 Key</button>
      </div>
    </header>

    <div v-if="createdPlain" class="plain-banner">
      <div>
        <strong>新 Key 已创建</strong>
        <code class="mono">{{ createdPlain }}</code>
      </div>
      <button type="button" class="btn ghost" @click="copyText(createdPlain)">复制</button>
      <button type="button" class="btn ghost" @click="createdPlain = null">关闭</button>
    </div>
    <p v-if="hint" class="hint">{{ hint }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading && !keys.length" class="muted loading">加载中…</p>

    <template v-if="keys.length || !loading">
      <section class="toolbar card">
        <div class="filters">
          <select v-model="statusFilter">
            <option value="all">全部状态</option>
            <option value="active">活跃</option>
            <option value="disabled">已停用</option>
          </select>
          <input v-model="search" type="search" placeholder="按名称 / Key 搜索…" />
        </div>
        <span class="muted small">
          共 <span class="mono">{{ stats.all }}</span> · 活跃
          <span class="mono ok">{{ stats.active }}</span> · 停用
          <span class="mono">{{ stats.disabled }}</span>
        </span>
      </section>

      <section class="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>Key</th>
              <th>状态</th>
              <th>今日请求</th>
              <th>最近使用</th>
              <th>创建</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="k in filtered" :key="k.id" :class="{ dim: k.status === 'disabled' }">
              <td>
                <div class="name">{{ k.name }}</div>
                <div class="muted small mono">{{ k.id }}</div>
              </td>
              <td>
                <span class="mono key-cell">{{ k.prefix }}</span>
                <button type="button" class="link-btn" @click="copyText(k.prefix)" title="复制前缀">复制</button>
              </td>
              <td>
                <span class="status" :class="k.status">
                  <i></i>{{ k.status === 'active' ? '活跃' : '已停用' }}
                </span>
              </td>
              <td class="mono">{{ k.todayRequests }}</td>
              <td class="small" :title="titleTime(k.lastUsedAt)">{{ relativeTime(k.lastUsedAt) }}</td>
              <td class="mono small">{{ fmtDate(k.createdAt) }}</td>
              <td>
                <button type="button" class="link-btn" @click="toggleStatus(k)">
                  {{ k.status === 'active' ? '停用' : '启用' }}
                </button>
              </td>
            </tr>
            <tr v-if="!filtered.length">
              <td colspan="7" class="muted empty">无匹配 Key</td>
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
  height: 32px; padding: 0 14px; border-radius: $radius-md; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent;
  &.primary { background: $brand; color: #fff; }
  &.ghost { background: transparent; border-color: $border-subtle; color: $text-secondary; }
  &:hover { filter: brightness(1.05); }
}
.muted { color: $text-tertiary; }
.small { font-size: 11.5px; }
.mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-feature-settings: 'tnum' 1; }
.ok { color: $up; }
.error { color: $danger; background: rgba(239, 68, 68, 0.08); padding: 12px 16px; border-radius: $radius-md; }
.hint { font-size: 12.5px; color: $text-secondary; }
.loading { padding: 40px; text-align: center; }
.plain-banner {
  display: flex; align-items: center; gap: $space-3; flex-wrap: wrap;
  background: $brand-soft; border: 1px solid rgba(59, 130, 246, 0.35); border-radius: $radius-md;
  padding: 12px 16px; margin-bottom: $space-4;
  code { display: block; margin-top: 4px; font-size: 12.5px; word-break: break-all; }
}
.card {
  background: $bg-panel; border: 1px solid $border-subtle; border-radius: $radius-md; padding: $space-4; margin-bottom: $space-4;
}
.toolbar {
  display: flex; justify-content: space-between; align-items: center; gap: $space-3; flex-wrap: wrap;
}
.filters { display: flex; gap: $space-3; flex-wrap: wrap; }
select, input[type='search'] {
  height: 32px; padding: 0 10px; border-radius: $radius-md; border: 1px solid $border-subtle;
  background: $bg-base; color: $text-primary; font-size: 12.5px; font-family: inherit;
}
.table-wrap { padding: 0; overflow: hidden; }
table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid $border-subtle; }
th { color: $text-tertiary; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
tbody tr:last-child td { border-bottom: 0; }
tr.dim { opacity: 0.65; }
.name { font-weight: 500; }
.key-cell { font-size: 11.5px; margin-right: 6px; }
.link-btn {
  background: none; border: none; color: $brand; cursor: pointer; font-size: 12px; padding: 0;
  &:hover { text-decoration: underline; }
}
.status {
  display: inline-flex; align-items: center; gap: 6px; font-size: 12px;
  i { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
  &.active { color: $up; i { background: $up; } }
  &.disabled { color: $text-tertiary; i { background: $text-tertiary; } }
}
.empty { text-align: center; padding: 28px !important; }
</style>
