import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// 全局样式
// CSS 变量必须经 Vite 原生 CSS 管线引入：Sass 不会内联显式 .css 的 @import，
// tokens.scss 里的 @import './index.css' 在 dev 下会按页面 URL 解析而 404（web/admin 同样单独引入）。
import '@trendquant/design-tokens/index.css'
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
