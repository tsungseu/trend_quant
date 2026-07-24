<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { searchFunds } from '@/mock/fundCatalog'
import { useFundsStore } from '@/stores/funds'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const store = useFundsStore()
const keyword = ref('')
const inputRef = ref(null)

const results = computed(() => searchFunds(keyword.value))

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      keyword.value = ''
      nextTick(() => inputRef.value?.focus())
    }
  }
)

function close() {
  emit('update:modelValue', false)
}

function toggle(code) {
  store.toggleWatch(code)
}

function isAdded(code) {
  return store.isWatched(code)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="modelValue" class="mask" @click.self="close">
        <div class="dialog panel">
          <div class="dlg-head">
            <h3>添加自选基金</h3>
            <button class="close" @click="close">✕</button>
          </div>
          <div class="dlg-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input ref="inputRef" v-model="keyword" placeholder="输入基金代码 / 名称 / 主题，如 标普500、019305、半导体" />
          </div>
          <div class="dlg-body">
            <div class="result-hint muted">
              {{ keyword ? `搜索结果 ${results.length} 只` : '热门基金' }}
            </div>
            <ul class="result-list">
              <li v-for="f in results" :key="f.code" class="result-item">
                <div class="r-info">
                  <div class="r-name">
                    {{ f.short }}
                    <span class="r-code num">{{ f.code }}</span>
                    <span v-if="f.isCore" class="r-tag">已接入</span>
                  </div>
                  <div class="r-sub muted">{{ f.name }}</div>
                  <div class="r-meta">
                    <span class="chip">{{ f.type }}</span>
                    <span class="chip">{{ f.theme }}</span>
                  </div>
                </div>
                <button
                  class="r-add"
                  :class="{ added: isAdded(f.code) }"
                  @click="toggle(f.code)"
                >
                  {{ isAdded(f.code) ? '✓ 已添加' : '+ 自选' }}
                </button>
              </li>
              <li v-if="!results.length" class="empty">
                <div class="empty-ico">🔍</div>
                <div>未找到匹配的基金</div>
                <div class="muted">试试输入代码或简称</div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
  z-index: 100;
}
.dialog {
  width: 560px;
  max-width: 92vw;
  max-height: 76vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.dlg-head {
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
.dlg-search {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin: $space-4 $space-6 0;
  padding: 0 $space-3;
  height: 40px;
  background: $bg-panel-2;
  border: 1px solid $border-subtle;
  border-radius: $radius-md;
  color: $text-tertiary;
  input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: $text-primary;
    font-size: 13px;
    &::placeholder { color: $text-tertiary; }
  }
}
.dlg-body {
  flex: 1;
  overflow-y: auto;
  padding: $space-3 $space-4 $space-5;
}
.result-hint {
  font-size: 11px;
  padding: $space-2 $space-3;
}
.result-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.result-item {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-3;
  border-radius: $radius-md;
  &:hover { background: $bg-panel-2; }
}
.r-info { flex: 1; min-width: 0; }
.r-name {
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: $space-2;
  .r-code {
    font-size: 11px;
    color: $text-tertiary;
    font-weight: 400;
    font-family: 'JetBrains Mono', monospace;
  }
  .r-tag {
    font-size: 10px;
    padding: 1px 5px;
    background: $brand-soft;
    color: $brand;
    border-radius: 3px;
    font-weight: 500;
  }
}
.r-sub {
  font-size: 11px;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.r-meta {
  display: flex;
  gap: $space-2;
  margin-top: 4px;
  .chip {
    font-size: 10px;
    padding: 1px 6px;
    background: $bg-panel-2;
    border-radius: 3px;
    color: $text-secondary;
  }
}
.r-add {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: $radius-md;
  font-size: 12px;
  font-weight: 500;
  background: $brand;
  color: #fff;
  transition: $transition-fast;
  &:hover { background: $brand-hover; }
  &.added {
    background: $bg-panel-2;
    color: $success;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }
}
.empty {
  text-align: center;
  padding: $space-10 $space-5;
  font-size: 14px;
  color: $text-secondary;
  .empty-ico { font-size: 40px; margin-bottom: $space-3; }
  .muted { font-size: 12px; margin-top: 4px; }
}

.dialog-enter-active, .dialog-leave-active {
  transition: opacity 0.2s $ease;
  .dialog { transition: transform 0.25s $ease, opacity 0.2s $ease; }
}
.dialog-enter-from, .dialog-leave-to {
  opacity: 0;
  .dialog { transform: translateY(-16px) scale(0.98); opacity: 0; }
}
</style>
