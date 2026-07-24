<script setup>
import { computed } from 'vue'

// 极简 Markdown 渲染器：标题/粗体/列表/表格/代码/引用/分隔线
// 不引入外部依赖，覆盖投顾回复所需语法
const props = defineProps({
  content: { type: String, default: '' },
})

const html = computed(() => render(props.content))

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function inline(s) {
  return s
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

function render(md) {
  const lines = escapeHtml(md).split('\n')
  const out = []
  let i = 0
  let inTable = false
  let tableRows = []

  const flushTable = () => {
    if (!tableRows.length) return
    const [head, , ...body] = tableRows
    const parseRow = (r) =>
      r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
    const headCells = parseRow(head)
    const bodyHtml = body
      .map((r) => '<tr>' + parseRow(r).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>')
      .join('')
    out.push(
      '<table class="md-table"><thead><tr>' +
        headCells.map((c) => `<th>${inline(c)}</th>`).join('') +
        '</tr></thead><tbody>' +
        bodyHtml +
        '</tbody></table>'
    )
    tableRows = []
  }

  while (i < lines.length) {
    const line = lines[i]

    // 代码块
    if (line.trim().startsWith('```')) {
      const code = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i])
        i++
      }
      out.push(`<pre class="md-code"><code>${code.join('\n')}</code></pre>`)
      i++
      continue
    }

    // 表格（连续的 | 行）
    if (/^\s*\|.*\|\s*$/.test(line)) {
      tableRows.push(line)
      i++
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        tableRows.push(lines[i])
        i++
      }
      flushTable()
      inTable = false
      continue
    }

    // 标题
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      const level = h[1].length
      out.push(`<h${level}>${inline(h[2])}</h${level}>`)
      i++
      continue
    }

    // 分隔线
    if (/^---+$/.test(line.trim())) {
      out.push('<hr class="md-hr" />')
      i++
      continue
    }

    // 引用
    if (/^>\s?/.test(line)) {
      const quote = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      out.push(`<blockquote class="md-quote">${inline(quote.join(' '))}</blockquote>`)
      continue
    }

    // 无序列表
    if (/^[-*]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^[-*]\s+/, ''))}</li>`)
        i++
      }
      out.push(`<ul class="md-ul">${items.join('')}</ul>`)
      continue
    }

    // 有序列表
    if (/^\d+\.\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\d+\.\s+/, ''))}</li>`)
        i++
      }
      out.push(`<ol class="md-ol">${items.join('')}</ol>`)
      continue
    }

    // 空行
    if (line.trim() === '') {
      i++
      continue
    }

    // 普通段落
    out.push(`<p>${inline(line)}</p>`)
    i++
  }

  return out.join('')
}
</script>

<template>
  <div class="md-body" v-html="html"></div>
</template>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;

.md-body {
  font-size: 14px;
  line-height: 1.7;
  color: $text-primary;

  :deep(h1), :deep(h2), :deep(h3), :deep(h4) {
    font-weight: 600;
    margin: 12px 0 8px;
    line-height: 1.4;
  }
  :deep(h1) { font-size: 18px; }
  :deep(h2) { font-size: 16px; }
  :deep(h3) { font-size: 15px; color: $brand; }
  :deep(h4) { font-size: 14px; }

  :deep(p) { margin: 6px 0; }

  :deep(strong) { color: $text-primary; font-weight: 600; }

  :deep(.md-ul), :deep(.md-ol) {
    margin: 6px 0;
    padding-left: 20px;
    li { margin: 3px 0; }
  }

  :deep(.md-table) {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 13px;
    th, td {
      padding: 6px 10px;
      border: 1px solid $border-subtle;
      text-align: left;
    }
    th {
      background: $bg-panel-2;
      color: $text-secondary;
      font-weight: 600;
    }
  }

  :deep(.md-code) {
    background: $bg-panel-2;
    border: 1px solid $border-subtle;
    border-radius: $radius-md;
    padding: $space-3;
    margin: 8px 0;
    overflow-x: auto;
    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: $cyan;
    }
  }

  :deep(code) {
    background: $bg-panel-2;
    padding: 1px 5px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: $cyan;
  }

  :deep(.md-quote) {
    border-left: 3px solid $brand;
    background: $brand-soft;
    padding: $space-2 $space-3;
    margin: 8px 0;
    border-radius: 0 $radius-md $radius-md 0;
    color: $text-secondary;
  }

  :deep(.md-hr) {
    border: none;
    border-top: 1px solid $border-subtle;
    margin: 10px 0;
  }
}
</style>
