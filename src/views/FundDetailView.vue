<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getFund, getNavSeries, getPESeries, computeSnapshot } from '@/mock/funds'
import { fundCatalog } from '@/mock/fundCatalog'
import { getFundHoldings, getFundSectorDist } from '@/mock/fundHoldings'
import { buildSignals, backtestSignals } from '@/mock/indicators'
import { fetchTencentQuotes } from '@/api/eastmoney'
import { useThemeStore } from '@/stores/theme'
import { useFundsStore } from '@/stores/funds'
import { useAlertsStore } from '@/stores/alerts'
import { chartTheme, fmtPct, fmtMoney, sign, round } from '@/mock/_helpers'
import EChart from '@/components/EChart.vue'

const route = useRoute()
const router = useRouter()
const theme = useThemeStore()
const fundsStore = useFundsStore()
const alertsStore = useAlertsStore()
const alertAdded = ref(false)
const ct = () => (void theme.theme, chartTheme())

// 解析元信息（核心基金有完整字段，catalog 基金基础信息）
function resolveMeta(code) {
  const core = getFund(code)
  if (core) return core
  const c = fundCatalog.find((f) => f.code === code)
  if (c) {
    return {
      code: c.code, name: c.name, short: c.short, type: c.type, theme: c.theme,
      themeColor: '#64748b', manager: '—', risk: '—',
      pe: 0, pePct5y: 0.5, aum: 0, dividend: '0', fee: '—',
    }
  }
  return { code, name: code, short: code, type: '', theme: '', themeColor: '#64748b', pe: 0, pePct5y: 0.5 }
}

const fundMeta = computed(() => resolveMeta(route.params.code))

// 优先真实净值，回退 mock
const navs = computed(() => {
  const real = fundsStore.navSeries(fundMeta.value.code)
  return real.length ? real : getNavSeries(fundMeta.value.code)
})
const fund = computed(() => {
  const f = { ...fundMeta.value }
  const snap = computeSnapshot(navs.value)
  if (snap) Object.assign(f, snap)
  return f
})
const peSeries = computed(() => getPESeries(fundMeta.value.code))
const sig = computed(() => navs.value.length >= 2 ? buildSignals(fund.value, navs.value) : null)

const slot = computed(() => fundsStore.byCode[route.params.code])

// ---- 我的持仓 ----
const myPosition = computed(() => fundsStore.getPosition(route.params.code))
const posEdit = ref({ shares: '', costPrice: '' })
const showPosEdit = ref(false)
function startEdit() {
  posEdit.value = {
    shares: myPosition.value?.shares ?? '',
    costPrice: myPosition.value?.costPrice ?? '',
  }
  showPosEdit.value = true
}
function savePosition() {
  fundsStore.setPosition(route.params.code, posEdit.value.shares, posEdit.value.costPrice)
  showPosEdit.value = false
}
function clearPosition() {
  fundsStore.clearPosition(route.params.code)
  showPosEdit.value = false
}
// 持仓盈亏（用当前真实净值）
const posCalc = computed(() => {
  const p = myPosition.value
  if (!p || !p.shares) return null
  const nav = fund.value.nav || 0
  const mv = p.shares * nav
  const cv = p.shares * p.costPrice
  return {
    marketValue: mv,
    costValue: cv,
    profit: mv - cv,
    profitPct: cv ? (mv - cv) / cv : 0,
    curNav: nav,
    shares: p.shares,
    costPrice: p.costPrice,
  }
})

// ---- 基金重仓股 ----
// 重仓股：真实数据优先，回退 mock
const holdings = computed(() => {
  const real = fundsStore.getHoldings(route.params.code)
  return real.length ? real : getFundHoldings(route.params.code)
})
const sectorDist = computed(() => {
  const map = {}
  holdings.value.forEach((h) => { map[h.sector] = (map[h.sector] || 0) + h.weight })
  return Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(1) })).sort((a, b) => b.value - a.value)
})
const holdingsSlot = computed(() => fundsStore.holdingsCache[route.params.code])
const isWatched = computed(() => fundsStore.isWatched(route.params.code))

// 重仓股实时涨跌（腾讯行情）
const holdingQuotes = ref({})
async function fetchHoldingQuotes() {
  const codes = holdings.value.map((h) => h.code).filter(Boolean)
  if (!codes.length) return
  try {
    holdingQuotes.value = await fetchTencentQuotes(codes)
  } catch (e) {
    // 静默降级，用 holdings 里的 mock changePct
  }
}
// 实时估值
const estimate = computed(() => fundsStore.getEstimate(route.params.code))
// QDII 等：估值≈昨收净值（非真正盘中），标注区分
const isQdiiEstimate = computed(() => {
  if (!estimate.value || !fund.value.nav) return false
  return Math.abs(estimate.value.gsz - fund.value.nav) / fund.value.nav < 0.0005
})
// 真实档案（覆盖配置值）
const profile = computed(() => fundsStore.getProfile(route.params.code))
const fundDisplay = computed(() => {
  const f = { ...fund.value }
  const p = profile.value
  if (p) {
    if (p.type) f.type = p.type
    if (p.scale != null) f.aum = p.scale
    if (p.company) f.company = p.company
    if (p.manager) f.realManager = p.manager
    if (p.fee) f.fee = p.fee
  }
  return f
})

onMounted(() => {
  fundsStore.fetchOne(route.params.code, 252)
  fundsStore.fetchHoldings(route.params.code).then(fetchHoldingQuotes)
  fundsStore.fetchEstimate(route.params.code)
  fundsStore.fetchProfile(route.params.code)
})
watch(() => route.params.code, (c) => {
  if (c) {
    fundsStore.fetchOne(c, 252)
    fundsStore.fetchHoldings(c).then(fetchHoldingQuotes)
    fundsStore.fetchEstimate(c)
    fundsStore.fetchProfile(c)
  }
})
// 重仓股数据到了之后补拉行情
watch(holdings, (h) => { if (h.length && !Object.keys(holdingQuotes.value).length) fetchHoldingQuotes() })

async function refresh() {
  await fundsStore.refresh(route.params.code, 252)
}
function toggleWatch() {
  fundsStore.toggleWatch(route.params.code)
}

// 把买卖点加入预警（4条：买入价/卖出价/止损/止盈）
function addToAlerts() {
  if (alertAdded.value || !sig.value) return
  const code = route.params.code
  const name = fund.value.short || fund.value.name
  const pts = sig.value.signals
  const mk = (label, target, op) => ({
    name: `${name} ${label}`,
    symbol: code,
    symbolName: name,
    type: 'price',
    op,
    target,
    current: pts.currentPrice,
    enabled: true,
    channels: ['app'],
    source: 'fund-signal',
  })
  alertsStore.addRule(mk('触及买入价', pts.buyPoint, '<='))
  alertsStore.addRule(mk('触及卖出价', pts.sellPoint, '>='))
  alertsStore.addRule(mk('跌破止损', pts.stopLoss, '<='))
  alertsStore.addRule(mk('突破止盈', pts.takeProfit, '>='))
  alertAdded.value = true
}
watch(() => route.params.code, () => { alertAdded.value = false })

// 重仓股今日涨跌：真实腾讯行情优先，否则用 holdings 的 mock 值
function realChgPct(h) {
  const q = holdingQuotes.value[h.code]
  if (q && q.changePct !== undefined && q.changePct !== null) return q.changePct
  return h.changePct || 0
}
function fmtHoldChg(h) {
  const v = realChgPct(h)
  if (!v && v !== 0) return '—'
  return (v > 0 ? '+' : '') + (v * 100).toFixed(2) + '%'
}

const actionTag = {
  buy: { cls: 'buy', icon: '▲' },
  sell: { cls: 'sell', icon: '▼' },
  hold: { cls: 'hold', icon: '●' },
}

// 历史买卖点（金叉死叉）
const btSignals = computed(() => {
  const s = sig.value?.series
  if (!s) return { buys: [], sells: [] }
  return backtestSignals(navs.value, s.ma5, s.ma10)
})

// ---- 净值 + 均线 + 买卖点标注 ----
const navOption = computed(() => {
  const t = ct()
  const data = navs.value
  const s = sig.value?.series
  const { buys, sells } = btSignals.value
  const fundColor = fund.value.themeColor || '#3b82f6'
  return {
    legend: { top: 0, right: 10, textStyle: { color: t.secondary }, icon: 'roundRect', itemWidth: 14, itemHeight: 3, data: ['净值', 'MA5', 'MA10', 'MA20'] },
    grid: { left: 16, right: 50, top: 36, bottom: 28, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: data.map((d) => d.date), axisLine: { lineStyle: { color: t.axis } }, axisLabel: { color: t.label, fontSize: 11 }, axisTick: { show: false } },
    yAxis: { type: 'value', scale: true, axisLabel: { color: t.label, fontSize: 11, formatter: (v) => v.toFixed(3) }, splitLine: { lineStyle: { color: t.split } } },
    tooltip: { trigger: 'axis' },
    dataZoom: [{ type: 'inside', start: 55 }],
    series: [
      {
        name: '净值', type: 'line', data: data.map((d) => d.nav), smooth: true, symbol: 'none',
        lineStyle: { width: 2.2, color: fundColor },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: fundColor + '40' }, { offset: 1, color: fundColor + '00' }] } },
        markPoint: {
          symbol: 'pin', symbolSize: 38,
          itemStyle: { color: '#ef4444' },
          label: { color: '#fff', fontSize: 11, formatter: '买' },
          data: buys.slice(-4).map((b) => ({ coord: b.coord })),
        },
      },
      { name: 'MA5', type: 'line', data: s?.ma5 || [], smooth: true, symbol: 'none', lineStyle: { width: 1.2, color: '#f5b73d' } },
      { name: 'MA10', type: 'line', data: s?.ma10 || [], smooth: true, symbol: 'none', lineStyle: { width: 1.2, color: '#a855f7' } },
      { name: 'MA20', type: 'line', data: s?.ma20 || [], smooth: true, symbol: 'none', lineStyle: { width: 1.2, color: '#3b82f6' } },
    ],
  }
})

// 给净值图加卖出点（单独 series，用 markPoint 形式追加到净值 series 不便，这里用 scatter 叠加）
// 改用：在 navOption 的净值 series 上无法放两个 markPoint 颜色，故卖出点用独立 scatter
const navOptionWithSells = computed(() => {
  const opt = navOption.value
  const { sells } = btSignals.value
  opt.series.push({
    name: '卖出点', type: 'scatter', data: sells.slice(-4).map((s) => ({ value: [s.coord[0], s.coord[1]] })),
    symbol: 'pin', symbolSize: 38,
    itemStyle: { color: '#22c55e' },
    label: { show: true, color: '#fff', fontSize: 11, formatter: '卖', position: 'inside' },
    z: 10,
  })
  return opt
})

// ---- RSI 子图 ----
const rsiOption = computed(() => {
  const t = ct()
  const s = sig.value?.series
  const data = navs.value
  return {
    grid: { left: 16, right: 50, top: 16, bottom: 24, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: data.map((d) => d.date), axisLine: { lineStyle: { color: t.axis } }, axisLabel: { color: t.label, fontSize: 11 }, axisTick: { show: false } },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { color: t.label, fontSize: 11 }, splitLine: { lineStyle: { color: t.split } } },
    tooltip: { trigger: 'axis' },
    series: [{
      type: 'line', data: s?.rsi || [], smooth: true, symbol: 'none',
      lineStyle: { width: 1.6, color: '#a855f7' },
      markArea: {
        silent: true,
        itemStyle: { color: 'rgba(239,68,68,0.06)' },
        data: [[{ yAxis: 70 }, { yAxis: 100 }]],
      },
      markLine: {
        silent: true, symbol: 'none',
        lineStyle: { color: t.axis, type: 'dashed' },
        data: [
          { yAxis: 70, label: { formatter: '超买 70', color: t.tertiary, fontSize: 10, position: 'insideEndTop' } },
          { yAxis: 30, label: { formatter: '超卖 30', color: t.tertiary, fontSize: 10, position: 'insideEndTop' } },
        ],
      },
    }],
  }
})

// ---- 回撤 + 修复曲线 ----
const drawdownOption = computed(() => {
  const t = ct()
  const data = navs.value
  const values = data.map((d) => d.nav)
  // 逐点回撤
  let peak = values[0]
  const ddSeries = values.map((v) => {
    peak = Math.max(peak, v)
    return round((v - peak) / peak, 4)
  })
  const mdd = sig.value?.drawdown || { troughIdx: data.length - 1, maxDD: 0 }
  return {
    grid: { left: 16, right: 50, top: 20, bottom: 24, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: data.map((d) => d.date), axisLine: { lineStyle: { color: t.axis } }, axisLabel: { color: t.label, fontSize: 11 }, axisTick: { show: false } },
    yAxis: { type: 'value', max: 0, axisLabel: { color: t.label, fontSize: 11, formatter: (v) => (v * 100).toFixed(0) + '%' }, splitLine: { lineStyle: { color: t.split } } },
    tooltip: { trigger: 'axis', formatter: (p) => `${p[0].axisValue}<br/>回撤：<b style="color:#ef4444">${(p[0].value * 100).toFixed(2)}%</b>` },
    series: [{
      type: 'line', data: ddSeries, symbol: 'none',
      lineStyle: { width: 1.5, color: '#ef4444' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(239,68,68,0.05)' },
            { offset: 1, color: 'rgba(239,68,68,0.25)' },
          ],
        },
      },
      markPoint: {
        symbol: 'circle', symbolSize: 10,
        data: [
          { coord: [data[mdd.troughIdx].date, ddSeries[mdd.troughIdx]], itemStyle: { color: '#ef4444' }, label: { formatter: '最低点', position: 'top', color: t.secondary, fontSize: 10 } },
        ],
      },
    }],
  }
})

// ---- PE 分位条 ----
const peBucket = computed(() => {
  const pct = fund.value.pePct5y
  let level = '合理'
  if (pct <= 0.3) level = '低估'
  else if (pct >= 0.7) level = '高估'
  return { pct: Math.round(pct * 100), level }
})

// ---- MACD 副图 ----
const macdOption = computed(() => {
  const t = ct()
  const s = sig.value?.series
  const data = navs.value
  if (!s) return {}
  return {
    legend: { top: 0, right: 10, textStyle: { color: t.secondary }, icon: 'roundRect', itemWidth: 12, itemHeight: 3, data: ['DIF', 'DEA', 'MACD柱'] },
    grid: { left: 16, right: 50, top: 36, bottom: 24, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: data.map((d) => d.date), axisLine: { lineStyle: { color: t.axis } }, axisLabel: { color: t.label, fontSize: 11 }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { color: t.label, fontSize: 11, formatter: (v) => v.toFixed(3) }, splitLine: { lineStyle: { color: t.split } } },
    tooltip: { trigger: 'axis' },
    dataZoom: [{ type: 'inside' }],
    series: [
      { name: 'DIF', type: 'line', data: s.macdDif, smooth: true, symbol: 'none', lineStyle: { width: 1.4, color: '#fff' } },
      { name: 'DEA', type: 'line', data: s.macdDea, smooth: true, symbol: 'none', lineStyle: { width: 1.4, color: '#f5b73d' } },
      {
        name: 'MACD柱', type: 'bar', data: s.macdHist.map((v) => ({
          value: v,
          itemStyle: { color: v >= 0 ? '#ef4444' : '#22c55e' },
        })),
        barWidth: '60%',
      },
    ],
  }
})

const reasonsByTone = computed(() => {
  const buy = sig.value.signals.reasons.filter((r) => r.tone === 'buy')
  const sell = sig.value.signals.reasons.filter((r) => r.tone === 'sell')
  const hold = sig.value.signals.reasons.filter((r) => r.tone === 'hold')
  return { buy, sell, hold }
})
</script>

<template>
  <div class="fund-detail" v-if="fund">
    <div class="detail-bar">
      <button class="btn btn-ghost btn-sm back-btn" @click="router.push('/funds')">‹ 返回基金列表</button>
      <div class="detail-status">
        <span v-if="slot?.loading" class="muted"><span class="spin-dot"></span> 加载真实净值…</span>
        <span v-else-if="slot?.updatedAt" class="muted">✓ 真实数据 · {{ slot.updatedAt }}</span>
        <span v-else-if="slot?.error" class="warn">⚠ {{ slot.error }}，显示历史快照</span>
        <button class="btn btn-ghost btn-sm" :disabled="slot?.loading" @click="refresh">
          <span :class="{ spinning: slot?.loading }">↻</span> 刷新
        </button>
      </div>
    </div>

    <!-- 头部 -->
    <section class="panel head-panel">
      <div class="h-left">
        <div class="h-theme" :style="{ background: fund.themeColor + '22', color: fund.themeColor }">{{ fund.short.charAt(0) }}</div>
        <div>
          <h1>{{ fund.name }}
            <span class="h-code">{{ fund.code }}</span>
          </h1>
          <div class="h-sub">
            <span class="tag">{{ fund.theme }}</span>
            <span class="tag">{{ fundDisplay.type }}</span>
            <span class="tag">风险{{ fund.risk }}</span>
            <span class="tag">{{ fundDisplay.realManager || fundDisplay.manager }}</span>
            <span v-if="fundDisplay.aum" class="tag">规模 {{ fundDisplay.aum }}亿</span>
            <button class="watch-btn" :class="{ watched: isWatched }" @click="toggleWatch">
              {{ isWatched ? '★ 已自选' : '☆ 加自选' }}
            </button>
          </div>
        </div>
      </div>
      <div class="h-right">
        <div class="h-nav num" :class="fund.changePct > 0 ? 'up' : 'down'">
          {{ fund.nav ? fund.nav.toFixed(4) : '—' }}
          <span class="num" v-if="fund.change !== undefined">{{ sign(fund.change) }}{{ fund.change }} ({{ fmtPct(fund.changePct) }})</span>
        </div>
        <div class="h-nav-label">单位净值 · {{ fund.latestDate || '今日' }}</div>
        <!-- 实时估值（QDII 为收盘估值，与净值相同时区分标注） -->
        <div v-if="estimate" class="h-estimate">
          <span class="est-tag" :class="{ qdii: isQdiiEstimate }">
            {{ isQdiiEstimate ? '收盘估值' : '实时估值' }}
          </span>
          <span class="num est-val" :class="estimate.gszzl > 0 ? 'up' : 'down'">
            {{ estimate.gsz.toFixed(4) }} ({{ estimate.gszzl > 0 ? '+' : '' }}{{ estimate.gszzl }}%)
          </span>
        </div>
      </div>
    </section>

    <!-- 我的持仓 -->
    <section class="panel my-position">
      <div class="panel-title">
        <h3>💼 我的持仓</h3>
        <button v-if="!showPosEdit" class="btn btn-ghost btn-sm" @click="startEdit">
          {{ myPosition ? '编辑' : '+ 录入持仓' }}
        </button>
      </div>
      <!-- 持仓展示 -->
      <div v-if="posCalc && !showPosEdit" class="pos-grid">
        <div class="pos-item">
          <div class="pos-k">持仓份额</div>
          <div class="pos-v num">{{ posCalc.shares.toLocaleString() }}</div>
        </div>
        <div class="pos-item">
          <div class="pos-k">成本净值</div>
          <div class="pos-v num">{{ posCalc.costPrice.toFixed(4) }}</div>
        </div>
        <div class="pos-item">
          <div class="pos-k">当前净值</div>
          <div class="pos-v num brand">{{ posCalc.curNav.toFixed(4) }}</div>
        </div>
        <div class="pos-item">
          <div class="pos-k">持仓市值</div>
          <div class="pos-v num gold">{{ fmtMoney(posCalc.marketValue).replace('¥', '¥ ') }}</div>
        </div>
        <div class="pos-item">
          <div class="pos-k">累计盈亏</div>
          <div class="pos-v num" :class="posCalc.profit > 0 ? 'up' : 'down'">
            {{ sign(posCalc.profit) }}{{ fmtMoney(posCalc.profit).replace('¥', '¥ ') }}
            <div class="pos-pct">({{ fmtPct(posCalc.profitPct) }})</div>
          </div>
        </div>
        <div class="pos-item">
          <div class="pos-k">收益率</div>
          <div class="pos-v num" :class="posCalc.profit > 0 ? 'up' : 'down'">{{ fmtPct(posCalc.profitPct) }}</div>
        </div>
      </div>
      <!-- 编辑表单 -->
      <div v-if="showPosEdit" class="pos-edit">
        <div class="pe-field">
          <label>持仓份额</label>
          <input v-model="posEdit.shares" type="number" placeholder="如 50000" />
        </div>
        <div class="pe-field">
          <label>成本净值</label>
          <input v-model="posEdit.costPrice" type="number" step="0.0001" placeholder="如 1.52" />
        </div>
        <div class="pe-actions">
          <button class="btn btn-ghost btn-sm" @click="showPosEdit = false">取消</button>
          <button v-if="myPosition" class="btn btn-ghost btn-sm" @click="clearPosition">清空持仓</button>
          <button class="btn btn-primary btn-sm" @click="savePosition">保存</button>
        </div>
      </div>
      <!-- 未持仓 -->
      <div v-if="!posCalc && !showPosEdit" class="pos-empty muted">
        尚未录入该基金持仓，点击「+ 录入持仓」记录你的份额与成本
      </div>
    </section>

    <!-- 信号结论卡 -->
    <section v-if="sig" class="signal-card panel" :class="sig.signals.action">
      <div class="sc-main">
        <div class="sc-action">
          <span class="sc-icon">{{ actionTag[sig.signals.action].icon }}</span>
          <div>
            <div class="sc-text" :class="sig.signals.action">{{ sig.signals.actionText }}</div>
            <div class="sc-score dim">
              综合评分 {{ sig.signals.score > 0 ? '+' : '' }}{{ sig.signals.score }}
              · 盈亏比 {{ sig.signals.rewardRisk }}:1
            </div>
          </div>
          <button class="sc-alert-btn" :class="{ added: alertAdded }" @click="addToAlerts">
            {{ alertAdded ? '✓ 已加入预警' : '🔔 加入预警' }}
          </button>
        </div>
        <!-- 关键价位速览 -->
        <div class="sc-points">
          <div class="scp buy">
            <div class="scp-l">买入参考</div>
            <div class="scp-v num">{{ sig.signals.buyPoint }}</div>
            <div class="scp-g num">{{ (sig.signals.downsideToBuy * 100).toFixed(1) }}%</div>
          </div>
          <div class="scp sell">
            <div class="scp-l">卖出参考</div>
            <div class="scp-v num">{{ sig.signals.sellPoint }}</div>
            <div class="scp-g num">+{{ (sig.signals.upsideToSell * 100).toFixed(1) }}%</div>
          </div>
          <div class="scp stop">
            <div class="scp-l">ATR止损</div>
            <div class="scp-v num down">{{ sig.signals.stopLoss }}</div>
            <div class="scp-g num">{{ ((sig.signals.stopLoss - sig.signals.currentPrice) / sig.signals.currentPrice * 100).toFixed(1) }}%</div>
          </div>
          <div class="scp target">
            <div class="scp-l">ATR止盈</div>
            <div class="scp-v num up">{{ sig.signals.takeProfit }}</div>
            <div class="scp-g num">+{{ ((sig.signals.takeProfit - sig.signals.currentPrice) / sig.signals.currentPrice * 100).toFixed(1) }}%</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 分批建仓计划 -->
    <section v-if="sig" class="panel">
      <div class="panel-title">
        <h3>🎯 分批建仓计划</h3>
        <span class="sub">基于 ATR={{ sig.indicators.atr }} 动态计算 · 适配波动率</span>
      </div>
      <div class="ladder-grid">
        <!-- 买入阶梯 -->
        <div class="ladder-col">
          <div class="ladder-head up">▲ 买入三档</div>
          <div v-for="(lv, i) in sig.signals.buyLevels" :key="'b'+i" class="ladder-row buy">
            <span class="lr-label">{{ lv.label }}</span>
            <span class="lr-price num">{{ lv.price }}</span>
            <span class="lr-gap num">{{ ((lv.price - sig.signals.currentPrice) / sig.signals.currentPrice * 100).toFixed(1) }}%</span>
          </div>
          <div class="ladder-row buy stop">
            <span class="lr-label">🛑 止损</span>
            <span class="lr-price num down">{{ sig.signals.stopLoss }}</span>
            <span class="lr-gap num">{{ ((sig.signals.stopLoss - sig.signals.currentPrice) / sig.signals.currentPrice * 100).toFixed(1) }}%</span>
          </div>
        </div>
        <!-- 卖出阶梯 -->
        <div class="ladder-col">
          <div class="ladder-head down">▼ 卖出三档</div>
          <div v-for="(lv, i) in sig.signals.sellLevels" :key="'s'+i" class="ladder-row sell">
            <span class="lr-label">{{ lv.label }}</span>
            <span class="lr-price num">{{ lv.price }}</span>
            <span class="lr-gap num">+{{ ((lv.price - sig.signals.currentPrice) / sig.signals.currentPrice * 100).toFixed(1) }}%</span>
          </div>
          <div class="ladder-row sell target">
            <span class="lr-label">🎯 止盈</span>
            <span class="lr-price num up">{{ sig.signals.takeProfit }}</span>
            <span class="lr-gap num">+{{ ((sig.signals.takeProfit - sig.signals.currentPrice) / sig.signals.currentPrice * 100).toFixed(1) }}%</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 净值 + 买卖点 -->
    <section class="panel">
      <div class="panel-title">
        <h3>净值走势 + 买卖信号点</h3>
        <div class="legend-hint">
          <span><i class="dot buy"></i> 买入点(金叉)</span>
          <span><i class="dot sell"></i> 卖出点(死叉)</span>
        </div>
      </div>
      <EChart :option="navOptionWithSells" height="380px" />
    </section>

    <div class="row">
      <!-- RSI -->
      <div class="panel">
        <div class="panel-title"><h3>RSI 相对强弱</h3><span class="sub">14日</span></div>
        <EChart :option="rsiOption" height="240px" />
      </div>
      <!-- 回撤修复 -->
      <div class="panel">
        <div class="panel-title">
          <h3>回撤与修复</h3>
          <span class="sub">最大回撤 {{ (sig.drawdown.maxDD * 100).toFixed(1) }}% · 修复 {{ (sig.drawdown.recoveryFromTrough * 100).toFixed(1) }}%</span>
        </div>
        <EChart :option="drawdownOption" height="240px" />
      </div>
    </div>

    <!-- MACD 副图 -->
    <section v-if="sig" class="panel">
      <div class="panel-title">
        <h3>MACD 动量指标</h3>
        <span class="sub">
          DIF {{ sig.indicators.macd.dif.toFixed(4) }} · DEA {{ sig.indicators.macd.dea.toFixed(4) }}
          · {{ sig.indicators.macd.hist >= 0 ? '红柱(多头)' : '绿柱(空头)' }}
        </span>
      </div>
      <EChart :option="macdOption" height="280px" />
    </section>

    <div class="row">
      <!-- 估值 PE -->
      <div class="panel pe-panel">
        <div class="panel-title"><h3>估值水平</h3><span class="sub">PE 分位</span></div>
        <div class="pe-body">
          <div class="pe-top">
            <div class="pe-stat">
              <div class="pe-k">当前 PE (TTM)</div>
              <div class="pe-v num">{{ fund.pe }}</div>
            </div>
            <div class="pe-stat">
              <div class="pe-k">近5年分位</div>
              <div class="pe-v num" :class="peBucket.pct <= 30 ? 'up' : peBucket.pct >= 70 ? 'down' : ''">{{ peBucket.pct }}%</div>
            </div>
            <div class="pe-stat">
              <div class="pe-k">估值评级</div>
              <div class="pe-v pe-level" :class="peBucket.level">{{ peBucket.level }}</div>
            </div>
          </div>
          <!-- 分位条 -->
          <div class="pe-bar">
            <div class="pe-zones">
              <div class="zone low"></div>
              <div class="zone mid"></div>
              <div class="zone high"></div>
            </div>
            <div class="pe-marker" :style="{ left: peBucket.pct + '%' }">
              <div class="marker-line"></div>
              <div class="marker-val num">{{ peBucket.pct }}%</div>
            </div>
            <div class="pe-labels">
              <span>0%</span><span>低估</span><span>合理</span><span>高估</span><span>100%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 信号理由 -->
      <div class="panel reasons-panel">
        <div class="panel-title"><h3>信号分析依据</h3></div>
        <div class="reasons-body">
          <div class="reason-group">
            <div class="rg-head up">▲ 买入理由 ({{ reasonsByTone.buy.length }})</div>
            <div v-for="r in reasonsByTone.buy" :key="r.tag" class="reason-item buy">
              <span class="r-tag">{{ r.tag }}</span>
              <span class="r-text">{{ r.text }}</span>
            </div>
            <div v-if="!reasonsByTone.buy.length" class="empty-r">暂无买入信号</div>
          </div>
          <div class="reason-group">
            <div class="rg-head down">▼ 卖出理由 ({{ reasonsByTone.sell.length }})</div>
            <div v-for="r in reasonsByTone.sell" :key="r.tag" class="reason-item sell">
              <span class="r-tag">{{ r.tag }}</span>
              <span class="r-text">{{ r.text }}</span>
            </div>
            <div v-if="!reasonsByTone.sell.length" class="empty-r">暂无卖出信号</div>
          </div>
          <div class="reason-group">
            <div class="rg-head muted">● 中性观察 ({{ reasonsByTone.hold.length }})</div>
            <div v-for="r in reasonsByTone.hold" :key="r.tag" class="reason-item hold">
              <span class="r-tag">{{ r.tag }}</span>
              <span class="r-text">{{ r.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 重仓股明细 -->
    <section v-if="holdings.length" class="panel">
      <div class="panel-title">
        <h3>📋 重仓股明细</h3>
        <span class="sub">前十大 · 季报数据</span>
      </div>
      <div class="holdings-wrap">
        <table class="holdings-table">
          <thead>
            <tr>
              <th class="c">#</th>
              <th>股票</th>
              <th class="r">占净值</th>
              <th>行业</th>
              <th class="r">今日</th>
              <th class="r">权重条</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(h, i) in holdings" :key="h.code">
              <td class="c dim num">{{ i + 1 }}</td>
              <td>
                <div class="h-stock">
                  <span class="h-name">{{ h.name }}</span>
                  <span class="h-code num">{{ h.code }}</span>
                </div>
              </td>
              <td class="r num"><b>{{ h.weight.toFixed(1) }}%</b></td>
              <td><span class="sector-chip">{{ h.sector }}</span></td>
              <td class="r num" :class="realChgPct(h) > 0 ? 'up' : realChgPct(h) < 0 ? 'down' : ''">
                {{ fmtHoldChg(h) }}
              </td>
              <td class="r">
                <div class="h-bar-wrap">
                  <div class="h-bar" :style="{ width: (h.weight / holdings[0].weight * 100) + '%' }"></div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <!-- 行业分布 -->
        <div class="sector-dist">
          <div class="sd-title muted">行业集中度</div>
          <div class="sd-bars">
            <div v-for="s in sectorDist" :key="s.name" class="sd-row">
              <span class="sd-name">{{ s.name }}</span>
              <div class="sd-track"><div class="sd-fill" :style="{ width: (s.value / sectorDist[0].value * 100) + '%' }"></div></div>
              <span class="sd-val num">{{ s.value }}%</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 基础信息 -->
    <section class="panel">
      <div class="panel-title"><h3>基金档案</h3></div>
      <div class="archive">
        <div class="ar"><span>基金全称</span><b>{{ fund.name }}</b></div>
        <div class="ar"><span>基金代码</span><b class="num">{{ fund.code }}</b></div>
        <div class="ar"><span>基金类型</span><b>{{ fundDisplay.type }}</b></div>
        <div class="ar"><span>主题赛道</span><b>{{ fund.theme }}</b></div>
        <div class="ar"><span>基金公司</span><b>{{ fundDisplay.company || fundDisplay.manager }}</b></div>
        <div class="ar"><span>基金经理</span><b>{{ fundDisplay.realManager || '—' }}</b></div>
        <div class="ar"><span>风险等级</span><b>{{ fund.risk }}</b></div>
        <div class="ar"><span>基金规模</span><b class="num">{{ fundDisplay.aum }} 亿</b></div>
        <div class="ar"><span>管理费率</span><b class="num">{{ fundDisplay.fee }}</b></div>
        <div class="ar"><span>每份分红</span><b class="num">{{ fund.dividend }}</b></div>
        <div class="ar"><span>52周最高</span><b class="num up">{{ fund.high52w }}</b></div>
        <div class="ar"><span>52周最低</span><b class="num down">{{ fund.low52w }}</b></div>
        <div class="ar"><span>近1月收益</span><b class="num" :class="fund.return1M > 0 ? 'up' : 'down'">{{ fmtPct(fund.return1M) }}</b></div>
        <div class="ar"><span>近3月收益</span><b class="num" :class="fund.return3M > 0 ? 'up' : 'down'">{{ fmtPct(fund.return3M) }}</b></div>
        <div class="ar"><span>今年以来</span><b class="num" :class="fund.returnYTD > 0 ? 'up' : 'down'">{{ fmtPct(fund.returnYTD) }}</b></div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.fund-detail {
  display: flex;
  flex-direction: column;
  gap: $space-5;
}
.detail-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
}
.back-btn { align-self: flex-start; }
.detail-status {
  display: flex;
  align-items: center;
  gap: $space-3;
  font-size: 12px;
  .muted { color: $text-tertiary; }
  .warn { color: $warning; }
}
.spin-dot {
  display: inline-block;
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

.head-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-5 $space-6;
  gap: $space-6;
  flex-wrap: wrap;
}
.h-left { display: flex; gap: $space-4; align-items: center; }
.h-theme {
  width: 52px; height: 52px;
  border-radius: $radius-md;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 700;
}
.h-left h1 {
  font-size: 19px; font-weight: 600;
  display: flex; align-items: center; gap: $space-2;
  .h-code { font-size: 12px; padding: 2px 7px; border-radius: 4px; background: $bg-panel-2; color: $text-tertiary; font-weight: 400; font-family: 'JetBrains Mono', monospace; }
}
.h-sub { display: flex; gap: $space-2; flex-wrap: wrap; margin-top: $space-2; .tag { font-size: 11px; padding: 3px 8px; border-radius: 4px; background: $bg-panel-2; color: $text-secondary; } }
.h-right { text-align: right; }
.h-nav { font-size: 28px; font-weight: 700; span { font-size: 13px; font-weight: 500; } }
.h-nav-label { font-size: 11px; color: $text-tertiary; margin-top: 2px; }
.h-estimate {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-top: $space-2;
  justify-content: flex-end;
  .est-tag {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    background: $brand-soft;
    color: $brand;
    &.qdii {
      background: rgba(148,163,184,0.15);
      color: $text-secondary;
    }
  }
  .est-val { font-size: 13px; font-weight: 600; }
}

/* 信号结论卡 */
.signal-card {
  display: flex;
  align-items: center;
  gap: $space-6;
  padding: $space-5 $space-6;
  border-left: 4px solid;
  &.buy { border-left-color: $up; background: linear-gradient(90deg, rgba(239,68,68,0.06), transparent 60%); }
  &.sell { border-left-color: $down; background: linear-gradient(90deg, rgba(34,197,94,0.06), transparent 60%); }
  &.hold { border-left-color: $text-tertiary; }
}
.sc-main { display: flex; align-items: center; gap: $space-6; width: 100%; flex-wrap: wrap; }
.sc-action { display: flex; align-items: center; gap: $space-3; flex-shrink: 0; }
.sc-alert-btn {
  margin-left: $space-3;
  padding: 6px 14px;
  border-radius: $radius-md;
  font-size: 12px;
  font-weight: 500;
  background: $brand;
  color: #fff;
  white-space: nowrap;
  transition: $transition-fast;
  &:hover { background: $brand-hover; }
  &.added { background: rgba(34,197,94,0.15); color: $success; border: 1px solid rgba(34,197,94,0.3); }
}
.sc-icon { font-size: 32px; }
.sc-text { font-size: 22px; font-weight: 700; &.buy { color: $up; } &.sell { color: $down; } &.hold { color: $text-secondary; } }
.sc-score { font-size: 12px; margin-top: 2px; }
.sc-points { display: grid; grid-template-columns: repeat(4, 1fr); gap: $space-4; flex: 1; min-width: 320px; }
.scp { padding: $space-3 $space-4; background: $bg-panel-2; border-radius: $radius-md; }
.scp-l { font-size: 11px; color: $text-tertiary; }
.scp-v { font-size: 18px; font-weight: 700; margin-top: 2px; }
.scp-g { font-size: 11px; margin-top: 2px; }
.scp.buy .scp-v, .scp.buy .scp-g { color: $up; }
.scp.sell .scp-v, .scp.sell .scp-g { color: $down; }

/* 分批建仓计划 */
.ladder-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: $border-subtle;
  padding: 1px;
}
.ladder-col { background: $bg-panel; padding: $space-4 $space-5; }
.ladder-head { font-size: 13px; font-weight: 600; margin-bottom: $space-3; padding-bottom: $space-2; border-bottom: 1px solid $border-subtle;
  &.up { color: $up; } &.down { color: $down; }
}
.ladder-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: $space-3;
  padding: $space-2 0;
  align-items: center;
  font-size: 13px;
  .lr-label { color: $text-secondary; }
  .lr-price { font-weight: 600; min-width: 60px; text-align: right; }
  .lr-gap { font-size: 11px; min-width: 50px; text-align: right; color: $text-tertiary; }
  &.buy .lr-price { color: $up; }
  &.sell .lr-price { color: $down; }
  &.stop .lr-label, &.target .lr-label { font-weight: 500; }
  &.stop .lr-price { color: $down; }
  &.target .lr-price { color: $up; }
}

.legend-hint {
  display: flex;
  gap: $space-4;
  font-size: 11px;
  color: $text-tertiary;
  span { display: flex; align-items: center; gap: 4px; }
  .dot { width: 8px; height: 8px; border-radius: 2px; &.buy { background: $up; } &.sell { background: $down; } }
}

.row { display: grid; grid-template-columns: 1fr 1fr; gap: $space-5; }

/* PE 分位 */
.pe-body { padding: $space-5; }
.pe-top { display: flex; gap: $space-8; margin-bottom: $space-6; }
.pe-stat { .pe-k { font-size: 11px; color: $text-tertiary; } .pe-v { font-size: 22px; font-weight: 700; margin-top: 4px; } }
.pe-level { &.低估 { color: $up; } &.高估 { color: $down; } &.合理 { color: $text-primary; } }

.pe-bar { position: relative; padding-top: 12px; }
.pe-zones { display: flex; height: 10px; border-radius: 5px; overflow: hidden;
  .zone { flex: 1; } .low { flex: 0.3; background: rgba(34,197,94,0.5); } .mid { flex: 0.4; background: rgba(245,183,61,0.5); } .high { flex: 0.3; background: rgba(239,68,68,0.5); }
}
.pe-marker { position: absolute; top: 0; transform: translateX(-50%); }
.marker-line { width: 2px; height: 22px; background: $text-primary; margin: 0 auto; }
.marker-val { font-size: 12px; font-weight: 700; background: $text-primary; color: $bg-panel; padding: 1px 6px; border-radius: 4px; text-align: center; width: fit-content; margin: 0 auto; }
.pe-labels { display: flex; justify-content: space-between; font-size: 10px; color: $text-tertiary; margin-top: $space-2; }

/* 信号理由 */
.reasons-body { padding: $space-3 $space-5 $space-5; }
.reason-group { margin-bottom: $space-4; }
.rg-head { font-size: 13px; font-weight: 600; margin-bottom: $space-2; &.up { color: $up; } &.down { color: $down; } &.muted { color: $text-secondary; } }
.reason-item {
  display: flex; gap: $space-2; align-items: flex-start;
  padding: $space-2 0;
  font-size: 13px; line-height: 1.5;
  .r-tag { flex-shrink: 0; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 500; }
  .r-text { color: $text-secondary; }
  &.buy .r-tag { background: $up-bg; color: $up; }
  &.sell .r-tag { background: $down-bg; color: $down; }
  &.hold .r-tag { background: $bg-panel-2; color: $text-tertiary; }
}
.empty-r { font-size: 12px; color: $text-tertiary; padding: $space-2 0; }

/* 档案 */
.archive {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: $border-subtle;
  padding: 1px;
}
.ar {
  background: $bg-panel;
  padding: $space-3 $space-5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  span { font-size: 12px; color: $text-tertiary; }
  b { font-size: 13px; font-weight: 600; }
}

/* 自选按钮 */
.watch-btn {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 999px;
  background: $bg-panel-2;
  color: $text-secondary;
  border: 1px solid $border-subtle;
  transition: $transition-fast;
  &:hover { color: $warning; border-color: $warning; }
  &.watched { color: $warning; border-color: $warning; background: rgba(245,183,61,0.1); }
}

/* 我的持仓 */
.pos-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1px;
  background: $border-subtle;
  padding: 1px;
}
.pos-item {
  background: $bg-panel;
  padding: $space-4;
  .pos-k { font-size: 11px; color: $text-tertiary; }
  .pos-v {
    font-size: 18px; font-weight: 700; margin-top: 4px;
    &.brand { color: $brand; } &.gold { color: $gold; }
    &.up { color: $up; } &.down { color: $down; }
  }
  .pos-pct { font-size: 12px; font-weight: 500; margin-top: 2px; }
}
.pos-edit {
  padding: $space-4 $space-5;
  display: flex;
  gap: $space-4;
  align-items: flex-end;
  flex-wrap: wrap;
}
.pe-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 140px;
  label { font-size: 12px; color: $text-secondary; }
  input {
    height: 36px;
    padding: 0 $space-3;
    background: $bg-panel-2;
    border: 1px solid $border-subtle;
    border-radius: $radius-md;
    color: $text-primary;
    font-size: 13px;
    outline: none;
    font-family: 'JetBrains Mono', monospace;
    &:focus { border-color: $brand; }
  }
}
.pe-actions { display: flex; gap: $space-2; align-items: center; }
.pos-empty { padding: $space-5; text-align: center; font-size: 13px; }

/* 重仓股明细 */
.holdings-wrap {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
}
.holdings-table {
  width: 100%;
  border-collapse: collapse;
  th, td {
    padding: $space-3 $space-4;
    font-size: 13px;
    border-bottom: 1px solid $border-subtle;
  }
  th { color: $text-tertiary; font-weight: 500; font-size: 11px; background: $bg-panel-2; }
  th.r, td.r { text-align: right; }
  th.c, td.c { text-align: center; }
  tbody tr:hover { background: $bg-panel-2; }
  .dim { color: $text-tertiary; }
}
.h-stock {
  display: flex;
  flex-direction: column;
  gap: 1px;
  .h-name { font-size: 13px; font-weight: 500; }
  .h-code { font-size: 10px; color: $text-tertiary; font-family: 'JetBrains Mono', monospace; }
}
.sector-chip {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 4px;
  background: $bg-panel-2;
  color: $text-secondary;
}
.h-bar-wrap {
  width: 80px; height: 6px;
  background: $bg-panel-2;
  border-radius: 3px;
  overflow: hidden;
  margin-left: auto;
}
.h-bar {
  height: 100%;
  background: linear-gradient(90deg, $brand, $purple);
  border-radius: 3px;
}
.sector-dist {
  padding: $space-4 $space-5;
  border-left: 1px solid $border-subtle;
}
.sd-title { font-size: 12px; margin-bottom: $space-3; color: $text-tertiary; }
.sd-row {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-bottom: $space-3;
  .sd-name { font-size: 12px; color: $text-secondary; width: 64px; flex-shrink: 0; }
  .sd-track { flex: 1; height: 8px; background: $bg-panel-2; border-radius: 4px; overflow: hidden; }
  .sd-fill { height: 100%; background: linear-gradient(90deg, $brand, $cyan); border-radius: 4px; }
  .sd-val { font-size: 12px; font-weight: 600; min-width: 40px; text-align: right; }
}
</style>
