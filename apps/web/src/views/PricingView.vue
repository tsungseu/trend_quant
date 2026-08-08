<script setup>
import { TqButton } from '@trendquant/ui'
import { pricingTiers } from '@/data/catalog'
import { terminalUrl as studioUrl } from '@/data/terminal'
</script>

<template>
  <div class="pricing">
    <header class="page-head">
      <div class="mkt-container">
        <p class="mkt-eyebrow">价格</p>
        <h1 class="page-title">按需要选择，随研究成长</h1>
        <p class="page-sub">
          从个人研究到机构团队，能力逐级解锁。所有档位都指向同一个终端，先用起来再决定。
        </p>
      </div>
    </header>

    <section class="mkt-section tiers-section">
      <div class="mkt-container">
        <div class="tiers">
          <div
            v-for="t in pricingTiers"
            :key="t.id"
            class="tier"
            :class="{ featured: t.featured }"
          >
            <div v-if="t.featured" class="tier-badge">推荐</div>
            <h2 class="tier-name">{{ t.name }}</h2>
            <div class="tier-price">
              <span class="price-amount">{{ t.price }}</span>
              <span v-if="t.period" class="price-period">{{ t.period }}</span>
            </div>
            <p class="tier-blurb">{{ t.blurb }}</p>

            <TqButton
              :href="studioUrl"
              :variant="t.featured ? 'primary' : 'secondary'"
              size="lg"
              class="tier-cta"
            >
              {{ t.cta }}
            </TqButton>

            <ul class="benefit-list">
              <li v-for="(b, i) in t.benefits" :key="i" class="benefit">
                <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span>{{ b }}</span>
              </li>
            </ul>
          </div>
        </div>

        <p class="pricing-note">
          价格与权益为示意，最终以终端内实际方案为准。TrendQuant 为研究工具，非投资建议。
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

.tiers-section {
  padding-top: 48px;
}
.tiers {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $space-5;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    max-width: 480px;
    margin: 0 auto;
  }
}

.tier {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 36px 32px;
  border: 1px solid $border-paper;
  border-radius: $radius-xl;
  background: $bg-paper-elevated;
}
.tier.featured {
  border-color: $brand;
  background: #fff;
  box-shadow: 0 24px 60px rgba(37, 99, 235, 0.12);
}
.tier-badge {
  position: absolute;
  top: 20px;
  right: 24px;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--brand-soft);
  color: $brand;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.tier-name {
  font-family: $font-display;
  font-size: 22px;
  font-weight: 700;
  color: $text-paper-primary;
}
.tier-price {
  margin-top: 16px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.price-amount {
  font-family: $font-display;
  font-size: 40px;
  font-weight: 700;
  color: $text-paper-primary;
  letter-spacing: -0.02em;
}
.price-period {
  font-size: 14px;
  color: $text-paper-tertiary;
}
.tier-blurb {
  margin-top: 12px;
  min-height: 44px;
  font-size: 14.5px;
  line-height: 1.6;
  color: $text-paper-secondary;
}
.tier-cta {
  margin-top: 24px;
  width: 100%;
}
.benefit-list {
  list-style: none;
  margin: 28px 0 0;
  padding: 24px 0 0;
  border-top: 1px solid $border-paper;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.benefit {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14.5px;
  line-height: 1.5;
  color: $text-paper-secondary;

  svg {
    color: $brand;
    flex-shrink: 0;
    margin-top: 2px;
  }
}

.pricing-note {
  margin-top: 40px;
  text-align: center;
  font-size: 13px;
  color: $text-paper-tertiary;
}
</style>
