<script setup>
import { products } from '@/data/catalog'
</script>

<template>
  <div class="products">
    <header class="page-head">
      <div class="mkt-container">
        <p class="mkt-eyebrow">产品 · TrendQuant</p>
        <h1 class="page-title">两条产品线，一套投研叙事</h1>
        <p class="page-sub">
          <strong>MindQuant Agent</strong> 负责在线 AI 投研对话；
          <strong>MindQuant Studio</strong> 负责量化交易终端作业。品牌仍是 TrendQuant。
        </p>
      </div>
    </header>

    <section class="mkt-section line-section">
      <div class="mkt-container">
        <div class="product-lines">
          <RouterLink
            v-for="p in products"
            :key="p.slug"
            :to="`/products/${p.slug}`"
            class="line-cell"
          >
            <span class="cell-kicker">{{ p.tagline }}</span>
            <h2 class="cell-title">{{ p.name }}</h2>
            <p class="cell-summary">{{ p.summary }}</p>
            <span class="cell-more">
              了解详情
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </RouterLink>
        </div>
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
  max-width: 56ch;
  font-size: clamp(16px, 1.6vw, 19px);
  line-height: 1.6;
  color: $text-paper-secondary;

  strong {
    color: $text-paper-primary;
    font-weight: 600;
  }
}

.line-section {
  padding-top: 48px;
}
.product-lines {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid $border-paper;
  border-left: 1px solid $border-paper;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
}
.line-cell {
  display: flex;
  flex-direction: column;
  padding: 44px 40px 40px;
  border-right: 1px solid $border-paper;
  border-bottom: 1px solid $border-paper;
  background: $bg-paper;
  transition: background-color 0.18s $ease;

  &:hover {
    background: $bg-paper-elevated;

    .cell-more {
      gap: 12px;
      color: $brand;
    }
  }

  @media (max-width: 720px) {
    padding: 32px 24px;
  }
}
.cell-kicker {
  font-family: $font-display;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: $brand;
}
.cell-title {
  margin-top: 12px;
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 700;
  color: $text-paper-primary;
}
.cell-summary {
  margin-top: 14px;
  max-width: 42ch;
  font-size: 15.5px;
  line-height: 1.65;
  color: $text-paper-secondary;
  flex: 1;
}
.cell-more {
  margin-top: 28px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: $font-display;
  font-size: 15px;
  font-weight: 600;
  color: $text-paper-primary;
  transition: gap 0.15s $ease, color 0.15s $ease;
}
</style>
