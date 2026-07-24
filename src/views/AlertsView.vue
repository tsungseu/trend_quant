<script setup>
import { ref, computed } from 'vue'
import { useAlertsStore } from '@/stores/alerts'
import {
  alertTypeOptions,
  alertOpOptions,
  channelOptions,
  fmtAlertTarget,
  fmtAlertCurrent,
} from '@/mock/alerts'

const store = useAlertsStore()

const tab = ref('rules') // rules | history
const drawerOpen = ref(false)

// ---- 新建表单 ----
const form = ref({
  name: '',
  symbol: 'SH600519',
  symbolName: '贵州茅台',
  type: 'price',
  op: '>=',
  target: '',
  channels: ['app'],
})

const symbolOptions = [
  { code: 'SH600519', name: '贵州茅台' },
  { code: 'SH601318', name: '中国平安' },
  { code: 'SZ300750', name: '宁德时代' },
  { code: 'SH600036', name: '招商银行' },
  { code: 'SZ002594', name: '比亚迪' },
  { code: 'SH000001', name: '上证指数' },
]

function openDrawer() {
  form.value = {
    name: '',
    symbol: 'SH600519',
    symbolName: '贵州茅台',
    type: 'price',
    op: '>=',
    target: '',
    channels: ['app'],
  }
  drawerOpen.value = true
}

function submit() {
  if (!form.value.name || form.value.target === '') return
  store.addRule({
    name: form.value.name,
    symbol: form.value.symbol,
    symbolName: symbolOptions.find((s) => s.code === form.value.symbol)?.name || '',
    type: form.value.type,
    op: form.value.op,
    target:
      form.value.type === 'pct' || form.value.type === 'position'
        ? +form.value.target / 100
        : +form.value.target,
    current: form.value.type === 'price' ? 0 : 0,
    enabled: true,
    channels: form.value.channels,
    metric: form.value.type === 'metric' ? 'MA5/MA20' : null,
  })
  drawerOpen.value = false
}

const severityText = { high: '高', medium: '中', low: '低' }
const typeLabel = { price: '价格', pct: '涨跌幅', metric: '指标', position: '仓位' }
</script>

<template>
  <div class="alerts">
    <!-- 概览 -->
    <section class="summary panel">
      <div class="sm">
        <div class="lbl">启用预警</div>
        <div class="val brand num">{{ store.activeCount }} <span class="dim">/ {{ store.rules.length }}</span></div>
      </div>
      <div class="sm">
        <div class="lbl">今日触发</div>
        <div class="val up num">{{ store.todayTriggered }}</div>
      </div>
      <div class="sm">
        <div class="lbl">未读提醒</div>
        <div class="val warning num">{{ store.unreadCount }}</div>
      </div>
      <div class="sm">
        <div class="lbl">历史触发</div>
        <div class="val num">{{ store.history.length }}</div>
      </div>
      <div class="sm action">
        <button class="btn btn-primary" @click="openDrawer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          新建预警
        </button>
      </div>
    </section>

    <!-- 实时预警通知（基金买卖点触发） -->
    <section v-if="store.fundNotifs.length" class="panel">
      <div class="panel-title">
        <h3>🔔 实时预警通知</h3>
        <span class="sub">基金买卖点触发 · {{ store.fundNotifs.length }} 条</span>
      </div>
      <ul class="fn-list">
        <li
          v-for="n in store.fundNotifs.slice(0, 20)"
          :key="n.id"
          class="fn-item"
          :class="[n.level, { unread: !n.read }]"
        >
          <span class="fn-dot" :class="n.level"></span>
          <div class="fn-body">
            <div class="fn-msg">{{ n.msg }}</div>
            <div class="fn-time dim">{{ n.time }}</div>
          </div>
          <RouterLink :to="`/funds/${n.code}`" class="fn-link">查看 ›</RouterLink>
        </li>
      </ul>
    </section>

    <div class="toolbar">
      <div class="seg">
        <button :class="{ active: tab === 'rules' }" @click="tab = 'rules'">预警规则</button>
        <button :class="{ active: tab === 'history' }" @click="tab = 'history'">
          触发记录
          <span v-if="store.unreadCount" class="unread-dot">{{ store.unreadCount }}</span>
        </button>
      </div>
      <button v-if="tab === 'history'" class="btn btn-ghost btn-sm" @click="store.markAllRead">全部已读</button>
    </div>

    <!-- 预警规则表 -->
    <section v-if="tab === 'rules'" class="panel">
      <table class="a-table">
        <thead>
          <tr>
            <th class="c">启用</th>
            <th>预警名称</th>
            <th>标的</th>
            <th>类型</th>
            <th>触发条件</th>
            <th class="r">当前值</th>
            <th class="r">通知</th>
            <th class="r">触发次数</th>
            <th class="c">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in store.rules" :key="r.id" :class="{ disabled: !r.enabled }">
            <td class="c">
              <label class="switch">
                <input type="checkbox" :checked="r.enabled" @change="store.toggle(r.id)" />
                <span class="slider"></span>
              </label>
            </td>
            <td class="nm">{{ r.name }}</td>
            <td>
              <div class="sym">
                <span class="s-nm">{{ r.symbolName }}</span>
                <span class="s-cd">{{ r.symbol }}</span>
              </div>
            </td>
            <td><span class="type-tag">{{ typeLabel[r.type] }}</span></td>
            <td>
              <span class="cond num">
                {{ r.metric || '' }}
                {{ { '>=': '≥', '<=': '≤', cross_up: '↑上穿', cross_down: '↓下穿' }[r.op] || r.op }}
                <b v-if="r.target !== null">{{ fmtAlertTarget(r) }}</b>
              </span>
            </td>
            <td class="r num" :class="r.enabled ? (r.op.includes('>') || r.op === 'cross_up' ? (r.current >= (r.target || 0) ? 'up' : '') : '') : 'dim'">
              {{ fmtAlertCurrent(r) }}
            </td>
            <td class="r">
              <div class="channels">
                <span v-for="ch in r.channels" :key="ch" class="ch-icon" :title="ch">{{ ch === 'app' ? '📱' : ch === 'sms' ? '✉' : '📧' }}</span>
              </div>
            </td>
            <td class="r num">{{ r.triggered }}</td>
            <td class="c">
              <button class="op edit" title="编辑">✎</button>
              <button class="op del" title="删除" @click="store.remove(r.id)">✕</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 触发记录时间线 -->
    <section v-else class="panel">
      <div class="timeline">
        <div
          v-for="h in store.history"
          :key="h.id"
          class="tl-item"
          :class="[h.severity, { unread: h.status === 'unread' }]"
        >
          <div class="tl-dot"></div>
          <div class="tl-body">
            <div class="tl-head">
              <span class="tl-name">{{ h.ruleName }}</span>
              <span class="sev-badge" :class="h.severity">{{ severityText[h.severity] }}</span>
              <span v-if="h.status === 'unread'" class="new-tag">新</span>
              <span class="tl-time">{{ h.time }}</span>
            </div>
            <div class="tl-desc">
              <span class="sym-inline">{{ h.symbolName }} ({{ h.symbol }})</span>
              的{{ h.typeText }}
              <span class="num">{{ h.triggered }}</span>
              {{ h.opText }}预设阈值
              <span class="num dim">({{ h.target }})</span>
            </div>
            <div class="tl-foot">
              <span class="action-tag">{{ h.action }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 新建预警抽屉 -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="drawerOpen" class="drawer-mask" @click.self="drawerOpen = false">
          <div class="drawer">
            <div class="drawer-head">
              <h3>新建预警规则</h3>
              <button class="close" @click="drawerOpen = false">✕</button>
            </div>
            <div class="drawer-body">
              <div class="field">
                <label>预警名称</label>
                <input v-model="form.name" placeholder="如：茅台止盈提醒" />
              </div>
              <div class="field">
                <label>监控标的</label>
                <select v-model="form.symbol">
                  <option v-for="s in symbolOptions" :key="s.code" :value="s.code">{{ s.name }} ({{ s.code }})</option>
                </select>
              </div>
              <div class="field-row">
                <div class="field">
                  <label>预警类型</label>
                  <select v-model="form.type">
                    <option v-for="t in alertTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
                  </select>
                </div>
                <div class="field">
                  <label>触发条件</label>
                  <select v-model="form.op">
                    <option v-for="o in alertOpOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                </div>
              </div>
              <div class="field">
                <label>
                  目标值
                  <span class="hint" v-if="form.type === 'pct'">填百分比数字，如 3 表示 3%</span>
                  <span class="hint" v-else-if="form.type === 'position'">填百分比数字，如 25 表示 25%</span>
                </label>
                <input v-model="form.target" type="number" :placeholder="form.type === 'price' ? '如：1750' : '如：3'" />
              </div>
              <div class="field">
                <label>通知方式</label>
                <div class="checks">
                  <label v-for="c in channelOptions" :key="c.value" class="check">
                    <input type="checkbox" :value="c.value" v-model="form.channels" />
                    <span>{{ c.label }}</span>
                  </label>
                </div>
              </div>
            </div>
            <div class="drawer-foot">
              <button class="btn btn-ghost" @click="drawerOpen = false">取消</button>
              <button class="btn btn-primary" :disabled="!form.name || form.target === ''" @click="submit">创建预警</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.alerts {
  display: flex;
  flex-direction: column;
  gap: $space-5;
}

.summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr) auto;
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
    &.warning { color: $warning; }
    .dim { font-size: 13px; font-weight: 500; color: $text-tertiary; }
  }
  &.action {
    justify-self: end;
    align-items: flex-end;
    justify-content: center;
    padding: $space-4 $space-5;
  }
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.unread-dot {
  display: inline-block;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  margin-left: 4px;
  background: $danger;
  color: #fff;
  border-radius: 999px;
  font-size: 10px;
  line-height: 16px;
}

/* 规则表 */
.a-table {
  width: 100%;
  border-collapse: collapse;
  th, td {
    padding: $space-3 $space-4;
    font-size: 13px;
    border-bottom: 1px solid $border-subtle;
    white-space: nowrap;
  }
  th {
    color: $text-tertiary;
    font-weight: 500;
    font-size: 11px;
    background: $bg-panel-2;
  }
  th.r, td.r { text-align: right; }
  th.c, td.c { text-align: center; }
  tr.disabled { opacity: 0.5; }
  tr:hover { background: $bg-panel-2; }
  .nm { font-weight: 500; }
}
.sym {
  display: flex;
  flex-direction: column;
  gap: 1px;
  .s-nm { font-size: 13px; }
  .s-cd { font-size: 10px; color: $text-tertiary; }
}
.type-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  background: $brand-soft;
  color: $brand;
}
.cond b { color: $text-primary; font-weight: 600; }
.channels {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  .ch-icon { font-size: 12px; }
}

/* 开关 */
.switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  input { opacity: 0; width: 0; height: 0; }
  .slider {
    position: absolute;
    inset: 0;
    background: $bg-elevated;
    border-radius: 999px;
    transition: $transition-fast;
    &::before {
      content: '';
      position: absolute;
      width: 14px;
      height: 14px;
      left: 3px;
      top: 3px;
      background: $text-tertiary;
      border-radius: 50%;
      transition: $transition-fast;
    }
  }
  input:checked + .slider {
    background: $brand;
    &::before {
      transform: translateX(16px);
      background: #fff;
    }
  }
}

.op {
  width: 26px;
  height: 26px;
  border-radius: $radius-sm;
  font-size: 13px;
  margin: 0 2px;
  color: $text-tertiary;
  &:hover { background: $bg-panel-2; color: $text-primary; }
  &.del:hover { color: $danger; }
}

/* 时间线 */
.timeline {
  padding: $space-4 $space-5;
  position: relative;
}
.tl-item {
  display: flex;
  gap: $space-4;
  padding-bottom: $space-5;
  position: relative;
  &::before {
    content: '';
    position: absolute;
    left: 5px;
    top: 18px;
    bottom: 0;
    width: 2px;
    background: $border-subtle;
  }
  &:last-child { padding-bottom: 0; }
  &.unread .tl-body { background: rgba(59,130,246,0.04); }
}
.tl-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
  background: $text-tertiary;
  border: 2px solid $bg-panel;
  z-index: 1;
}
.tl-item.high .tl-dot { background: $danger; box-shadow: 0 0 0 4px rgba(239,68,68,0.15); }
.tl-item.medium .tl-dot { background: $warning; box-shadow: 0 0 0 4px rgba(245,183,61,0.12); }
.tl-item.low .tl-dot { background: $brand; }

.tl-body {
  flex: 1;
  padding: $space-3 $space-4;
  border-radius: $radius-md;
  border: 1px solid $border-subtle;
}
.tl-head {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-bottom: 4px;
  .tl-name { font-size: 14px; font-weight: 600; }
  .tl-time { margin-left: auto; font-size: 11px; color: $text-tertiary; }
}
.sev-badge {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  &.high { color: $danger; background: rgba(239,68,68,0.12); }
  &.medium { color: $warning; background: rgba(245,183,61,0.12); }
  &.low { color: $brand; background: $brand-soft; }
}
.new-tag {
  padding: 1px 6px;
  background: $danger;
  color: #fff;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}
.tl-desc {
  font-size: 13px;
  color: $text-secondary;
  .sym-inline { color: $text-primary; font-weight: 500; }
}
.tl-foot {
  margin-top: 4px;
  .action-tag {
    font-size: 11px;
    color: $text-tertiary;
  }
}

/* 抽屉 */
.drawer-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: flex-end;
  z-index: 100;
}
.drawer {
  width: 420px;
  max-width: 90vw;
  height: 100%;
  background: $bg-panel;
  border-left: 1px solid $border-default;
  display: flex;
  flex-direction: column;
}
.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-5 $space-6;
  border-bottom: 1px solid $border-subtle;
  h3 { font-size: 17px; font-weight: 600; }
  .close {
    width: 28px; height: 28px;
    border-radius: $radius-sm;
    color: $text-tertiary;
    font-size: 14px;
    &:hover { background: $bg-panel-2; color: $text-primary; }
  }
}
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: $space-5 $space-6;
  display: flex;
  flex-direction: column;
  gap: $space-4;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  label {
    font-size: 12px;
    color: $text-secondary;
    display: flex;
    align-items: center;
    gap: $space-2;
    .hint { font-size: 10px; color: $text-tertiary; font-weight: 400; }
  }
  input, select {
    height: 36px;
    padding: 0 $space-3;
    background: $bg-panel-2;
    border: 1px solid $border-subtle;
    border-radius: $radius-md;
    color: $text-primary;
    font-size: 13px;
    outline: none;
    &:focus { border-color: $brand; }
  }
}
.field-row {
  display: flex;
  gap: $space-3;
}
.checks {
  display: flex;
  gap: $space-4;
  flex-wrap: wrap;
}
.check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: $text-primary;
  cursor: pointer;
  input { width: 14px; height: 14px; accent-color: $brand; }
}
.drawer-foot {
  display: flex;
  justify-content: flex-end;
  gap: $space-2;
  padding: $space-4 $space-6;
  border-top: 1px solid $border-subtle;
  .btn-primary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.drawer-enter-active, .drawer-leave-active {
  transition: opacity 0.2s $ease;
  .drawer { transition: transform 0.25s $ease; }
}
.drawer-enter-from, .drawer-leave-to {
  opacity: 0;
  .drawer { transform: translateX(100%); }
}

/* 实时预警通知 */
.fn-list { padding: $space-2 $space-4; }
.fn-item {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-3 $space-2;
  border-radius: $radius-md;
  &:hover { background: $bg-panel-2; }
  &.unread { background: rgba(59,130,246,0.04); }
}
.fn-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  &.buy { background: $up; box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }
  &.sell { background: $down; box-shadow: 0 0 0 3px rgba(34,197,94,0.15); }
}
.fn-body { flex: 1; min-width: 0; }
.fn-msg { font-size: 13px; color: $text-primary; }
.fn-time { font-size: 11px; margin-top: 1px; }
.fn-link { font-size: 12px; color: $brand; flex-shrink: 0; }
</style>
