import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import https from 'node:https'

// 东财对 keep-alive 并发连接会 socket hang up，每个代理新建短连接
const emAgent = new https.Agent({ keepAlive: false })

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // 本地开发 base='/'；GitHub Pages 默认部署在 /trend_quant/ 子路径，可用 VITE_PUBLIC_BASE 覆盖
    base: env.VITE_PUBLIC_BASE || (process.env.NODE_ENV === 'production' ? '/trend_quant/' : '/'),
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) return 'charts'
            if (id.includes('node_modules/vue') || id.includes('node_modules/pinia') || id.includes('node_modules/vue-router')) return 'vue-vendor'
            if (id.includes('node_modules')) return 'vendor'
          },
        },
      },
    },
    server: {
      port: 5173,
      host: true,
      open: true,
      // 东方财富 dev 反代：仅本地开发有效。生产真实数据请配置 VITE_DATA_MODE=proxy + VITE_DATA_PROXY_BASE。
      // 注意：东财接口普遍校验 Referer，浏览器 JSONP 无法设置 Referer（禁止头），
      // 因此基金净值/估值/搜索也必须走 proxy 注入正确的 Referer。
      proxy: {
        '/em-push2his': {
          target: 'https://push2his.eastmoney.com',
          changeOrigin: true,
          secure: true,
          agent: emAgent,
          headers: {
            'Connection': 'close',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
            'Referer': 'https://quote.eastmoney.com/',
          },
          rewrite: (p) => p.replace(/^\/em-push2his/, ''),
        },
        '/em-fundf10': {
          target: 'https://fundf10.eastmoney.com',
          changeOrigin: true,
          secure: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
            'Referer': 'https://fundf10.eastmoney.com/',
          },
          rewrite: (p) => p.replace(/^\/em-fundf10/, ''),
        },
        // 基金净值 lsjz：api.fund.eastmoney.com 校验 Referer=fundf10.eastmoney.com
        '/em-fund-api': {
          target: 'https://api.fund.eastmoney.com',
          changeOrigin: true,
          secure: true,
          agent: emAgent,
          headers: {
            'Connection': 'close',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
            'Referer': 'https://fundf10.eastmoney.com/',
          },
          rewrite: (p) => p.replace(/^\/em-fund-api/, ''),
        },
        // 基金搜索 FundSearchAPI：fundsuggest.eastmoney.com
        '/em-fund-suggest': {
          target: 'https://fundsuggest.eastmoney.com',
          changeOrigin: true,
          secure: true,
          agent: emAgent,
          headers: {
            'Connection': 'close',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
            'Referer': 'https://fund.eastmoney.com/',
          },
          rewrite: (p) => p.replace(/^\/em-fund-suggest/, ''),
        },
        // 新浪基金估值：stock.finance.sina.com.cn（JSONP 改 proxy fetch）
        '/sina-fund': {
          target: 'https://stock.finance.sina.com.cn',
          changeOrigin: true,
          secure: true,
          agent: emAgent,
          headers: {
            'Connection': 'close',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
            'Referer': 'https://finance.sina.com.cn/',
          },
          rewrite: (p) => p.replace(/^\/sina-fund/, ''),
        },
      },
    }
  }
})
