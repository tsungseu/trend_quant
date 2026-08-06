<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { TqButton } from '@trendquant/ui'
import { getProduct, products } from '@/data/catalog'

const route = useRoute()
const terminalUrl = import.meta.env.VITE_TERMINAL_URL || 'http://localhost:5173/app'

const product = computed(() => getProduct(route.params.slug))

// 相邻产品，供页尾继续浏览
const others = computed(() =>
  product.value ? products.filter((p) => p.slug !== product.value.slug) : products,
)
</script>

<template>
  <div class="product-detail">
    <template v-if="product">
      <!-- 深色产品英雄带 -->
      <section class="detail-hero">
        <div class="hero-atmos" aria-hidden="true"></div>
        <div class="mkt-container detail-hero-inner">
          <RouterLink to="/products" class="back-link">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            全部产品
          </RouterLink>
          <p class="detail-kicker">{{ product.tagline }}</p>
          <h1 class="detail-title">{{ product.name }}</h1>
          <p class="detail-summary">{{ product.summary }}</p>
          <div class="detail-cta">
            <TqButton :href="terminalUrl" variant="primary" size="lg">进入终端</TqButton>
          </div>
        </div>
      </section>

      <!-- 浅色能力要点 -->
      <section class="mkt-section detail-points">
        <div class="mkt-container">
          <p class="mkt-eyebrow">核心能力</p>
          <ul class="point-list">
            <li v-for="(pt, i) in product.points" :key="i" class="point-row">
              <span class="point-index">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="point-text">{{ pt }}</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- 继续浏览 -->
      <section class="more-products">
        <div class="mkt-container">
          <span class="more-h">继续了解</span>
          <div class="more-grid">
            <RouterLink
              v-for="o in others"
              :key="o.slug"
              :to="`/products/${o.slug}`"
              class="more-cell"
            >
              <h3>{{ o.name }}</h3>
              <p>{{ o.tagline }}</p>
            </RouterLink>
          </div>
        </div>
      </section>
    </template>

    <!-- 未知 slug 兜底 -->
    <section v-else class="empty-state">
      <div class="mkt-container">
        <h1>未找到该产品</h1>
        <p>该产品条目不存在或已调整，返回查看完整产品矩阵。</p>
        <RouterLink to="/products" class="empty-link">返回产品</RouterLink>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@trendquant/design-tokens/tokens.scss' as *;

$font-display: 'Space Grotesk', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;

.detail-hero {
  position: relative;
  overflow: hidden;
  background: $hero-gradient;
  color: $hero-text-primary;
  padding-top: 148px;
  padding-bottom: 88px;
}
.hero-atmos {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(55% 60% at 82% 8%, rgba(59, 130, 246, 0.26) 0%, rgba(59, 130, 246, 0) 60%),
    repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.04) 0 1px, transparent 1px 88px);
}
.detail-hero-inner {
  position: relative;
  z-index: 1;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(230, 235, 245, 0.72);
  transition: color 0.15s $ease;
  &:hover {
    color: #fff;
  }
}
.detail-kicker {
  margin-top: 28px;
  font-family: $font-display;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: $brand;
}
.detail-title {
  margin-top: 12px;
  font-size: clamp(38px, 6vw, 72px);
  font-weight: 700;
  color: #fff;
}
.detail-summary {
  margin-top: 22px;
  max-width: 52ch;
  font-size: clamp(16px, 1.6vw, 20px);
  line-height: 1.6;
  color: $hero-text-secondary;
}
.detail-cta {
  margin-top: 36px;
}

// ---- 要点 ----
.point-list {
  list-style: none;
  margin: 40px 0 0;
  padding: 0;
  border-top: 1px solid $border-paper;
}
.point-row {
  display: flex;
  align-items: baseline;
  gap: $space-6;
  padding: 28px 0;
  border-bottom: 1px solid $border-paper;
}
.point-index {
  font-family: $font-display;
  font-size: 15px;
  font-weight: 600;
  color: $brand;
  flex-shrink: 0;
}
.point-text {
  font-size: clamp(18px, 2.2vw, 24px);
  font-weight: 500;
  line-height: 1.4;
  color: $text-paper-primary;
}

// ---- 继续浏览 ----
.more-products {
  padding: 0 0 96px;
  background: $bg-paper;
}
.more-h {
  display: block;
  font-family: $font-display;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: $text-paper-tertiary;
  margin-bottom: 20px;
}
.more-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $space-4;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
}
.more-cell {
  padding: 24px;
  border: 1px solid $border-paper;
  border-radius: $radius-lg;
  background: $bg-paper-elevated;
  transition: border-color 0.15s $ease, transform 0.15s $ease;

  h3 {
    font-size: 19px;
    font-weight: 700;
    color: $text-paper-primary;
  }
  p {
    margin-top: 8px;
    font-size: 14px;
    color: $text-paper-secondary;
  }
  &:hover {
    border-color: $brand;
    transform: translateY(-2px);
  }
}

// ---- 兜底 ----
.empty-state {
  padding: 200px 0 160px;
  text-align: center;

  h1 {
    font-size: clamp(28px, 4vw, 44px);
    color: $text-paper-primary;
  }
  p {
    margin-top: 16px;
    color: $text-paper-secondary;
  }
}
.empty-link {
  display: inline-block;
  margin-top: 28px;
  color: $brand;
  font-weight: 600;
}
</style>
