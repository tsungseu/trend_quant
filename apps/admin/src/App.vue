<script setup>
import { ref, onMounted } from 'vue'
import { RagClient } from '@trendquant/rag-client'

// 管理台 MVP：登录后列出当前用户的文档与索引状态，支持删除。
// 登录态由部署环境注入：本地开发用 dev fake；线上接 Clerk。
// 此处用最小占位 token（真实集成在 PR5 与 terminal 一并接入）。

const docs = ref([])
const loading = ref(false)
const error = ref('')
const apiBase = import.meta.env.VITE_RAG_API_URL || 'http://localhost:8080'

// 占位 getToken：真实环境从 Clerk 取 session token
async function getToken() {
  return window.__DEV_FAKE_TOKEN__ || 'dev-token'
}

const client = new RagClient({ baseUrl: apiBase, getToken })

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    docs.value = await client.listDocuments()
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function remove(id) {
  if (!confirm('删除该文档及其全部向量？')) return
  try {
    await client.deleteDocument(id)
    await refresh()
  } catch (e) {
    error.value = e.message || '删除失败'
  }
}

onMounted(refresh)
</script>

<template>
  <div class="admin-shell" data-theme="dark">
    <header class="admin-header">
      <span class="brand">TrendQuant</span>
      <span class="brand-sub">知识库管理</span>
    </header>

    <main class="admin-main">
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="loading && !docs.length" class="muted">加载中…</p>
      <p v-if="!loading && !docs.length" class="muted">暂无文档。先在 Agent 中上传一份资料。</p>

      <table v-if="docs.length" class="doc-table">
        <thead>
          <tr>
            <th>文件名</th>
            <th>状态</th>
            <th>分块</th>
            <th>大小</th>
            <th>更新</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in docs" :key="d.id">
            <td>{{ d.filename }}</td>
            <td>
              <span class="status-pill" :class="d.status">{{ d.status }}</span>
              <span v-if="d.lowConfidence" class="muted">· OCR 质量有限</span>
            </td>
            <td>{{ d.chunkCount ?? '—' }}</td>
            <td>{{ Math.round(d.sizeBytes / 1024) }} KB</td>
            <td class="muted">{{ d.updatedAt?.slice(0, 16).replace('T', ' ') }}</td>
            <td><button class="link-btn" @click="remove(d.id)">删除</button></td>
          </tr>
        </tbody>
      </table>
    </main>
  </div>
</template>

<style lang="scss" scoped>
@use '@trendquant/design-tokens/tokens.scss' as *;

.error { color: $up; margin: 0 0 16px; }
.muted { color: $text-tertiary; font-size: 13px; }
.link-btn {
  background: none; border: none; color: $brand; cursor: pointer; font-size: 13px;
  &:hover { text-decoration: underline; }
}
</style>
