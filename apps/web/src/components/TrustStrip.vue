<script setup>
import { trustSignals } from '@/data/catalog'
</script>

<template>
  <section class="trust-section">
    <div class="trust-atmos" aria-hidden="true"></div>
    <div class="mkt-container trust-inner">
      <p class="trust-eyebrow">专注量化投研</p>
      <h2 class="trust-head">为长期决策而建的投研系统</h2>

      <ul class="trust-grid">
        <li v-for="t in trustSignals" :key="t.label" class="trust-item">
          <span class="trust-value">{{ t.value }}</span>
          <span class="trust-label">{{ t.label }}</span>
        </li>
      </ul>

      <p class="trust-note">数据为示意，最终以终端内实际能力为准。</p>
    </div>
  </section>
</template>

<style lang="scss" scoped>
@use '@trendquant/design-tokens/tokens.scss' as *;

$font-display: 'Space Grotesk', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;

.trust-section {
  position: relative;
  overflow: hidden;
  background: $hero-gradient;
  color: $hero-text-primary;
  padding: 88px 0;

  @media (max-width: 720px) {
    padding: 64px 0;
  }
}

.trust-atmos {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(55% 70% at 82% 18%, rgba(59, 130, 246, 0.22) 0%, rgba(59, 130, 246, 0) 60%),
    repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.04) 0 1px, transparent 1px 88px);
}

.trust-inner {
  position: relative;
  z-index: 1;
}

.trust-eyebrow {
  font-family: $font-display;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(130, 180, 255, 0.85);
}

.trust-head {
  margin-top: 14px;
  max-width: 22ch;
  font-size: clamp(24px, 3vw, 38px);
  font-weight: 600;
  line-height: 1.18;
  color: #fff;
}

.trust-grid {
  list-style: none;
  margin: 48px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $space-6;

  @media (max-width: 820px) {
    grid-template-columns: repeat(2, 1fr);
    gap: $space-8;
  }
}

.trust-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: $space-4;
  border-right: 1px solid rgba(148, 163, 184, 0.16);

  &:last-child {
    border-right: none;
  }

  @media (max-width: 820px) {
    border-right: none;
  }
}

.trust-value {
  font-family: $font-display;
  font-size: clamp(28px, 3.4vw, 40px);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #fff;
  line-height: 1;
}

.trust-label {
  font-size: 13.5px;
  color: $hero-text-secondary;
}

.trust-note {
  margin-top: 36px;
  font-size: 12.5px;
  color: rgba(154, 167, 194, 0.6);
}
</style>
