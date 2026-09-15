<script setup>
import { growthResources } from '@/data/catalog'
</script>

<template>
  <section class="mkt-section growth-section">
    <div class="mkt-container">
      <div class="growth-head">
        <h2 class="section-head">不只是工具，更是一条可成长的研究路径</h2>
        <p class="section-sub">
          从零上手到沉淀方法论：配套教程、策略模板与衔接实盘的研究态，让每一步都能被复用。
        </p>
      </div>

      <div class="growth-grid">
        <div
          v-for="(g, i) in growthResources"
          :key="g.title"
          class="growth-card"
          :class="{ tinted: i === 1 }"
        >
          <h3 class="growth-title">{{ g.title }}</h3>
          <p class="growth-line">{{ g.line }}</p>
          <RouterLink :to="g.href" class="growth-cta">
            {{ g.cta }}
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@trendquant/design-tokens/tokens.scss' as *;

$font-display: 'Space Grotesk', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;

.growth-section {
  background: $bg-paper-elevated;
  border-top: 1px solid $border-paper;
  border-bottom: 1px solid $border-paper;
}

// 标题与副文纵向堆叠（禁用「左大标题 + 右小段」分头布局）
.growth-head {
  max-width: 640px;
}
.section-head {
  max-width: 22ch;
  font-size: clamp(24px, 3vw, 36px);
  font-weight: 600;
  line-height: 1.18;
  color: $text-paper-primary;
}

.section-sub {
  margin-top: 16px;
  max-width: 52ch;
  font-size: 15.5px;
  line-height: 1.6;
  color: $text-paper-secondary;
}

.growth-grid {
  margin-top: 48px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $space-4;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.growth-card {
  display: flex;
  flex-direction: column;
  padding: 32px 28px;
  background: $bg-paper;
  border: 1px solid $border-paper;
  border-radius: $radius-xl;
  transition: border-color 0.16s $ease;

  &:hover {
    border-color: $brand;
  }
}

// 中卡品牌色浸染，避免三张等价卡片的模板感
.growth-card.tinted {
  background:
    linear-gradient(180deg, var(--brand-soft) 0%, rgba(37, 99, 235, 0.02) 58%),
    $bg-paper;
  border-color: rgba(37, 99, 235, 0.24);
}

.growth-title {
  font-family: $font-display;
  font-size: 20px;
  font-weight: 700;
  color: $text-paper-primary;
}

.growth-line {
  margin-top: 12px;
  flex: 1;
  font-size: 14.5px;
  line-height: 1.65;
  color: $text-paper-secondary;
}

.growth-cta {
  margin-top: 24px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  font-family: $font-display;
  font-size: 14px;
  font-weight: 600;
  color: $brand;
  transition: gap 0.15s $ease;

  &:hover {
    gap: 12px;
  }
}
</style>
