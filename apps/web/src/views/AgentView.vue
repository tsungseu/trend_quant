<script setup>
import { nextTick, ref, computed } from 'vue'
import { terminalUrl } from '@/data/terminal'
import AgentSettings from '@/components/AgentSettings.vue'
import AgentComposer from '@/components/AgentComposer.vue'

// MindQuant Agent 独立对话页（Kimi Agent 式布局）。
// 本页是产品入口的界面层：场景导航与快捷提问为演示态，
// 对话服务接入前不伪造投研分析，回复统一为接入预告。

const scenes = [
  { icon: 'trending', label: '诊断持仓', prompt: '帮我诊断当前持仓的健康度，指出集中度与回撤风险。' },
  { icon: 'activity', label: '分析大盘', prompt: '分析今日 A 股大盘走势与量能变化。' },
  { icon: 'layers', label: '回测策略', prompt: '帮我对一个均线策略做回测归因分析。' },
  { icon: 'brain', label: '研报解读', prompt: '帮我解读一份券商研报的核心逻辑与假设。' },
  { icon: 'database', label: '因子分析', prompt: '动量因子与波动率因子近期表现如何？' },
  { icon: 'bell', label: '风险预警', prompt: '我的组合需要注意哪些风险信号？' },
]

// Feather 风格内联 SVG，与官网能力宫格同一图标族
const icons = {
  brain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>',
  database: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg>',
  activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  trending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
}

const input = ref('')
const composerRef = ref(null)
const messages = ref([])
const started = computed(() => messages.value.length > 0)
const settingsOpen = ref(false)

function usePrompt(text) {
  input.value = text
  nextTick(() => {
    composerRef.value?.focus()
  })
}

// 工具箱「研究目标」模板：以前缀开始，聚焦交由组件内部处理
function onPrefill(prefix) {
  input.value = prefix
}

function send() {
  const text = input.value.trim()
  if (!text) return
  messages.value.push({ role: 'user', text })
  input.value = ''
  if (messages.value.length === 1) {
    messages.value.push({
      role: 'agent',
      text: '这里是 MindQuant Agent 的界面预览。对话服务接入后，我会给出带来源引用的投研分析；当前版本不产生真实研究结论。现有的回测、行情与预警能力可在 Studio 终端使用。',
    })
  } else {
    messages.value.push({
      role: 'agent',
      text: '已收到。演示模式下每条提问都会得到这条相同的说明，避免伪造投研内容。',
    })
  }
}

function newSession() {
  messages.value = []
  input.value = ''
}
</script>

<template>
  <div class="agent-page" data-theme="light">
    <!-- 左：会话与场景导航 -->
    <aside class="agent-side">
      <RouterLink to="/" class="side-brand" aria-label="返回 TrendQuant 官网">
        <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
          <rect width="32" height="32" rx="7" fill="var(--brand)" />
          <path d="M7 21l5-6 4 3 6-9 3 4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="side-brand-word">MindQuant Agent</span>
      </RouterLink>

      <button type="button" class="new-session" @click="newSession">
        <span class="new-session-icon" v-html="icons.plus" aria-hidden="true"></span>
        新建会话
      </button>

      <nav class="side-scenes" aria-label="研究场景">
        <button
          v-for="s in scenes"
          :key="s.label"
          type="button"
          class="scene-item"
          @click="usePrompt(s.prompt)"
        >
          <span class="scene-ico" v-html="icons[s.icon]" aria-hidden="true"></span>
          <span>{{ s.label }}</span>
        </button>
      </nav>

      <div class="side-foot">
        <button type="button" class="settings-btn" @click="settingsOpen = true">
          <span class="settings-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </span>
          设置
        </button>
        <p class="side-note">偏好保存在本地浏览器。</p>
        <p class="side-disclaimer">研究工具，非投资建议。</p>
      </div>
    </aside>

    <AgentSettings v-if="settingsOpen" @close="settingsOpen = false" />

    <!-- 右：主区（空态居中 / 会话态上下结构） -->
    <main class="agent-main" :class="{ chatting: started }">
      <header v-if="started" class="chat-head">
        <span class="chat-title">新会话</span>
        <a :href="terminalUrl" class="chat-link">打开 Studio 终端</a>
      </header>

      <!-- 空态：品牌语 + 输入卡 + 场景快捷 -->
      <div v-if="!started" class="home-state">
        <span class="home-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="30" height="30">
            <rect width="32" height="32" rx="8" fill="var(--brand-soft)" />
            <path d="M7 21l5-6 4 3 6-9 3 4" fill="none" stroke="var(--brand)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <h1 class="home-title">把投研问题，交给 Agent</h1>
        <p class="home-sub">用自然语言做研报解读、策略探讨与组合分析，结论可追溯。</p>

        <AgentComposer
          ref="composerRef"
          v-model="input"
          class="composer"
          placeholder="向 MindQuant Agent 提问，或从下面的场景开始…"
          @send="send"
          @prefill="onPrefill"
        />

        <div class="quick-row" role="list" aria-label="快捷场景">
          <button
            v-for="s in scenes"
            :key="s.label"
            type="button"
            class="quick-pill"
            role="listitem"
            @click="usePrompt(s.prompt)"
          >
            <span class="qp-ico" v-html="icons[s.icon]" aria-hidden="true"></span>
            <span>{{ s.label }}</span>
          </button>
        </div>
      </div>

      <!-- 会话态：消息流 + 底部输入卡 -->
      <div v-else class="chat-body">
        <div class="msg-list">
          <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role">
            <span v-if="m.role === 'agent'" class="msg-avatar" aria-hidden="true">A</span>
            <div class="msg-bubble">{{ m.text }}</div>
          </div>
        </div>

        <AgentComposer
          ref="composerRef"
          v-model="input"
          class="composer docked"
          placeholder="继续提问…"
          @send="send"
          @prefill="onPrefill"
        />
      </div>
    </main>
  </div>
</template>

<style lang="scss" scoped>
@use '@trendquant/design-tokens/tokens.scss' as *;

$font-display: 'Space Grotesk', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;

.agent-page {
  display: flex;
  height: 100dvh;
  background: $bg-paper;
  color: $text-paper-primary;
}

// ---- 左侧栏 ----
.agent-side {
  width: 256px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: $space-4;
  padding: $space-4 $space-3;
  background: $bg-paper-elevated;
  border-right: 1px solid $border-paper;

  @media (max-width: 900px) {
    display: none;
  }
}

.side-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: $space-2 $space-2 0;
  font-family: $font-display;
}
.side-brand-word {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: $text-paper-primary;
}

.new-session {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid $border-paper;
  border-radius: $radius-md;
  background: #fff;
  font-size: 14px;
  font-weight: 600;
  color: $text-paper-primary;
  cursor: pointer;
  transition: border-color 0.15s $ease, background-color 0.15s $ease;

  &:hover {
    border-color: var(--brand);
    background: var(--brand-soft);
  }

  .new-session-icon {
    display: inline-flex;
    color: var(--brand);

    :deep(svg) {
      width: 16px;
      height: 16px;
    }
  }
}

.side-scenes {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: $space-2;
}

.scene-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 38px;
  padding: 0 12px;
  border: none;
  border-radius: $radius-md;
  background: transparent;
  font-size: 14px;
  color: $text-paper-secondary;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s $ease, color 0.15s $ease;

  &:hover {
    background: $bg-hover;
    color: $text-paper-primary;
  }

  .scene-ico {
    display: inline-flex;
    color: $text-paper-tertiary;

    :deep(svg) {
      width: 17px;
      height: 17px;
    }
  }

  &:hover .scene-ico {
    color: var(--brand);
  }
}

.side-foot {
  margin-top: auto;
  padding: $space-3 $space-2 0;
  border-top: 1px solid $border-paper;
}
.settings-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 36px;
  padding: 0 10px;
  margin-bottom: 8px;
  border: none;
  border-radius: $radius-md;
  background: transparent;
  font-size: 13.5px;
  font-weight: 500;
  color: $text-paper-secondary;
  cursor: pointer;
  transition: background-color 0.15s $ease, color 0.15s $ease;

  &:hover {
    background: $bg-hover;
    color: $text-paper-primary;
  }

  .settings-ico {
    display: inline-flex;
    color: $text-paper-tertiary;
  }

  &:hover .settings-ico {
    color: var(--brand);
  }
}
.side-note {
  font-size: 12px;
  line-height: 1.6;
  color: $text-paper-tertiary;
}
.side-disclaimer {
  margin-top: 6px;
  font-size: 12px;
  color: $text-paper-tertiary;
}

// ---- 主区 ----
.agent-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.home-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  // 内容略高于几何中心（Kimi 同款），给底栏下方留出弹层空间
  padding: $space-8 $space-6 72px;
  max-width: 760px;
  margin: 0 auto;
  width: 100%;
}

.home-mark {
  display: inline-flex;
  margin-bottom: $space-5;
}
.home-title {
  font-family: $font-display;
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: $text-paper-primary;
  text-align: center;
}
.home-sub {
  margin-top: 14px;
  font-size: 16px;
  line-height: 1.6;
  color: $text-paper-secondary;
  text-align: center;
  max-width: 40ch;
}

// ---- 输入卡（AgentComposer 承担内部样式，这里只管布局位置） ----
.composer {
  width: 100%;
  margin-top: $space-6;
}

.quick-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: $space-2;
  margin-top: $space-5;
}

.quick-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 16px;
  border: 1px solid $border-paper;
  border-radius: 999px;
  background: $bg-paper-elevated;
  font-size: 13.5px;
  color: $text-paper-secondary;
  cursor: pointer;
  transition: border-color 0.15s $ease, color 0.15s $ease, background-color 0.15s $ease;

  .qp-ico {
    display: inline-flex;
    color: $text-paper-tertiary;
    transition: color 0.15s $ease;

    :deep(svg) {
      width: 16px;
      height: 16px;
    }
  }

  &:hover {
    border-color: var(--brand);
    color: var(--brand);
    background: var(--brand-soft);

    .qp-ico {
      color: var(--brand);
    }
  }
}

// ---- 会话态 ----
.chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 $space-6;
  border-bottom: 1px solid $border-paper;
  background: $bg-paper-elevated;

  @media (max-width: 720px) {
    padding: 0 $space-4;
  }
}
.chat-title {
  font-family: $font-display;
  font-size: 15px;
  font-weight: 600;
  color: $text-paper-primary;
}
.chat-link {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--brand);

  &:hover {
    text-decoration: underline;
  }
}

.chat-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.msg-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: $space-5;
  padding: $space-8 $space-6;
  max-width: 760px;
  margin: 0 auto;
  width: 100%;

  @media (max-width: 720px) {
    padding: $space-5 $space-4;
  }
}

.msg {
  display: flex;
  gap: 10px;
  max-width: 86%;

  &.user {
    align-self: flex-end;

    .msg-bubble {
      background: var(--brand);
      color: #fff;
      border-radius: 16px 16px 4px 16px;
    }
  }

  &.agent {
    align-self: flex-start;

    .msg-bubble {
      background: #fff;
      border: 1px solid $border-paper;
      color: $text-paper-primary;
      border-radius: 16px 16px 16px 4px;
    }
  }
}

.msg-avatar {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: $radius-md;
  background: var(--brand-soft);
  color: var(--brand);
  font-family: $font-display;
  font-size: 13px;
  font-weight: 700;
}

.msg-bubble {
  padding: 12px 16px;
  font-size: 14.5px;
  line-height: 1.65;
}

.composer.docked {
  flex-shrink: 0;
  margin: 0 $space-6 $space-6;
  max-width: 760px;
  width: calc(100% - #{$space-6 * 2});

  @media (max-width: 720px) {
    margin: 0 $space-4 $space-4;
    width: calc(100% - #{$space-4 * 2});
  }
}
</style>
