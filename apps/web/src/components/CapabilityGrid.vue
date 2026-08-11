<script setup>
import { computed } from 'vue'
import { coreCapabilities } from '@/data/catalog'

// 可选 props：limit 用于在产品页只展示前 N 张，section 标题副标可覆盖。
const props = defineProps({
  limit: { type: Number, default: 0 },
  eyebrow: { type: String, default: '核心能力' },
  heading: { type: String, default: '一套平台，覆盖投研到执行的关键环节' },
})

const items = computed(() => (props.limit > 0 ? coreCapabilities.slice(0, props.limit) : coreCapabilities))

// Feather 风格内联 SVG（与终端 AppSidebar 一致，避免引入图标库）
const icons = {
  brain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>',
  database: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>',
  activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  trending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
}
</script>

<template>
  <section class="mkt-section capability-section">
    <div class="mkt-container">
      <p class="mkt-eyebrow">{{ eyebrow }}</p>
      <h2 class="section-head">{{ heading }}</h2>

      <ul class="cap-grid">
        <li v-for="(c, i) in items" :key="c.title" class="cap-card">
          <span class="cap-icon" v-html="icons[c.icon]" aria-hidden="true"></span>
          <h3 class="cap-title">{{ c.title }}</h3>
          <p class="cap-line">{{ c.line }}</p>
          <span class="cap-index">{{ String(i + 1).padStart(2, '0') }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@trendquant/design-tokens/tokens.scss' as *;

$font-display: 'Space Grotesk', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;

.capability-section {
  background: $bg-paper;
}

.section-head {
  margin-top: 16px;
  max-width: 22ch;
  font-size: clamp(26px, 3.4vw, 42px);
  font-weight: 600;
  line-height: 1.15;
  color: $text-paper-primary;
}

.cap-grid {
  list-style: none;
  margin: 56px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $space-4;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
}

.cap-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 32px 28px 28px;
  border: 1px solid $border-paper;
  border-radius: $radius-xl;
  background: $bg-paper-elevated;
  transition: border-color 0.16s $ease, transform 0.16s $ease;

  &:hover {
    border-color: $brand;
    transform: translateY(-2px);
  }
}

.cap-icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-md;
  background: var(--brand-soft);
  color: $brand;
  margin-bottom: $space-4;

  :deep(svg) {
    width: 22px;
    height: 22px;
  }
}

.cap-title {
  font-family: $font-display;
  font-size: 19px;
  font-weight: 700;
  color: $text-paper-primary;
}

.cap-line {
  margin-top: 10px;
  font-size: 14.5px;
  line-height: 1.65;
  color: $text-paper-secondary;
  flex: 1;
}

.cap-index {
  position: absolute;
  top: 24px;
  right: 26px;
  font-family: $font-display;
  font-size: 13px;
  font-weight: 600;
  color: $text-paper-tertiary;
  letter-spacing: 0.04em;
}
</style>
