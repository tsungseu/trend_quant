import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // 本地开发 base='/'；生产 web 占据站点根（terminal 迁至 /terminal/ 子路径），
    // 可用 VITE_PUBLIC_BASE 覆盖（注意根路径不能与终端重叠）
    base: env.VITE_PUBLIC_BASE || '/',
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5174,
      host: true,
      open: true,
    },
  }
})
