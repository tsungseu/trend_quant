<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { funds as fundMeta, getNavSeries, getFund, computeSnapshot } from '@/mock/funds'
import { fundCatalog } from '@/mock/fundCatalog'
import { buildSignals } from '@/mock/indicators'
import { fmtPct, sign, fmtMoney } from '@/mock/_helpers'
import { dataModeLabel } from '@/config/runtime'
import { DATA_QUALITY, DATA_SOURCE, isReliableQuality, makeMock, qualityClass, qualityLabel } from '@/utils/dataQuality'
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
  // 优先用搜索时缓存的元信息，其次 catalog，最后兜底
  const m = store.getMeta(code)
  if (m) {
    return {
      code, name: m.fullName || m.name, short: m.name, type: m.type, theme: m.theme || m.type,
      themeColor: '#64748b', manager: '—', risk: '—',
      pe: 0, pePct5y: 0.5, aum: 0, dividend: '0', fee: '—',
      startNav: 1, vol: 0.02, trend: 'up',
    }
  }
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

function mockMeta(navs) {
  return makeMock(navs, navs[navs.length - 1]?.date || '')
}

// 当前自选的基金（优先真实净值，回退 mock；信号按数据质量分为正式模型观察/历史样例观察）
const enriched = computed(() =>
  store.watchlist.map((code) => {
    const meta = resolveMeta(code)
    const real = store.navSeries(code)
    const realMeta = store.navMeta(code)
    const fallback = getNavSeries(code)
    const usingReal = real.length > 0
    const navs = usingReal ? real : fallback
    const dataMeta = usingReal ? realMeta : mockMeta(navs)
    const reliable = usingReal && isReliableQuality(dataMeta)
    const fund = { ...meta }
    const snap = computeSnapshot(navs)
    if (snap) Object.assign(fund, snap)
    const sig = navs.length >= 2 ? buildSignals(fund, navs) : null
    const signalMode = reliable ? 'model' : sig ? 'sample' : 'none'
    return { fund, sig, slot: realMeta, dataMeta, reliable, signalMode, usingReal }
  })
)

const stats = computed(() => {
  const formal = enriched.value.filter((e) => e.signalMode === 'model' && e.sig)
  const buy = formal.filter((e) => e.sig.signals.action === 'buy').length
  const sell = formal.filter((e) => e.sig.signals.action === 'sell').length
  return { buy, sell, hold: formal.length - buy - sell }
})

const dataSummary = computed(() => {
  const real = enriched.value.filter((e) => e.reliable).length
  const snapshot = enriched.value.filter((e) => e.dataMeta?.quality === DATA_QUALITY.MOCK).length
  const unavailable = enriched.value.filter((e) => e.dataMeta?.quality === DATA_QUALITY.UNAVAILABLE || !e.fund.nav).length
  const cached = enriched.value.filter((e) => e.dataMeta?.quality === DATA_QUALITY.CACHED).length
  return { real, snapshot, unavailable, cached }
})

// ---- 持仓汇总（用可用净值算盈亏；若使用快照会标注估算）----
const currentNav = (code) => {
  const e = enriched.value.find((x) => x.fund.code === code)
  return e?.fund?.nav || 0
}
const portfolio = computed(() => store.portfolioSummary(currentNav))
const portfolioUsesFallback = computed(() =>
  portfolio.value.items.some((item) => {
    const e = enriched.value.find((x) => x.fund.code === item.code)
    return e && !e.reliable
  })
)
// 实时估值（fundgz）
const estOf = (code) => store.getEstimate(code)
const estMetaOf = (code) => store.getEstimateMeta(code)

const anyLoading = computed(() =>
  enriched.value.some((e) => e.slot?.loading)
)
const updatedAt = computed(() =>
  enriched.value.map((e) => e.slot?.updatedAt).filter(Boolean).sort().pop()
)

const dataStatusText = computed(() => {
  if (anyLoading.value) return '净值加载中…'
  const { real, snapshot, unavailable, cached } = dataSummary.value
  if (real || cached) return `真实可用 ${real} 只 / 缓存 ${cached} 只 / 快照 ${snapshot} 只 / 不可用 ${unavailable} 只`
  return `${dataModeLabel()}：当前显示历史快照或不可用状态`
})

async function refreshAll() {
  await store.fetchAll(252, { force: true })
}
function removeWatch(code) {
  store.removeWatch(code)
}

const actionTag = {
  buy: { cls: 'buy', icon: '▲' },
  sell: { cls: 'sell', icon: '▼' },
  hold: { cls: 'hold', icon: '●' },
}

function actionText(e) {
  if (e.signalMode === 'sample') return '历史样例观察'
  return e.sig?.signals.actionText || '数据加载中'
}

function actionCls(e) {
  if (e.signalMode !== 'model') return 'hold'
  return actionTag[e.sig.signals.action].cls
}

function actionIcon(e) {
  if (e.signalMode !== 'model') return '○'
  return actionTag[e.sig.signals.action].icon
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
        <div class="lbl">持仓市值 <span v-if="portfolioUsesFallback" class="estimate-note">估算</span></div>
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
        <div class="lbl">模型偏多</div>
        <div class="val up num">{{ stats.buy }} <span class="dim">只</span></div>
      </div>
      <div class="sm">
        <div class="lbl">模型偏空</div>
        <div class="val down num">{{ stats.sell }} <span class="dim">只</span></div>
      </div>
      <div class="sm action">
        <button class="btn btn-primary" @click="addDialogOpen = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          添加自选
        </button>
      </div>
    </section>

    <div class="research-note panel">
      模型信号仅用于量化研究和价格提醒，不构成投资建议。历史快照数据只展示样例观察，不触发正式价格提醒。
    </div>

    <!-- 数据状态条 -->
    <div class="data-bar">
      <span class="data-status">
        <span v-if="anyLoading" class="loading-dot"></span>
        <span class="muted" :class="{ warn: !dataSummary.real && !anyLoading }">
          {{ dataStatusText }}
          <template v-if="updatedAt"> · 更新于 {{ updatedAt }}</template>
        </span>
      </span>
      <button class="btn btn-ghost btn-sm" :disabled="anyLoading" @click="refreshAll">
        <span :class="{ spinning: anyLoading }">↻</span> 刷新
      </button>
    </div>

    <!-- 基金卡片 -->
    <section v-if="enriched.length" class="grid">
      <RouterLink
        v-for="item in enriched"
        :key="item.fund.code"
        :to="`/funds/${item.fund.code}`"
        class="fund-card panel"
      >
        <!-- 头部：信号 + 名称 -->
        <div class="fc-head">
          <div class="fc-theme" :style="{ background: item.fund.themeColor + '22', color: item.fund.themeColor }">
            {{ item.fund.short.charAt(0) }}
          </div>
          <div class="fc-info">
            <div class="fc-name">
              {{ item.fund.short }}
              <span class="fc-code">{{ item.fund.code }}</span>
            </div>
            <div class="fc-sub">{{ item.fund.theme }} · {{ item.fund.type }}</div>
          </div>
          <span v-if="item.sig" class="action-badge" :class="[actionCls(item), item.signalMode === 'model' ? item.sig.signals.actionLevel : '']">
            {{ actionIcon(item) }} {{ actionText(item) }}
          </span>
          <span v-else class="action-badge hold">○ 数据加载中</span>
          <button class="fc-remove" title="取消自选" @click.prevent.stop="removeWatch(item.fund.code)">✕</button>
        </div>

        <div class="quality-line">
          <span class="q-tag" :class="qualityClass(item.dataMeta)" :title="item.dataMeta?.error || ''">{{ qualityLabel(item.dataMeta) }}</span>
          <span v-if="item.dataMeta?.asOf" class="q-asof">截至 {{ item.dataMeta.asOf }}</span>
        </div>

        <!-- 净值 -->
        <div class="fc-nav">
          <div class="nav-val num" :class="item.fund.changePct > 0 ? 'up' : 'down'">
            {{ item.fund.nav ? item.fund.nav.toFixed(4) : '—' }}
            <span class="nav-chg num" v-if="item.fund.change !== undefined">
              {{ sign(item.fund.change) }}{{ item.fund.change }} ({{ fmtPct(item.fund.changePct) }})
            </span>
          </div>
          <div class="nav-label">
            单位净值
            <span v-if="estOf(item.fund.code)" class="est-inline" :title="qualityLabel(estMetaOf(item.fund.code))">
              · 估值 <b class="num" :class="estOf(item.fund.code).gszzl > 0 ? 'up' : 'down'">{{ estOf(item.fund.code).gsz.toFixed(4) }} ({{ estOf(item.fund.code).gszzl > 0 ? '+' : '' }}{{ estOf(item.fund.code).gszzl }}%)</b>
            </span>
          </div>
        </div>

        <template v-if="item.sig">
        <!-- 关键指标网格 -->
        <div class="fc-metrics">
          <div class="m">
            <span class="ml">PE</span>
            <span class="mv num">{{ item.fund.pe || '—' }}</span>
            <span v-if="item.fund.pe" class="mp num" :class="item.fund.pePct5y <= 0.3 ? 'up' : item.fund.pePct5y >= 0.7 ? 'down' : ''">
              {{ (item.fund.pePct5y * 100).toFixed(0) }}%分位
            </span>
          </div>
          <div class="m">
            <span class="ml">最大回撤</span>
            <span class="mv num down">{{ (item.sig.drawdown.maxDD * 100).toFixed(1) }}%</span>
          </div>
          <div class="m">
            <span class="ml">RSI</span>
            <span class="mv num" :class="item.sig.indicators.rsi < 30 ? 'up' : item.sig.indicators.rsi > 70 ? 'down' : ''">
              {{ item.sig.indicators.rsi }}
            </span>
          </div>
          <div class="m">
            <span class="ml">修复度</span>
            <span class="mv num" :class="item.sig.drawdown.recoveryFromTrough > 0 ? 'up' : 'down'">
              {{ (item.sig.drawdown.recoveryFromTrough * 100).toFixed(1) }}%
            </span>
          </div>
        </div>

        <!-- 观察点位 -->
        <div class="fc-points">
          <div class="pt buy">
            <span class="pt-l">低位参考</span>
            <span class="pt-v num">{{ item.sig.signals.buyPoint }}</span>
            <span class="pt-g num">{{ (item.sig.signals.downsideToBuy * 100).toFixed(1) }}%</span>
          </div>
          <div class="pt sell">
            <span class="pt-l">高位参考</span>
            <span class="pt-v num">{{ item.sig.signals.sellPoint }}</span>
            <span class="pt-g num">+{{ (item.sig.signals.upsideToSell * 100).toFixed(1) }}%</span>
          </div>
        </div>

        <!-- 信号理由（取最强的2条）-->
        <div class="fc-reasons">
          <div
            v-for="r in item.sig.signals.reasons.filter(x => x.tone !== 'hold').slice(0, 2)"
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

.research-note {
  padding: $space-3 $space-5;
  font-size: 12px;
  color: $text-secondary;
  border-left: 3px solid $warning;
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
  .estimate-note { color: $warning; font-size: 10px; }
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
  margin-bottom: $space-3;
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

.quality-line {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-bottom: $space-3;
}
.q-tag {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 4px;
  background: $bg-panel-2;
  color: $text-tertiary;
  &.real { color: $success; background: rgba(34,197,94,0.12); }
  &.warn { color: $warning; background: rgba(245,183,61,0.12); }
  &.fallback { color: $text-tertiary; }
}
.q-asof { font-size: 10px; color: $text-tertiary; }

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
