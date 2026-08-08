<script setup>
import { ref, computed } from 'vue'
import { trades, cashflow } from '@/mock/holdings'
import { fmtMoney, sign } from '@/mock/_helpers'

const tab = ref('trades') // trades / cashflow
const actionFilter = ref('all') // all / 买入 / 卖出

const filteredTrades = computed(() =>
  trades.filter((t) => actionFilter.value === 'all' || t.action === actionFilter.value)
)

const stats = computed(() => {
  const buy = trades.filter((t) => t.action === '买入')
  const sell = trades.filter((t) => t.action === '卖出')
  const buyAmt = buy.reduce((s, t) => s + t.amount, 0)
  const sellAmt = sell.reduce((s, t) => s + t.amount, 0)
  const fee = trades.reduce((s, t) => s + t.fee, 0)
  return {
    buyCount: buy.length,
    sellCount: sell.length,
    buyAmt,
    sellAmt,
    fee,
  }
})

const cashIn = computed(() =>
  cashflow.filter((c) => c.income).reduce((s, c) => s + c.amount, 0)
)
const cashOut = computed(() =>
  cashflow.filter((c) => !c.income).reduce((s, c) => s + c.amount, 0)
)
</script>

<template>
  <div class="trades">
    <!-- 概览 -->
    <section class="summary panel">
      <div class="sm">
        <div class="lbl">买入笔数 / 金额</div>
        <div class="val num"><span class="up">{{ stats.buyCount }}</span> 笔 · <span class="up num">{{ fmtMoney(stats.buyAmt) }}</span></div>
      </div>
      <div class="sm">
        <div class="lbl">卖出笔数 / 金额</div>
        <div class="val num"><span class="down">{{ stats.sellCount }}</span> 笔 · <span class="down num">{{ fmtMoney(stats.sellAmt) }}</span></div>
      </div>
      <div class="sm">
        <div class="lbl">交易手续费</div>
        <div class="val num gold">{{ fmtMoney(stats.fee) }}</div>
      </div>
      <div class="sm">
        <div class="lbl">净流入 (现金)</div>
        <div class="val num" :class="cashIn - cashOut > 0 ? 'up' : 'down'">
          {{ sign(cashIn - cashOut) }}{{ fmtMoney(cashIn - cashOut) }}
        </div>
      </div>
    </section>

    <div class="toolbar">
      <div class="seg">
        <button :class="{ active: tab === 'trades' }" @click="tab = 'trades'">成交记录</button>
        <button :class="{ active: tab === 'cashflow' }" @click="tab = 'cashflow'">资金流水</button>
      </div>
      <div v-if="tab === 'trades'" class="seg">
        <button :class="{ active: actionFilter === 'all' }" @click="actionFilter = 'all'">全部</button>
        <button :class="{ active: actionFilter === '买入' }" @click="actionFilter = '买入'">买入</button>
        <button :class="{ active: actionFilter === '卖出' }" @click="actionFilter = '卖出'">卖出</button>
      </div>
    </div>

    <!-- 成交记录 -->
    <section v-if="tab === 'trades'" class="panel">
      <table class="t-table">
        <thead>
          <tr>
            <th>成交时间</th>
            <th>代码 / 名称</th>
            <th>方向</th>
            <th class="r">成交价</th>
            <th class="r">数量</th>
            <th class="r">金额</th>
            <th class="r">手续费</th>
            <th>来源</th>
            <th>策略</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in filteredTrades" :key="t.id">
            <td class="dim">
              <div>{{ t.date }}</div>
              <div class="time">{{ t.time }}</div>
            </td>
            <td>
              <div class="sym">
                <span class="nm">{{ t.name }}</span>
                <span class="cd">{{ t.code }}</span>
              </div>
            </td>
            <td>
              <span class="act" :class="t.action === '买入' ? 'buy' : 'sell'">{{ t.action }}</span>
            </td>
            <td class="r num">{{ t.price }}</td>
            <td class="r num">{{ t.qty.toLocaleString() }}</td>
            <td class="r num">{{ fmtMoney(t.amount) }}</td>
            <td class="r num dim">{{ fmtMoney(t.fee) }}</td>
            <td>
              <span class="channel" :class="t.channel === '量化策略' ? 'algo' : ''">{{ t.channel }}</span>
            </td>
            <td class="dim">{{ t.strategy }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 资金流水 -->
    <section v-else class="panel">
      <table class="t-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>类型</th>
            <th class="r">金额</th>
            <th class="r">余额</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(c, i) in cashflow" :key="i">
            <td class="dim">{{ c.date }}</td>
            <td>
              <span class="ctype">{{ c.type }}</span>
            </td>
            <td class="r num" :class="c.income ? 'up' : 'down'">
              {{ c.income ? '+' : '-' }}{{ fmtMoney(c.amount) }}
            </td>
            <td class="r num">{{ fmtMoney(c.balance) }}</td>
            <td class="dim">{{ c.remark }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.trades {
  display: flex;
  flex-direction: column;
  gap: $space-5;
}

.summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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
  .lbl {
    font-size: 12px;
    color: $text-secondary;
  }
  .val {
    font-size: 20px;
    font-weight: 700;
    &.up { color: $up; }
    &.down { color: $down; }
    &.gold { color: $gold; }
    .up { color: $up; }
    .down { color: $down; }
  }
}

.toolbar {
  display: flex;
  justify-content: space-between;
}

.t-table {
  width: 100%;
  border-collapse: collapse;
  th, td {
    padding: $space-3 $space-5;
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
  th.r, td.r {
    text-align: right;
  }
  tbody tr:hover {
    background: $bg-panel-2;
  }
  .dim {
    color: $text-tertiary;
  }
  .time {
    font-size: 10px;
    color: $text-tertiary;
  }
}

.sym {
  display: flex;
  flex-direction: column;
  gap: 1px;
  .nm {
    font-size: 13px;
    font-weight: 500;
  }
  .cd {
    font-size: 10px;
    color: $text-tertiary;
  }
}

.act {
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  &.buy {
    color: $up;
    background: $up-bg;
  }
  &.sell {
    color: $down;
    background: $down-bg;
  }
}

.channel {
  font-size: 12px;
  color: $text-secondary;
  &.algo {
    color: $purple;
  }
}

.ctype {
  font-size: 12px;
  color: $text-secondary;
  padding: 2px 8px;
  background: $bg-panel-2;
  border-radius: 4px;
}
</style>
