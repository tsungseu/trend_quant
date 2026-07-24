<script setup>
import { computed, watch } from 'vue'
import VChart from 'vue-echarts'
import { useThemeStore } from '@/stores/theme'

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: String, default: '320px' },
  autoresize: { type: Boolean, default: true },
})

const theme = useThemeStore()

// 读取当前主题的 CSS 变量，图表配色随主题变化
const readVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim()

const themeColors = computed(() => {
  // 依赖 theme.theme 触发重算
  void theme.theme
  return {
    text: readVar('--text-secondary') || '#9aa7c2',
    tooltipBg: readVar('--chart-tooltip-bg') || 'rgba(22,29,46,.96)',
    axis: readVar('--chart-axis') || 'rgba(148,163,184,.15)',
  }
})

const merged = computed(() => ({
  backgroundColor: 'transparent',
  textStyle: {
    color: themeColors.value.text,
    fontFamily: "'JetBrains Mono','SF Mono',monospace",
  },
  grid: {
    left: 12,
    right: 16,
    top: 28,
    bottom: 12,
    containLabel: true,
  },
  tooltip: {
    backgroundColor: themeColors.value.tooltipBg,
    borderColor: themeColors.value.axis,
    borderWidth: 1,
    textStyle: { color: themeColors.value.text, fontSize: 12 },
    axisPointer: {
      lineStyle: { color: themeColors.value.axis, type: 'dashed' },
      label: { backgroundColor: readVar('--bg-elevated') || '#212c44' },
    },
  },
  ...props.option,
}))
</script>

<template>
  <div class="echart-wrap">
    <v-chart
      class="chart"
      :option="merged"
      :autoresize="autoresize"
      :update-options="{ notMerge: false }"
      :style="{ height }"
    />
  </div>
</template>

<style lang="scss" scoped>
.echart-wrap {
  width: 100%;
}
.chart {
  width: 100%;
}
</style>
