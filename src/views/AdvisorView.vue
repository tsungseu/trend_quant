<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { sessions as initialSessions, quickPrompts, matchReply } from '@/mock/advisor'
import MiniMarkdown from '@/components/MiniMarkdown.vue'

const sessions = ref(initialSessions)
const activeSessionId = ref('s1')
const input = ref('')
const isStreaming = ref(false)
const chatRef = ref(null)

// 消息列表
const messages = ref([
  {
    role: 'ai',
    content:
      '您好！我是您的 AI 投顾助手 🤖\n\n我可以帮您：\n- **诊断持仓** 健康度\n- **分析市场** 走势\n- **优化仓位** 配置\n- **推荐量化** 策略\n\n请问有什么可以帮您？',
    time: '09:42',
  },
])

function now() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function scrollToBottom() {
  nextTick(() => {
    if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight
  })
}

// 发送消息 + 模拟流式回复
async function send(text) {
  const q = (text ?? input.value).trim()
  if (!q || isStreaming.value) return

  messages.value.push({ role: 'user', content: q, time: now() })
  input.value = ''
  scrollToBottom()

  isStreaming.value = true
  // 添加一条空的 AI 消息，逐字填充
  const aiMsg = { role: 'ai', content: '', time: now(), streaming: true }
  messages.value.push(aiMsg)
  scrollToBottom()

  const full = matchReply(q)
  // 流式输出：按词块递增
  const chunks = full.match(/[\s\S]{1,4}/g) || [full]
  let idx = 0
  await new Promise((resolve) => {
    const timer = setInterval(() => {
      aiMsg.content += chunks[idx] || ''
      idx++
      scrollToBottom()
      if (idx >= chunks.length) {
        clearInterval(timer)
        aiMsg.streaming = false
        isStreaming.value = false
        resolve()
      }
    }, 12)
  })
}

function usePrompt(p) {
  send(p.text)
}

onMounted(() => scrollToBottom)
</script>

<template>
  <div class="advisor">
    <!-- 左：会话列表 -->
    <aside class="panel sessions">
      <div class="panel-title">
        <h3>会话历史</h3>
        <button class="new-chat">+ 新对话</button>
      </div>
      <div class="session-list">
        <div
          v-for="s in sessions"
          :key="s.id"
          class="session-item"
          :class="{ active: s.id === activeSessionId }"
          @click="activeSessionId = s.id"
        >
          <div class="s-icon">💬</div>
          <div class="s-main">
            <div class="s-title">{{ s.title }}</div>
            <div class="s-preview">{{ s.preview }}</div>
          </div>
          <div class="s-meta">
            <span class="s-time">{{ s.time }}</span>
            <span v-if="s.unread" class="s-unread">{{ s.unread }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- 中：对话区 -->
    <section class="chat-area panel">
      <div class="chat-head">
        <div class="ch-info">
          <div class="ch-avatar">AI</div>
          <div>
            <div class="ch-name">量化投顾助手 <span class="ch-tag">GPT 驱动</span></div>
            <div class="ch-status"><span class="dot"></span> 在线 · 实时分析</div>
          </div>
        </div>
        <button class="ch-action" title="清空对话">🗑</button>
      </div>

      <div ref="chatRef" class="chat-body">
        <div
          v-for="(m, i) in messages"
          :key="i"
          class="msg"
          :class="m.role"
        >
          <div class="msg-avatar">
            <template v-if="m.role === 'ai'">AI</template>
            <template v-else>我</template>
          </div>
          <div class="msg-bubble">
            <MiniMarkdown v-if="m.role === 'ai'" :content="m.content || '思考中…'" />
            <template v-else>{{ m.content }}</template>
            <span v-if="m.streaming && !m.content" class="typing">
              <i></i><i></i><i></i>
            </span>
          </div>
          <div class="msg-time">{{ m.time }}</div>
        </div>
      </div>

      <!-- 快捷提问 -->
      <div class="quick-bar">
        <button
          v-for="p in quickPrompts"
          :key="p.key"
          class="quick-btn"
          @click="usePrompt(p)"
        >
          <span>{{ p.icon }}</span>{{ p.text }}
        </button>
      </div>

      <!-- 输入框 -->
      <div class="input-bar">
        <button class="attach" title="附件">📎</button>
        <input
          v-model="input"
          placeholder="向 AI 投顾提问，如：诊断我的持仓…"
          @keydown.enter="send()"
          :disabled="isStreaming"
        />
        <button class="send" :disabled="!input.trim() || isStreaming" @click="send()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </section>

    <!-- 右：能力卡片 -->
    <aside class="panel capabilities">
      <div class="panel-title"><h3>AI 能力</h3></div>
      <div class="cap-list">
        <div class="cap-item">
          <div class="cap-ico brand-bg">📊</div>
          <div>
            <div class="cap-name">持仓诊断</div>
            <div class="cap-desc">深度分析持仓健康度</div>
          </div>
        </div>
        <div class="cap-item">
          <div class="cap-ico purple-bg">🧠</div>
          <div>
            <div class="cap-name">智能选股</div>
            <div class="cap-desc">多因子模型筛选标的</div>
          </div>
        </div>
        <div class="cap-item">
          <div class="cap-ico gold-bg">⚖️</div>
          <div>
            <div class="cap-name">仓位优化</div>
            <div class="cap-desc">核心卫星资产配置</div>
          </div>
        </div>
        <div class="cap-item">
          <div class="cap-ico green-bg">🛡</div>
          <div>
            <div class="cap-name">风险预警</div>
            <div class="cap-desc">实时监控风险敞口</div>
          </div>
        </div>
      </div>

      <div class="tip-card">
        <div class="tip-title">💡 小贴士</div>
        <div class="tip-text">AI 回复基于模拟数据，仅供演示，不构成投资建议。实盘请以专业判断为准。</div>
      </div>
    </aside>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.advisor {
  display: grid;
  grid-template-columns: 260px 1fr 280px;
  gap: $space-5;
  height: calc(100vh - var(--topbar-h) - 48px);
}

/* 会话列表 */
.sessions {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.new-chat {
  font-size: 12px;
  color: $brand;
  padding: 4px 10px;
  border-radius: $radius-md;
  background: $brand-soft;
  &:hover { background: rgba(59,130,246,0.2); }
}
.session-list {
  flex: 1;
  overflow-y: auto;
  padding: $space-2;
}
.session-item {
  display: flex;
  gap: $space-3;
  padding: $space-3;
  border-radius: $radius-md;
  cursor: pointer;
  margin-bottom: 2px;
  &:hover { background: $bg-panel-2; }
  &.active { background: $brand-soft; }
}
.s-icon { font-size: 16px; flex-shrink: 0; }
.s-main {
  flex: 1;
  min-width: 0;
  .s-title {
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .s-preview {
    font-size: 11px;
    color: $text-tertiary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
  }
}
.s-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  .s-time { font-size: 10px; color: $text-tertiary; }
}
.s-unread {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: $danger;
  color: #fff;
  border-radius: 999px;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
}

/* 对话区 */
.chat-area {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-4 $space-5;
  border-bottom: 1px solid $border-subtle;
}
.ch-info {
  display: flex;
  align-items: center;
  gap: $space-3;
}
.ch-avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, $brand, $purple);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
}
.ch-name {
  font-size: 15px;
  font-weight: 600;
  .ch-tag {
    font-size: 10px;
    padding: 1px 6px;
    background: $brand-soft;
    color: $brand;
    border-radius: 4px;
    font-weight: 400;
    margin-left: 4px;
  }
}
.ch-status {
  font-size: 11px;
  color: $success;
  display: flex;
  align-items: center;
  gap: 4px;
  .dot {
    width: 6px; height: 6px;
    background: $success;
    border-radius: 50%;
  }
}
.ch-action {
  width: 32px; height: 32px;
  border-radius: $radius-md;
  font-size: 14px;
  color: $text-tertiary;
  &:hover { background: $bg-panel-2; }
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: $space-5;
  display: flex;
  flex-direction: column;
  gap: $space-5;
}
.msg {
  display: flex;
  gap: $space-3;
  max-width: 85%;
  &.user {
    align-self: flex-end;
    flex-direction: row-reverse;
    .msg-bubble {
      background: $brand;
      color: #fff;
      border-radius: $radius-lg $radius-lg 4px $radius-lg;
    }
    .msg-time { text-align: right; }
  }
  &.ai {
    align-self: flex-start;
    .msg-bubble {
      background: $bg-panel-2;
      border: 1px solid $border-subtle;
      border-radius: $radius-lg $radius-lg $radius-lg 4px;
    }
  }
}
.msg-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}
.msg.user .msg-avatar { background: linear-gradient(135deg, $gold, $warning); color: #fff; }
.msg.ai .msg-avatar { background: linear-gradient(135deg, $brand, $purple); color: #fff; }

.msg-bubble {
  padding: $space-3 $space-4;
  font-size: 14px;
  line-height: 1.6;
}
.msg-time {
  font-size: 10px;
  color: $text-tertiary;
  margin-top: 4px;
  padding: 0 $space-2;
}

.typing {
  display: inline-flex;
  gap: 3px;
  i {
    width: 6px; height: 6px;
    background: $text-tertiary;
    border-radius: 50%;
    animation: blink 1.4s infinite;
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
}
@keyframes blink {
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
}

/* 快捷提问 */
.quick-bar {
  display: flex;
  gap: $space-2;
  padding: $space-2 $space-5;
  overflow-x: auto;
  border-top: 1px solid $border-subtle;
}
.quick-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: $bg-panel-2;
  border: 1px solid $border-subtle;
  border-radius: 999px;
  font-size: 12px;
  color: $text-secondary;
  white-space: nowrap;
  &:hover { color: $brand; border-color: $brand; }
}

/* 输入框 */
.input-bar {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-3 $space-5;
  border-top: 1px solid $border-subtle;
  .attach, .send {
    width: 36px; height: 36px;
    border-radius: $radius-md;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .attach {
    background: $bg-panel-2;
    color: $text-tertiary;
    font-size: 16px;
    &:hover { color: $text-primary; }
  }
  .send {
    background: $brand;
    color: #fff;
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }
  input {
    flex: 1;
    height: 36px;
    padding: 0 $space-3;
    background: $bg-panel-2;
    border: 1px solid $border-subtle;
    border-radius: $radius-md;
    color: $text-primary;
    font-size: 13px;
    outline: none;
    &:focus { border-color: $brand; }
    &::placeholder { color: $text-tertiary; }
  }
}

/* 能力卡片 */
.capabilities {
  display: flex;
  flex-direction: column;
}
.cap-list {
  padding: $space-3;
  display: flex;
  flex-direction: column;
  gap: $space-2;
}
.cap-item {
  display: flex;
  gap: $space-3;
  align-items: center;
  padding: $space-3;
  border-radius: $radius-md;
  &:hover { background: $bg-panel-2; }
}
.cap-ico {
  width: 36px; height: 36px;
  border-radius: $radius-md;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}
.brand-bg { background: $brand-soft; }
.purple-bg { background: rgba(168,85,247,0.12); }
.gold-bg { background: $gold-soft; }
.green-bg { background: rgba(34,197,94,0.12); }
.cap-name { font-size: 13px; font-weight: 600; }
.cap-desc { font-size: 11px; color: $text-tertiary; }

.tip-card {
  margin: $space-3;
  padding: $space-3 $space-4;
  background: $gold-soft;
  border-radius: $radius-md;
  border-left: 3px solid $gold;
  .tip-title { font-size: 12px; font-weight: 600; color: $gold; margin-bottom: 4px; }
  .tip-text { font-size: 11px; color: $text-secondary; line-height: 1.5; }
}
</style>
