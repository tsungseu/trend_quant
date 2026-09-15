import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    // 集成测试需要 Docker（Qdrant 容器）；无 Docker 环境自动跳过
    exclude: ['test/integration/**/*.test.ts', 'node_modules', 'dist'],
  },
})
