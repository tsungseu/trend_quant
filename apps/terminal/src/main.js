import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// 全局样式
import './styles/tokens.scss'
import './styles/base.scss'

// ECharts 按需注册
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import {
  LineChart,
  BarChart,
  CandlestickChart,
  PieChart,
  HeatmapChart,
  ScatterChart
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkPointComponent,
  VisualMapComponent,
  CalendarComponent
} from 'echarts/components'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  CandlestickChart,
  PieChart,
  HeatmapChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkPointComponent,
  VisualMapComponent,
  CalendarComponent
])

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
