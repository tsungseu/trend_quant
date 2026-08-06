<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { docsEntries } from '@/data/catalog'

const route = useRoute()
const activeSection = computed(() => route.params.section || '')
</script>

<template>
  <div class="docs">
    <header class="page-head">
      <div class="mkt-container">
        <p class="mkt-eyebrow">知识库</p>
        <h1 class="page-title">理解方法，而不只是使用工具</h1>
        <p class="page-sub">
          从上手教程到策略背后的假设，再到接入 API——让每一步研究都能被检验、被复用。
        </p>
      </div>
    </header>

    <section class="mkt-section entries-section">
      <div class="mkt-container">
        <div class="entries">
          <RouterLink
            v-for="d in docsEntries"
            :key="d.slug"
            :to="`/docs/${d.slug}`"
            class="entry"
            :class="{ active: activeSection === d.slug }"
          >
            <span class="entry-index">
              {{ String(docsEntries.indexOf(d) + 1).padStart(2, '0') }}
            </span>
            <h2 class="entry-name">{{ d.name }}</h2>
            <p class="entry-summary">{{ d.summary }}</p>
            <span class="entry-more">
              阅读
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </RouterLink>
        </div>

        <p v-if="activeSection" class="section-hint">
          当前章节：<strong>{{ activeSection }}</strong> · 完整文档正在建设中。
        </p>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@trendquant/design-tokens/tokens.scss' as *;

$font-display: 'Space Grotesk', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;

.page-head {
  padding-top: 148px;
  padding-bottom: 8px;
  background: $bg-paper;
}
.page-title {
  margin-top: 16px;
  font-size: clamp(34px, 5vw, 60px);
  font-weight: 700;
  color: $text-paper-primary;
}
.page-sub {
  margin-top: 20px;
  max-width: 54ch;
  font-size: clamp(16px, 1.6vw, 19px);
  line-height: 1.6;
  color: $text-paper-secondary;
}

.entries-section {
  padding-top: 48px;
}
.entries {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $space-4;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
}
.entry {
  display: flex;
  flex-direction: column;
  padding: 32px 28px;
  border: 1px solid $border-paper;
  border-radius: $radius-xl;
  background: $bg-paper-elevated;
  transition: border-color 0.16s $ease, transform 0.16s $ease;

  &:hover,
  &.active {
    border-color: $brand;
    transform: translateY(-2px);

    .entry-more {
      gap: 12px;
      color: $brand;
    }
  }
}
.entry-index {
  font-family: $font-display;
  font-size: 14px;
  font-weight: 600;
  color: $brand;
}
.entry-name {
  margin-top: 14px;
  font-size: 24px;
  font-weight: 700;
  color: $text-paper-primary;
}
.entry-summary {
  margin-top: 12px;
  flex: 1;
  font-size: 15px;
  line-height: 1.65;
  color: $text-paper-secondary;
}
.entry-more {
  margin-top: 24px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: $font-display;
  font-size: 14px;
  font-weight: 600;
  color: $text-paper-primary;
  transition: gap 0.15s $ease, color 0.15s $ease;
}

.section-hint {
  margin-top: 32px;
  font-size: 14px;
  color: $text-paper-secondary;

  strong {
    color: $text-paper-primary;
  }
}
</style>
