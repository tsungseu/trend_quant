<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="not-found">
    <div class="nf-code">404</div>
    <h2>页面未找到</h2>
    <p class="muted">链接可能已失效，或页面尚未上线。</p>
    <div class="nf-actions">
      <button class="btn btn-primary" @click="router.push('/')">返回首页</button>
      <button class="btn btn-ghost" @click="router.back()">返回上一页</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: $space-10 $space-6;
  gap: $space-3;
  min-height: 60vh;
}
.nf-code {
  font-size: 96px;
  font-weight: 800;
  background: linear-gradient(135deg, $brand, $purple);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  line-height: 1;
}
h2 {
  font-size: 20px;
  font-weight: 600;
}
.muted {
  font-size: 13px;
  color: $text-secondary;
}
.nf-actions {
  display: flex;
  gap: $space-3;
  margin-top: $space-4;
}
</style>
