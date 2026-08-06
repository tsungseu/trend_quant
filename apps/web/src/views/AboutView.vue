<script setup>
import { TqButton } from '@trendquant/ui'

const terminalUrl = import.meta.env.VITE_TERMINAL_URL || 'http://localhost:5173/app'

const principles = [
  {
    title: '可追溯优先',
    line: '每个数字都能回到它的来源与时点，判断建立在可核对的事实上。',
  },
  {
    title: '研究与执行同源',
    line: '回测里成立的逻辑，实盘里就是同一套逻辑，杜绝研究到执行的漂移。',
  },
  {
    title: '把决策留给人',
    line: '系统负责重复与提醒，关键动作保留人工关口——工具不替你下判断。',
  },
]
</script>

<template>
  <div class="about">
    <header class="page-head">
      <div class="mkt-container">
        <p class="mkt-eyebrow">关于</p>
        <h1 class="page-title">为关键决策，建一套冷静的系统</h1>
        <p class="page-blurb">
          TrendQuant（趋势量化）是一体化的量化投研终端。我们把研究、数据、交易与知识收敛到同一套事实之上，
          让专业投研既高效又可追溯。我们相信好的工具应当克制——放大你的判断，而不是替你做判断。
        </p>
      </div>
    </header>

    <section class="mkt-section principles">
      <div class="mkt-container">
        <div class="principle-grid">
          <div v-for="(p, i) in principles" :key="i" class="principle">
            <span class="principle-index">{{ String(i + 1).padStart(2, '0') }}</span>
            <h2 class="principle-title">{{ p.title }}</h2>
            <p class="principle-line">{{ p.line }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="about-cta-band">
      <div class="mkt-container band-inner">
        <div>
          <h2 class="band-title">准备好开始了吗？</h2>
          <p class="band-sub">进入终端，用一次真实研究检验它。</p>
        </div>
        <TqButton :href="terminalUrl" variant="primary" size="lg">进入终端</TqButton>
      </div>
    </section>

    <section class="disclaimer">
      <div class="mkt-container">
        <p class="disclaimer-text">
          免责声明：TrendQuant 为研究工具，非投资建议。平台所呈现的数据、策略与结果仅供研究参考，
          不构成任何要约、招揽或投资推荐。市场有风险，投资需谨慎，一切决策请独立判断并自负其责。
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
  max-width: 20ch;
  font-size: clamp(34px, 5vw, 60px);
  font-weight: 700;
  color: $text-paper-primary;
}
.page-blurb {
  margin-top: 24px;
  max-width: 64ch;
  font-size: clamp(16px, 1.7vw, 20px);
  line-height: 1.7;
  color: $text-paper-secondary;
}

.principles {
  padding-top: 40px;
}
.principle-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $space-8;
  border-top: 1px solid $border-paper;
  padding-top: 48px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    gap: $space-6;
  }
}
.principle-index {
  font-family: $font-display;
  font-size: 15px;
  font-weight: 600;
  color: $brand;
}
.principle-title {
  margin-top: 14px;
  font-size: 22px;
  font-weight: 700;
  color: $text-paper-primary;
}
.principle-line {
  margin-top: 12px;
  font-size: 15.5px;
  line-height: 1.65;
  color: $text-paper-secondary;
}

.about-cta-band {
  background: $hero-bg-end;
  padding: 72px 0;
}
.band-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-8;
  flex-wrap: wrap;
}
.band-title {
  font-size: clamp(24px, 3vw, 36px);
  font-weight: 700;
  color: #fff;
}
.band-sub {
  margin-top: 10px;
  font-size: 16px;
  color: $hero-text-secondary;
}

.disclaimer {
  background: $bg-paper;
  padding: 48px 0 88px;
}
.disclaimer-text {
  max-width: 76ch;
  font-size: 13px;
  line-height: 1.8;
  color: $text-paper-tertiary;
}
</style>
