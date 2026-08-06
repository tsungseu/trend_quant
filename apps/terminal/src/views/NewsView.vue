<script setup>
import { ref, computed, watch } from 'vue'
import { news, categories, calendar, impactText } from '@/mock/news'
import MiniMarkdown from '@/components/MiniMarkdown.vue'

const activeCat = ref('all')
/** 已展开资讯 id 集合；用对象保证 Vue 响应式可靠 */
const expanded = ref({})

const filtered = computed(() =>
  activeCat.value === 'all'
    ? news
    : news.filter((n) => n.category === activeCat.value)
)

function isExpanded(id) {
  return !!expanded.value[id]
}

function toggle(id) {
  expanded.value = { ...expanded.value, [id]: !expanded.value[id] }
}

watch(activeCat, () => {
  expanded.value = {}
})

const tagColorClass = (c) => c
const impactClass = (i) => i
</script>

<template>
  <div class="news">
    <!-- 资讯流 -->
    <div class="feed">
      <!-- 顶栏：分类 + 热点 -->
      <div class="toolbar">
        <div class="seg">
          <button
            v-for="c in categories"
            :key="c.key"
            :class="{ active: activeCat === c.key }"
            @click="activeCat = c.key"
          >{{ c.label }}</button>
        </div>
        <div class="hot-tags">
          <span class="hot-label">🔥 热门话题</span>
          <span class="hot-chip">降准</span>
          <span class="hot-chip">新能源车</span>
          <span class="hot-chip">半导体</span>
          <span class="hot-chip">中报行情</span>
        </div>
      </div>

      <!-- 资讯列表 -->
      <div class="list">
        <article
          v-for="n in filtered"
          :key="n.id"
          class="news-card panel"
          :class="{ expanded: isExpanded(n.id) }"
          @click="toggle(n.id)"
        >
          <div class="nc-head">
            <span class="nc-tag" :class="tagColorClass(n.tagColor)">{{ n.tag }}</span>
            <span v-if="n.category === 'research'" class="nc-rating" :class="n.rating">{{ n.rating }}</span>
            <span class="nc-impact" :class="impactClass(n.impact)">{{ impactText[n.impact] }}</span>
            <span class="nc-time">{{ n.time }}</span>
          </div>
          <h3 class="nc-title">{{ n.title }}</h3>
          <p v-show="!isExpanded(n.id)" class="nc-summary clamp">{{ n.summary }}</p>

          <!-- 展开后的正文详情 -->
          <div v-if="isExpanded(n.id)" class="nc-content">
            <MiniMarkdown :content="n.content" />
          </div>

          <!-- 研报额外信息 -->
          <div v-if="n.category === 'research' && isExpanded(n.id)" class="nc-research">
            <div class="r-item"><span class="r-k">机构</span><span class="r-v">{{ n.source }}</span></div>
            <div class="r-item"><span class="r-k">分析师</span><span class="r-v">{{ n.author }}</span></div>
            <div class="r-item"><span class="r-k">目标价</span><span class="r-v brand">{{ n.target }}</span></div>
          </div>

          <div class="nc-foot">
            <div class="nc-related">
              <span v-for="r in n.related" :key="r" class="related-chip">#{{ r }}</span>
            </div>
            <div class="nc-meta">
              <span class="expand-hint">{{ isExpanded(n.id) ? '收起' : '查看全文' }}</span>
              <span class="source">{{ n.source }}</span>
              <span class="hot">🔥 {{ n.hot.toLocaleString() }}</span>
            </div>
          </div>
        </article>
      </div>
    </div>

    <!-- 右侧：日历 + 热榜 -->
    <aside class="side">
      <!-- 财经日历 -->
      <div class="panel">
        <div class="panel-title">
          <h3>📅 财经日历</h3>
          <span class="sub">本周</span>
        </div>
        <ul class="calendar">
          <li v-for="(c, i) in calendar" :key="i" class="cal-item">
            <span class="cal-dot" :class="[c.type, c.importance]"></span>
            <div class="cal-main">
              <div class="cal-event">{{ c.event }}</div>
              <div class="cal-time dim">{{ c.time }}</div>
            </div>
            <span v-if="c.importance === 'high'" class="cal-star">⭐</span>
          </li>
        </ul>
      </div>

      <!-- 热股榜 -->
      <div class="panel">
        <div class="panel-title">
          <h3>🔥 股票热榜</h3>
          <span class="sub">热度</span>
        </div>
        <ul class="hot-stocks">
          <li v-for="(s, i) in [
            { name: '贵州茅台', code: 'SH600519', reason: '中报超预期', hot: 9821 },
            { name: '宁德时代', code: 'SZ300750', reason: '回购利好', hot: 8654 },
            { name: '北方华创', code: 'SZ002371', reason: '半导体回暖', hot: 7321 },
            { name: '比亚迪', code: 'SZ002594', reason: '定增扩产', hot: 6543 },
            { name: '中国平安', code: 'SH601318', reason: '保险新单回暖', hot: 5432 },
          ]" :key="s.code" class="hs-item">
            <span class="hs-rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
            <div class="hs-main">
              <span class="hs-name">{{ s.name }}</span>
              <span class="hs-reason dim">{{ s.reason }}</span>
            </div>
            <span class="hs-hot num">{{ (s.hot / 1000).toFixed(1) }}k</span>
          </li>
        </ul>
      </div>
    </aside>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.news {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: $space-5;
}

.feed {
  display: flex;
  flex-direction: column;
  gap: $space-4;
  min-width: 0;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-4;
  flex-wrap: wrap;
}
.hot-tags {
  display: flex;
  align-items: center;
  gap: $space-2;
  .hot-label { font-size: 12px; color: $text-tertiary; }
}
.hot-chip {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 999px;
  background: $bg-panel-2;
  border: 1px solid $border-subtle;
  color: $text-secondary;
  cursor: pointer;
  &:hover { color: $danger; border-color: $danger; }
}

/* 资讯卡片 */
.list {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}
.news-card {
  padding: $space-4 $space-5;
  cursor: pointer;
  transition: $transition-fast;
  &:hover { border-color: $border-default; transform: translateY(-1px); }
  &.expanded .nc-title { color: $brand; }
}
.nc-head {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-bottom: $space-2;
  flex-wrap: wrap;
}
.nc-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
  &.red { background: rgba(239,68,68,0.12); color: $danger; }
  &.blue { background: $brand-soft; color: $brand; }
  &.gold { background: $gold-soft; color: $gold; }
  &.green { background: rgba(34,197,94,0.12); color: $success; }
  &.purple { background: rgba(168,85,247,0.12); color: $purple; }
}
.nc-rating {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  &.买入 { background: $up-bg; color: $up; }
  &.增持 { background: $brand-soft; color: $brand; }
}
.nc-impact {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  &.high { background: rgba(239,68,68,0.1); color: $danger; }
  &.medium { background: rgba(245,183,61,0.1); color: $warning; }
  &.low { background: $bg-panel-2; color: $text-tertiary; }
}
.nc-time {
  margin-left: auto;
  font-size: 11px;
  color: $text-tertiary;
}
.nc-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: $space-2;
  transition: color $transition-fast;
}
.nc-summary {
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.7;
  &.clamp {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.nc-content {
  margin-top: $space-3;
  padding: $space-3 $space-4;
  background: $bg-panel-2;
  border-radius: $radius-md;
  border-left: 3px solid $brand;
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.8;
  :deep(p) { margin: 0 0 $space-2; }
  :deep(strong) { color: $text-primary; }
  :deep(blockquote) {
    margin: $space-2 0 0;
    padding: $space-2 $space-3;
    border-left: 2px solid $border-default;
    color: $text-tertiary;
    font-size: 12px;
  }
  :deep(ul) { margin: 0 0 $space-2; padding-left: $space-4; }
  :deep(li) { margin-bottom: 4px; }
  :deep(code) {
    background: $bg-elevated;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 12px;
    color: $brand;
  }
}

.nc-research {
  display: flex;
  gap: $space-6;
  padding: $space-3;
  margin-top: $space-3;
  background: $bg-panel-2;
  border-radius: $radius-md;
  .r-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    .r-k { font-size: 11px; color: $text-tertiary; }
    .r-v { font-size: 13px; font-weight: 600; }
  }
}

.nc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $space-3;
  padding-top: $space-3;
  border-top: 1px solid $border-subtle;
}
.nc-related {
  display: flex;
  gap: $space-2;
  flex-wrap: wrap;
}
.related-chip {
  font-size: 11px;
  color: $brand;
  &:hover { text-decoration: underline; }
}
.nc-meta {
  display: flex;
  align-items: center;
  gap: $space-4;
  font-size: 11px;
  color: $text-tertiary;
  .expand-hint { color: $brand; font-weight: 500; }
  .hot { color: $danger; }
}

/* 右侧 */
.side {
  display: flex;
  flex-direction: column;
  gap: $space-5;
}
.calendar {
  padding: $space-3;
}
.cal-item {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-3;
  &:hover { background: $bg-panel-2; border-radius: $radius-md; }
}
.cal-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  &.macro { background: $brand; }
  &.corp { background: $gold; }
  &.high { box-shadow: 0 0 0 3px rgba(59,130,246,0.2); }
}
.cal-main {
  flex: 1;
  .cal-event { font-size: 12px; font-weight: 500; }
  .cal-time { font-size: 10px; margin-top: 2px; }
}
.cal-star { font-size: 12px; }

.hot-stocks {
  padding: $space-3;
}
.hs-item {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-3;
  border-radius: $radius-md;
  &:hover { background: $bg-panel-2; }
}
.hs-rank {
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px;
  font-weight: 700;
  border-radius: 4px;
  background: $bg-panel-2;
  color: $text-tertiary;
  flex-shrink: 0;
  &.top { background: $danger; color: #fff; }
}
.hs-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  .hs-name { font-size: 13px; font-weight: 500; }
  .hs-reason { font-size: 10px; margin-top: 1px; }
}
.hs-hot {
  font-size: 12px;
  color: $danger;
  font-weight: 600;
}
</style>
