<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { funds as fundMeta, getNavSeries, getFund, computeSnapshot } from '@/mock/funds'
import { fundCatalog } from '@/mock/fundCatalog'
import { buildSignals } from '@/mock/indicators'
import { fmtPct, sign, fmtMoney } from '@/mock/_helpers'
import { useFundsStore } from '@/stores/funds'
import FundAddDialog from '@/components/FundAddDialog.vue'

const store = useFundsStore()
const addDialogOpen = ref(false)

onMounted(() => {
  store.fetchAll(252)
})

// 解析基金元信息：核心4只有完整字段，其余从 catalog 取基础信息
function resolveMeta(code) {
  const core = getFund(code)
  if (core) return core
  const c = fundCatalog.find((f) => f.code === code)
  if (c) {
    return {
      code: c.code, name: c.name, short: c.short, type: c.type, theme: c.theme,
      themeColor: '#64748b', manager: '—', risk: '—',
      pe: 0, pePct5y: 0.5, aum: 0, dividend: '0', fee: '—',
      startNav: 1, vol: 0.02, trend: 'up',
    }
  }
  return { code, name: code, short: code, type: '', theme: '', themeColor: '#64748b', pe: 0, pePct5y: 0.5 }
}

// 当前自选的基金（优先真实净值，回退 mock）
const enriched = computed(() =>
  store.watchlist.map((code) => {
    const meta = resolveMeta(code)
    const real = store.navSeries(code)
    const navs = real.length ? real : getNavSeries(code)
    const fund = { ...meta }
    const snap = computeSnapshot(navs)
    if (snap) Object.assign(fund, snap)
    const sig = navs.length >= 2 ? buildSignals(fund, navs) : null
    return { fund, sig, slot: store.byCode[code] }
  })
)

const stats = computed(() => {
  const withSig = enriched.value.filter((e) => e.sig)
  const buy = withSig.filter((e) => e.sig.signals.action === 'buy').length
  const sell = withSig.filter((e) => e.sig.signals.action === 'sell').length
  return { buy, sell, hold: withSig.length - buy - sell }
})

// ---- 持仓汇总（用真实净值算盈亏）----
const currentNav = (code) => {
  const e = enriched.value.find((x) => x.fund.code === code)
  return e?.fund?.nav || 0
}
const portfolio = computed(() => store.portfolioSummary(currentNav))
// 实时估值（fundgz）
const estOf = (code) => store.getEstimate(code)

const anyLoading = computed(() =>
  enriched.value.some((e) => e.slot?.loading)
)
const updatedAt = computed(() =>
  enriched.value.map((e) => e.slot?.updatedAt).filter(Boolean).sort().pop()
)

// 线上 GitHub Pages 服务器在境外，东财/新浪接口对境外 IP 限制（-999），
// 无法直接拿到真实数据；本地开发（境内 IP）正常。
const isOnlineDemo = computed(() => location.hostname.endsWith('github.io'))
const dataUnavailableHint = computed(() =>
  isOnlineDemo.value ? '线上演示：数据源(东方财富)对境外IP限制，显示历史快照' : '实时数据未就绪，显示历史快照'
)
const dataUnavailableReason = computed(() =>
  isOnlineDemo.value
    ? 'GitHub Pages 服务器在境外，东方财富接口返回 -999 拒绝。本地运行 npm run dev 可看真实数据；线上需自建境内代理。'
    : '接口请求失败，请检查网络'
)

async function refreshAll() {
  await store.fetchAll(252)
}
function removeWatch(code) {
  store.removeWatch(code)
}

const actionTag = {
  buy: { cls: 'buy', icon: '▲' },
  sell: { cls: 'sell', icon: '▼' },
  hold: { cls: 'hold', icon: '●' },
}
</script>

<template>
  <div class="funds-list">
    <!-- 概览 -->
    <section class="summary panel">
      <div class="sm">
        <div class="lbl">自选基金</div>
        <div class="val brand num">{{ enriched.length }} <span class="dim">只</span></div>
      </div>
      <div class="sm">
        <div class="lbl">持仓市值</div>
        <div class="val gold num">{{ fmtMoney(portfolio.marketValue).replace('¥', '¥ ') }}</div>
      </div>
      <div class="sm">
        <div class="lbl">累计盈亏</div>
        <div class="val num" :class="portfolio.profit > 0 ? 'up' : 'down'">
          {{ sign(portfolio.profit) }}{{ fmtMoney(portfolio.profit).replace('¥', '¥ ') }}
          <div class="val-pct">({{ fmtPct(portfolio.profitPct) }})</div>
        </div>
      </div>
      <div class="sm">
        <div class="lbl">建议买入</div>
        <div class="val up num">{{ stats.buy }} <span class="dim">只</span></div>
      </div>
      <div class="sm">
        <div class="lbl">建议卖出</div>
        <div class="val down num">{{ stats.sell }} <span class="dim">只</span></div>
      </div>
      <div class="sm action">
        <button class="btn btn-primary" @click="addDialogOpen = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          添加自选
        </button>
      </div>
    </section>

    <!-- 数据状态条 -->
    <div class="data-bar">
      <span class="data-status">
        <span v-if="anyLoading" class="loading-dot"></span>
        <span v-if="anyLoading" class="muted">实时净值加载中…</span>
        <span v-else-if="updatedAt" class="muted">✓ 东方财富真实数据 · 更新于 {{ updatedAt }}</span>
        <span v-else class="muted warn" :title="dataUnavailableReason">
          ⚠ {{ dataUnavailableHint }}
        </span>
      </span>
      <button class="btn btn-ghost btn-sm" :disabled="anyLoading" @click="refreshAll">
        <span :class="{ spinning: anyLoading }">↻</span> 刷新
      </button>
    </div>

    <!-- 基金卡片 -->
    <section v-if="enriched.length" class="grid">
      <RouterLink
        v-for="{ fund, sig, slot } in enriched"
        :key="fund.code"
        :to="`/funds/${fund.code}`"
        class="fund-card panel"
      >
        <!-- 头部：信号 + 名称 -->
        <div class="fc-head">
          <div class="fc-theme" :style="{ background: fund.themeColor + '22', color: fund.themeColor }">
            {{ fund.short.charAt(0) }}
          </div>
          <div class="fc-info">
            <div class="fc-name">
              {{ fund.short }}
              <span class="fc-code">{{ fund.code }}</span>
            </div>
            <div class="fc-sub">{{ fund.theme }} · {{ fund.type }}</div>
          </div>
          <span v-if="sig" class="action-badge" :class="[actionTag[sig.signals.action].cls, sig.signals.actionLevel]">
            {{ actionTag[sig.signals.action].icon }} {{ sig.signals.actionText }}
          </span>
          <span v-else class="action-badge hold">○ 数据加载中</span>
          <button class="fc-remove" title="取消自选" @click.prevent.stop="removeWatch(fund.code)">✕</button>
        </div>

        <!-- 净值 -->
        <div class="fc-nav">
          <div class="nav-val num" :class="fund.changePct > 0 ? 'up' : 'down'">
            {{ fund.nav ? fund.nav.toFixed(4) : '—' }}
            <span class="nav-chg num" v-if="fund.change !== undefined">
              {{ sign(fund.change) }}{{ fund.change }} ({{ fmtPct(fund.changePct) }})
            </span>
          </div>
          <div class="nav-label">
            单位净值
            <span v-if="estOf(fund.code)" class="est-inline">
              · 估值 <b class="num" :class="estOf(fund.code).gszzl > 0 ? 'up' : 'down'">{{ estOf(fund.code).gsz.toFixed(4) }} ({{ estOf(fund.code).gszzl > 0 ? '+' : '' }}{{ estOf(fund.code).gszzl }}%)</b>
            </span>
          </div>
        </div>

        <template v-if="sig">
        <!-- 关键指标网格 -->
        <div class="fc-metrics">
          <div class="m">
            <span class="ml">PE</span>
            <span class="mv num">{{ fund.pe || '—' }}</span>
            <span v-if="fund.pe" class="mp num" :class="fund.pePct5y <= 0.3 ? 'up' : fund.pePct5y >= 0.7 ? 'down' : ''">
              {{ (fund.pePct5y * 100).toFixed(0) }}%分位
            </span>
          </div>
          <div class="m">
            <span class="ml">最大回撤</span>
            <span class="mv num down">{{ (sig.drawdown.maxDD * 100).toFixed(1) }}%</span>
          </div>
          <div class="m">
            <span class="ml">RSI</span>
            <span class="mv num" :class="sig.indicators.rsi < 30 ? 'up' : sig.indicators.rsi > 70 ? 'down' : ''">
              {{ sig.indicators.rsi }}
            </span>
          </div>
          <div class="m">
            <span class="ml">修复度</span>
            <span class="mv num" :class="sig.drawdown.recoveryFromTrough > 0 ? 'up' : 'down'">
              {{ (sig.drawdown.recoveryFromTrough * 100).toFixed(1) }}%
            </span>
          </div>
        </div>

        <!-- 建议点位 -->
        <div class="fc-points">
          <div class="pt buy">
            <span class="pt-l">建议买入</span>
            <span class="pt-v num">{{ sig.signals.buyPoint }}</span>
            <span class="pt-g num">{{ (sig.signals.downsideToBuy * 100).toFixed(1) }}%</span>
          </div>
          <div class="pt sell">
            <span class="pt-l">建议卖出</span>
            <span class="pt-v num">{{ sig.signals.sellPoint }}</span>
            <span class="pt-g num">+{{ (sig.signals.upsideToSell * 100).toFixed(1) }}%</span>
          </div>
        </div>

        <!-- 信号理由（取最强的2条）-->
        <div class="fc-reasons">
          <div
            v-for="r in sig.signals.reasons.filter(x => x.tone !== 'hold').slice(0, 2)"
            :key="r.tag"
            class="reason-chip"
            :class="r.tone"
          >
            {{ r.tag }}
          </div>
          <span class="more">查看详情 ›</span>
        </div>
        </template>
        <div v-else class="fc-loading muted">指标计算中…</div>
      </RouterLink>
    </section>

    <!-- 空状态 -->
    <section v-else class="empty-watch panel">
      <div class="ew-icon">📊</div>
      <h3>还没有自选基金</h3>
      <p class="muted">点击「添加自选」搜索并添加你关注的基金</p>
      <button class="btn btn-primary" @click="addDialogOpen = true">+ 添加自选基金</button>
    </section>

    <FundAddDialog v-model="addDialogOpen" />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.funds-list {
  display: flex;
  flex-direction: column;
  gap: $space-5;
}

.data-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $space-2;
}
.data-status {
  display: flex;
  align-items: center;
  gap: $space-2;
  font-size: 12px;
  .muted { color: $text-tertiary; }
  .warn { color: $warning; }
}
.loading-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: $brand;
  animation: pulse-dot 1s infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.1); }
}
.spinning { display: inline-block; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.summary {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1px;
  background: $border-subtle;
  padding: 1px;
}
.sm {
  background: $bg-panel;
  padding: $space-4 $space-5;
  display: flex;
  flex-direction: column;
  gap: 4px;
  .lbl { font-size: 12px; color: $text-secondary; }
  .val {
    font-size: 22px;
    font-weight: 700;
    &.brand { color: $brand; }
    &.up { color: $up; }
    &.down { color: $down; }
    &.gold { color: $gold; }
    .dim { font-size: 13px; font-weight: 500; color: $text-tertiary; }
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: $space-5;
}

.fund-card {
  display: block;
  padding: $space-5;
  cursor: pointer;
  transition: transform $transition-fast, border-color $transition-fast, box-shadow $transition-fast;
  &:hover {
    transform: translateY(-3px);
    border-color: $border-default;
    box-shadow: $shadow-md;
  }
}

.fc-head {
  display: flex;
  align-items: center;
  gap: $space-3;
  margin-bottom: $space-4;
}
.fc-theme {
  width: 40px; height: 40px;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}
.fc-info { flex: 1; min-width: 0; }
.fc-name {
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: $space-2;
  .fc-code {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 4px;
    background: $bg-panel-2;
    color: $text-tertiary;
    font-weight: 400;
    font-family: 'JetBrains Mono', monospace;
  }
}
.fc-sub { font-size: 11px; color: $text-tertiary; margin-top: 2px; }

.action-badge {
  padding: 5px 10px;
  border-radius: $radius-md;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  &.buy {
    color: $up;
    background: $up-bg;
    &.strong { background: $up; color: #fff; }
  }
  &.sell {
    color: $down;
    background: $down-bg;
    &.strong { background: $down; color: #fff; }
  }
  &.hold {
    color: $text-secondary;
    background: $bg-panel-2;
  }
}

.fc-nav {
  margin-bottom: $space-4;
  padding-bottom: $space-4;
  border-bottom: 1px solid $border-subtle;
  .nav-val {
    font-size: 28px;
    font-weight: 700;
    display: flex;
    align-items: baseline;
    gap: $space-3;
    .nav-chg { font-size: 13px; font-weight: 500; }
  }
  .nav-label { font-size: 11px; color: $text-tertiary; margin-top: 2px; }
}

.fc-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $space-3;
  margin-bottom: $space-4;
}
.m {
  display: flex;
  align-items: baseline;
  gap: $space-2;
  .ml { font-size: 11px; color: $text-tertiary; }
  .mv { font-size: 16px; font-weight: 600; }
  .mp { font-size: 11px; margin-left: auto; }
}

.fc-points {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $space-3;
  padding: $space-3;
  background: $bg-panel-2;
  border-radius: $radius-md;
  margin-bottom: $space-3;
}
.pt {
  display: flex;
  flex-direction: column;
  gap: 2px;
  .pt-l { font-size: 11px; color: $text-tertiary; }
  .pt-v { font-size: 16px; font-weight: 700; }
  .pt-g { font-size: 11px; }
  &.buy {
    .pt-v, .pt-g { color: $up; }
  }
  &.sell {
    .pt-v, .pt-g { color: $down; }
  }
}

.fc-reasons {
  display: flex;
  align-items: center;
  gap: $space-2;
  flex-wrap: wrap;
}
.reason-chip {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 500;
  &.buy { background: $up-bg; color: $up; }
  &.sell { background: $down-bg; color: $down; }
}
.more {
  margin-left: auto;
  font-size: 12px;
  color: $brand;
}

.val-pct {
  font-size: 12px;
  font-weight: 500;
  margin-top: 2px;
}
.fc-remove {
  width: 22px; height: 22px;
  border-radius: 50%;
  flex-shrink: 0;
  font-size: 11px;
  color: $text-tertiary;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: $transition-fast;
  &:hover { background: rgba(239, 68, 68, 0.15); color: $danger; }
}
.fc-loading {
  padding: $space-4 0;
  text-align: center;
  font-size: 12px;
}
.empty-watch {
  padding: $space-10 $space-6;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-3;
  .ew-icon { font-size: 56px; }
  h3 { font-size: 18px; }
  p { font-size: 13px; }
}
</style>
