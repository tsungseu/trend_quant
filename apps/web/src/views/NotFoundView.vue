<script setup>
import { useRouter } from 'vue-router'
import { TqButton } from '@trendquant/ui'

const router = useRouter()
</script>

<template>
  <div class="not-found">
    <div class="mkt-container nf-inner">
      <div class="nf-code">404</div>
      <h1 class="nf-title">页面未找到</h1>
      <p class="nf-sub">链接可能已失效，或页面尚未上线。</p>
      <div class="nf-actions">
        <TqButton variant="primary" size="md" @click="router.push('/')">返回首页</TqButton>
        <TqButton variant="ghost" size="md" @click="router.back()">返回上一页</TqButton>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@trendquant/design-tokens/tokens.scss' as *;

.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 128px 0;

  @media (max-width: 720px) {
    padding: 80px 0;
  }
}
.nf-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-3;
}
.nf-code {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  font-size: 96px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, $brand, $purple);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.nf-title {
  font-size: 22px;
  font-weight: 600;
  color: $text-paper-primary;
}
.nf-sub {
  font-size: 14px;
  color: $text-paper-secondary;
}
.nf-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: $space-3;
  margin-top: $space-4;
}
</style>
