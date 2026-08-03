<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { sessions as initialSessions, quickPrompts, matchReply } from '@/mock/advisor'
import MiniMarkdown from '@/components/MiniMarkdown.vue'
import { useLlmStore } from '@/stores/llm'
import { streamChat } from '@/api/llm'

const llmStore = useLlmStore()

// ---- 投顾运行时选项：当前模型 + 思考程度（持久化到 localStorage）----
const RT_KEY = 'advisor.runtime'
const EFFORT_LEVELS = [
  { value: 'low', label: 'Low', desc: '快速直答' },
  { value: 'high', label: 'High', desc: '标准推理' },
  { value: 'max', label: 'Max', desc: '深度推理' },
]
function loadRuntime() {
  try {
    const raw = localStorage.getItem(RT_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}
const runtime = ref(loadRuntime())
function saveRuntime() {
  try { localStorage.setItem(RT_KEY, JSON.stringify(runtime.value)) } catch {}
}
// 当前可选模型列表（来自 activeProvider 的 models，已是对象数组）
const availableModels = computed(() => {
  const p = llmStore.activeProvider
  if (p?.models?.length) return p.models
  // 兼容：models 为空但 model 字段存在
  return p?.model ? [{ name: p.model, modelId: p.model, contextWindow: 0 }] : []
})
// 当前选中模型的 modelId（优先 runtime 记录，回退 provider 默认）
const currentModelId = computed(() => {
  const ids = availableModels.value.map((m) => m.modelId)
  const saved = runtime.value.model
  return saved && ids.includes(saved) ? saved : (ids[0] || llmStore.activeProvider?.model || '')
})
function selectModel(modelId) {
  runtime.value.model = modelId
  saveRuntime()
}
// 当前选中模型对象（用于展示 contextWindow 等）
const currentModelObj = computed(() =>
  availableModels.value.find((m) => m.modelId === currentModelId.value) || null
)
const currentEffort = computed({
  get: () => runtime.value.effort || 'low',
  set: (v) => { runtime.value.effort = v; saveRuntime() },
})

// 会话列表：从 mock 初始化，发送/新建时实时更新
const sessions = ref(JSON.parse(JSON.stringify(initialSessions)))
const activeSessionId = ref('s1')
const input = ref('')
const isStreaming = ref(false)
const chatRef = ref(null)
let streamTimer = null
let abortCtrl = null
// mock 流式 Promise 的 resolve；中断时主动 resolve，避免 await 永久挂起
let mockStreamResolve = null

function clearStreamTimer() {
  if (streamTimer) {
    clearInterval(streamTimer)
    streamTimer = null
  }
  if (abortCtrl) {
    abortCtrl.abort()
    abortCtrl = null
  }
  // 主动结束挂起的 mock 流式 await，防止 Promise/闭包泄漏与 finally 不执行
  if (mockStreamResolve) {
    const resolve = mockStreamResolve
    mockStreamResolve = null
    resolve()
  }
}

// 当前会话消息（按会话 id 分桶持久化在内存中）
const GREETING =
  '您好！我是您的 AI 投顾助手 🤖\n\n我可以帮您：\n- **诊断持仓** 健康度\n- **分析市场** 走势\n- **优化仓位** 配置\n- **推荐量化** 策略\n\n请问有什么可以帮您？'

const messagesBySession = ref({
  s1: [
    {
      role: 'ai',
      content: GREETING,
      time: '09:42',
    },
  ],
})

const messages = computed(() => messagesBySession.value[activeSessionId.value] || [])

function now() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function scrollToBottom() {
  nextTick(() => {
    if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight
  })
}

// 更新左侧会话列表：标题取用户首条消息，最新会话置顶
function updateSessionMeta(sid, userText) {
  const list = sessions.value
  let item = list.find((x) => x.id === sid)
  if (!item) {
    item = { id: sid, title: userText, preview: '', time: '刚刚', unread: 0 }
    list.unshift(item)
  } else {
    item.title = userText
    const idx = list.indexOf(item)
    if (idx > 0) {
      list.splice(idx, 1)
      list.unshift(item)
    }
  }
  item.preview = '对话进行中…'
  item.time = now()
}

// 系统提示词：约束投顾为量化研究/价格提醒，不构成投资建议
const SYSTEM_PROMPT =
  '你是"趋势量化"的 AI 投顾助手。只做量化研究与价格提醒，输出以中文为主、结构化 Markdown。' +
  '所有结论须声明"不构成投资建议"。可结合持仓、市场、风险、策略等主题回答。'

// 真实 LLM 流式调用
async function streamFromLlm(q, aiMsg) {
  const provider = llmStore.activeProvider
  // model 优先用投顾顶部选中的；回退 provider 默认/列表首个
  const model = currentModelId.value || provider?.model || provider?.models?.[0]?.modelId || ''
  if (!provider || !provider.baseUrl || !model) {
    throw new Error('未配置 LLM 供应商（缺少 Base URL 或模型）')
  }
  abortCtrl = new AbortController()
  inThink = false // 重置 think 过滤状态，避免上一轮残留
  tailBuf = ''
  await streamChat(
    { ...provider, model, reasoningEffort: currentEffort.value },
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: q },
    ],
    (t) => {
      aiMsg.content += stripThink(t)
      scrollToBottom()
    },
    { signal: abortCtrl.signal }
  )
}

// MiniMax / DeepSeek 等模型会在流中输出 <think>...</think> 思考过程，
// 对终端用户无意义且破坏 Markdown 渲染，过滤掉。
// 流式分段到达时 <think> 标签可能跨 chunk，用状态机 + 尾部缓冲处理。
// - inThink: 当前是否在 <think> 块内
// - tailBuf: 末尾可能是不完整标签的残余，缓冲到下一轮再判
let inThink = false
let tailBuf = ''
function stripThink(text) {
  let s = tailBuf + text
  tailBuf = ''
  let out = ''
  let i = 0
  const OPEN = '<think>'
  const CLOSE = '</think>'
  while (i < s.length) {
    if (inThink) {
      // 在 think 内，寻找闭合 </think>
      const closeIdx = s.indexOf(CLOSE, i)
      if (closeIdx >= 0) {
        inThink = false
        i = closeIdx + CLOSE.length
      } else {
        // 本 chunk 内未闭合，剩余全是思考内容。只有当剩余长度 < CLOSE 长度时，
        // 才可能是被拆分的闭合标签前缀，缓冲到下轮；否则整段丢弃。
        const remain = s.slice(i)
        if (remain.length < CLOSE.length) tailBuf = remain
        i = s.length
      }
    } else {
      // 在正文，寻找 <think> 开头
      const openIdx = s.indexOf(OPEN, i)
      if (openIdx >= 0) {
        out += s.slice(i, openIdx)
        inThink = true
        i = openIdx + OPEN.length
      } else {
        // 未找到开头。只有当末尾 < OPEN 长度且可能是不完整标签时才缓冲。
        const remain = s.slice(i)
        // 找最后一个 '<'，它可能是不完整 <think> 的开头
        const lastLt = remain.lastIndexOf('<')
        if (lastLt >= 0 && remain.length - lastLt < OPEN.length && OPEN.startsWith(remain.slice(lastLt))) {
          out += remain.slice(0, lastLt)
          tailBuf = remain.slice(lastLt)
        } else {
          out += remain
        }
        i = s.length
      }
    }
  }
  return out
}

// 发送消息：配置完整则真实流式，否则回退模拟流式回复
async function send(text) {
  const q = (text ?? input.value).trim()
  if (!q || isStreaming.value) return

  const sid = activeSessionId.value || 's1'
  if (!messagesBySession.value[sid]) messagesBySession.value[sid] = []
  messagesBySession.value[sid].push({ role: 'user', content: q, time: now() })
  input.value = ''
  scrollToBottom()

  isStreaming.value = true
  // 添加一条空的 AI 消息，逐字填充
  const aiMsg = { role: 'ai', content: '', time: now(), streaming: true }
  messagesBySession.value[sid].push(aiMsg)
  scrollToBottom()

  // 更新会话列表（标题/预览/置顶）
  updateSessionMeta(sid, q)

  const useReal = llmStore.isConfigured
  try {
    if (useReal) {
      await streamFromLlm(q, aiMsg)
    } else {
      const full = matchReply(q)
      // 流式输出：按词块递增
      const chunks = full.match(/[\s\S]{1,4}/g) || [full]
      let idx = 0
      await new Promise((resolve) => {
        clearStreamTimer()
        // 记录 resolve，供 clearStreamTimer（切换会话/卸载）主动结束本次 await
        mockStreamResolve = resolve
        streamTimer = setInterval(() => {
          aiMsg.content += chunks[idx] || ''
          idx++
          scrollToBottom()
          if (idx >= chunks.length) {
            clearStreamTimer()
          }
        }, 12)
      })
    }
  } catch (e) {
    // 真实调用失败，回退到模拟回复（错误详情不暴露到 UI，避免泄露端点/密钥）
    console.warn('[advisor] real llm failed, fallback to mock:', e?.message)
    aiMsg.content =
      '_（真实模型调用失败，已回退为模拟回复）_ ' + matchReply(q)
  } finally {
    aiMsg.streaming = false
    isStreaming.value = false
  }
}

// 新建对话：清空当前消息并重置为问候语；同时清理会话列表选择
function newChat() {
  clearStreamTimer()
  isStreaming.value = false
  const id = 's' + Date.now()
  messagesBySession.value[id] = [
    {
      role: 'ai',
      content: GREETING,
      time: now(),
    },
  ]
  sessions.value.unshift({
    id,
    title: '新对话',
    preview: '开始与 AI 投顾对话…',
    time: now(),
    unread: 0,
  })
  activeSessionId.value = id
  input.value = ''
  scrollToBottom()
}

function usePrompt(p) {
  send(p.text)
}

// 切换会话时若正在流式输出，先中断旧会话的流，避免串台/卡死输入
watch(activeSessionId, () => {
  clearStreamTimer()
  isStreaming.value = false
})

onMounted(() => {
  // 修正：原 `onMounted(() => scrollToBottom)` 仅把 scrollToBottom 当 effect 回调而非调用它，导致初始不滚动
  scrollToBottom()
})

// 离开页面时清理流式 interval
onUnmounted(clearStreamTimer)
</script>

<template>
  <div class="advisor">
    <!-- 左：会话列表 -->
    <aside class="panel sessions">
      <div class="panel-title">
        <h3>会话历史</h3>
        <button class="new-chat" @click="newChat()">+ 新对话</button>
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
            <div class="ch-name">量化投顾助手 <span class="ch-tag">{{ llmStore.isConfigured ? '真实模型' : 'GPT 驱动' }}</span></div>
            <div class="ch-status"><span class="dot"></span> 在线 · 实时分析</div>
          </div>
        </div>
        <div class="ch-controls">
          <!-- 模型选择 -->
          <select
            v-if="availableModels.length"
            :value="currentModelId"
            class="ctrl-select"
            title="选择模型"
            :disabled="isStreaming"
            @change="selectModel($event.target.value)"
          >
            <option v-for="m in availableModels" :key="m.modelId" :value="m.modelId">
              {{ m.name }}{{ m.contextWindow ? ' · ' + (m.contextWindow >= 1000000 ? (m.contextWindow / 1000000) + 'M' : Math.round(m.contextWindow / 1000) + 'K') : '' }}
            </option>
          </select>
          <!-- 思考程度 low / high / max -->
          <div class="ctrl-effort" v-if="llmStore.isConfigured">
            <button
              v-for="lv in EFFORT_LEVELS"
              :key="lv.value"
              type="button"
              class="effort-btn"
              :class="{ active: currentEffort === lv.value }"
              :title="lv.desc"
              :disabled="isStreaming"
              @click="currentEffort = lv.value"
            >{{ lv.label }}</button>
          </div>
          <button class="ch-action" title="清空对话">🗑</button>
        </div>
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
.ch-controls {
  display: flex;
  align-items: center;
  gap: $space-2;
}
.ctrl-select {
  height: 28px;
  padding: 0 8px;
  background: $bg-panel-2;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  color: $text-primary;
  font-size: 12px;
  outline: none;
  cursor: pointer;
  max-width: 160px;
  &:focus { border-color: $brand; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}
.ctrl-effort {
  display: flex;
  background: $bg-panel-2;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  padding: 2px;
  gap: 2px;
}
.effort-btn {
  height: 22px;
  padding: 0 10px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: $text-tertiary;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all $transition-fast;
  &:hover:not(:disabled) { color: $text-primary; }
  &.active {
    background: $brand;
    color: #fff;
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
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
