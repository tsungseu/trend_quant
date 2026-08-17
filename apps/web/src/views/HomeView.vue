<script setup>
import { TqButton } from '@trendquant/ui'
import { agentUrl, terminalUrl as studioUrl } from '@/data/terminal'
import CapabilityGrid from '@/components/CapabilityGrid.vue'
import GrowthBand from '@/components/GrowthBand.vue'
import TrustStrip from '@/components/TrustStrip.vue'

// 浅色内容区：两条产品线叙事
const pillars = [
  {
    slug: 'agent',
    kicker: 'MindQuant Agent',
    title: '在线 AI 投研，把问题说清楚',
    line: '对话式研报解读、策略思路探讨与组合建议，辅助研究而非代客理财。',
  },
  {
    slug: 'studio',
    kicker: 'MindQuant Studio',
    title: '量化交易终端，把研究做扎实',
    line: '策略回测、行情指标、持仓交易与预警一体，研究态盈亏与模拟衔接清晰可追溯。',
  },
]
</script>

<template>
  <div class="home">
    <!-- 1. 深色全幅英雄区 -->
    <section class="hero">
      <div class="hero-atmos" aria-hidden="true"></div>
      <div class="mkt-container hero-inner">
        <p class="hero-brand">TrendQuant · 趋势量化</p>
        <h1 class="hero-title">可靠的量化投研系统，<br />服务关键决策</h1>
        <p class="hero-support">
          以 AI 赋能投研，为投资者提供对话式投研、量化回测与策略研究的一体化平台，冷静、可追溯、为长期决策而建。
        </p>
        <div class="hero-cta">
          <TqButton :href="studioUrl" variant="primary" size="lg">打开 Studio</TqButton>
          <TqButton :href="agentUrl" variant="secondary" size="lg">试用 Agent</TqButton>
        </div>
      </div>
    </section>

    <!-- 2. 核心能力宫格 -->
    <CapabilityGrid />

    <!-- 3. 增值服务条 -->
    <GrowthBand />

    <!-- 4. 浅色纸感内容区：产品线 -->
    <section class="mkt-section pillars">
      <div class="mkt-container">
        <p class="mkt-eyebrow">产品线</p>
        <h2 class="pillars-head">Agent 提问，Studio 验证，共用同一套事实。</h2>

        <ul class="pillar-list">
          <li v-for="p in pillars" :key="p.slug" class="pillar-row">
            <div class="pillar-body">
              <span class="pillar-kicker">{{ p.kicker }}</span>
              <h3 class="pillar-title">{{ p.title }}</h3>
              <p class="pillar-line">{{ p.line }}</p>
            </div>
            <RouterLink :to="`/products/${p.slug}`" class="pillar-more" aria-label="了解更多">
              了解
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </RouterLink>
          </li>
        </ul>
      </div>
    </section>

    <!-- 5. 信任条 -->
    <TrustStrip />

    <!-- 6. 收尾 CTA -->
    <section class="closing">
      <div class="mkt-container closing-inner">
        <h2 class="closing-title">把关键决策，建立在可靠系统之上。</h2>
        <div class="closing-cta">
          <TqButton :href="studioUrl" variant="primary" size="lg">打开 Studio</TqButton>
          <TqButton :href="agentUrl" variant="secondary" size="lg">试用 Agent</TqButton>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@trendquant/design-tokens/tokens.scss' as *;

$font-display: 'Space Grotesk', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;

// ---- 英雄区 ----
.hero {
  position: relative;
  overflow: hidden;
  background: $hero-gradient;
  color: $hero-text-primary;
  padding-top: 136px;
  padding-bottom: 112px;
  min-height: 84vh;
  display: flex;
  align-items: center;

  @media (max-width: 720px) {
    padding-top: 116px;
    padding-bottom: 88px;
    min-height: 78vh;
  }
}

// 冷蓝氛围：一处柔和径向辉光 + 细网格叠层（无紫色渐变）
.hero-atmos {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(60% 55% at 78% 12%, rgba(59, 130, 246, 0.28) 0%, rgba(59, 130, 246, 0) 60%),
    radial-gradient(50% 50% at 10% 90%, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0) 55%),
    linear-gradient(
      transparent 0,
      transparent calc(100% - 1px),
      rgba(148, 163, 184, 0.05) calc(100% - 1px)
    ),
    repeating-linear-gradient(90deg, rgba(148, 163, 184, 0.04) 0 1px, transparent 1px 88px);
}

.hero-inner {
  position: relative;
  z-index: 1;
}

.hero-brand {
  font-family: $font-display;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(230, 235, 245, 0.72);
  margin-bottom: 28px;
}

.hero-title {
  font-family: $font-display;
  font-weight: 700;
  font-size: clamp(38px, 6.4vw, 84px);
  line-height: 1.02;
  letter-spacing: -0.03em;
  max-width: 15ch;
  color: #fff;
}

.hero-support {
  margin-top: 28px;
  max-width: 52ch;
  font-size: clamp(16px, 1.5vw, 20px);
  line-height: 1.6;
  color: $hero-text-secondary;
}

.hero-cta {
  margin-top: 44px;
  display: flex;
  gap: $space-4;
  flex-wrap: wrap;
}

// ---- 浅色能力线 ----
.pillars {
  background: $bg-paper;
}
.pillars-head {
  margin-top: 18px;
  max-width: 20ch;
  font-size: clamp(26px, 3.4vw, 42px);
  font-weight: 600;
  line-height: 1.15;
  color: $text-paper-primary;
}

.pillar-list {
  list-style: none;
  margin: 56px 0 0;
  padding: 0;
  border-top: 1px solid $border-paper;
}
.pillar-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
  gap: $space-6;
  padding: 36px 0;
  border-bottom: 1px solid $border-paper;

  @media (max-width: 640px) {
    gap: $space-4;
    padding: 28px 0;
  }
}
.pillar-kicker {
  font-family: $font-display;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: $brand;
}
.pillar-title {
  margin-top: 8px;
  font-size: clamp(20px, 2.4vw, 28px);
  font-weight: 600;
  color: $text-paper-primary;
}
.pillar-line {
  margin-top: 12px;
  max-width: 60ch;
  font-size: 16px;
  line-height: 1.65;
  color: $text-paper-secondary;
}
.pillar-more {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: $font-display;
  font-size: 15px;
  font-weight: 600;
  color: $text-paper-primary;
  white-space: nowrap;
  padding-top: 4px;
  transition: gap 0.15s $ease, color 0.15s $ease;

  &:hover {
    gap: 12px;
    color: $brand;
  }
}

// ---- 收尾 CTA ----
// 与上方信任条（--hero-gradient 底部为 --hero-bg-end）无缝相接，
// 并向页脚的 --hero-bg-start 渐变过渡，消除深色区色调断层。
.closing {
  // 深色区块显式设文字色，避免继承浅色主题墨色（新增未设色文本会隐形）
  color: $hero-text-primary;
  background: linear-gradient(180deg, $hero-bg-end 0%, #0d1523 100%);
  padding: 104px 0;
}
.closing-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-8;
  flex-wrap: wrap;
}
.closing-cta {
  display: flex;
  gap: $space-4;
  flex-wrap: wrap;
}
.closing-title {
  font-size: clamp(24px, 3.2vw, 40px);
  font-weight: 600;
  line-height: 1.2;
  color: #fff;
  max-width: 18ch;
}
</style>
