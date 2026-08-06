<script setup>
defineProps({
  title: { type: String, default: '数据中心' },
  desc: {
    type: String,
    default: '统一数据源管理、接口配置与数据质量监控即将上线，敬请期待。',
  },
})
</script>

<template>
  <div class="coming-soon">
    <div class="cs-icon">
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
        <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
      </svg>
    </div>
    <span class="cs-badge">即将推出</span>
    <h2>{{ title }}</h2>
    <p class="muted">{{ desc }}</p>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: $space-3;
  min-height: 60vh;
  padding: $space-10 $space-6;
}
.cs-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: $radius-xl;
  background: $bg-panel-2;
  border: 1px solid $border-subtle;
  color: $text-tertiary;
  margin-bottom: $space-2;
}
.cs-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: $gold;
  background: $gold-soft;
  border: 1px solid rgba(245, 183, 61, 0.3);
}
h2 {
  font-size: 20px;
  font-weight: 700;
  margin-top: $space-1;
}
.muted {
  font-size: 13px;
  color: $text-secondary;
  max-width: 420px;
  line-height: 1.6;
}
</style>
