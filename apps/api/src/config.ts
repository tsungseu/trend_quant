// 运行期配置：从环境变量读取，缺失时给本地开发兜底。
// 密钥类变量绝不打印到日志。

import 'dotenv/config'

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback
  if (v === undefined) {
    // 非致命：health 路由仍可用，但 KB/chat 路由会返回 503
    // 生产部署必须显式提供，否则启动期日志告警
  }
  return v ?? ''
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  // Clerk：前端签名后的 session JWT 在此校验
  clerkSecretKey: required('CLERK_SECRET_KEY'),
  clerkPublishableKey: required('CLERK_PUBLISHABLE_KEY'),
  // Qdrant Cloud 或本地容器
  qdrantUrl: required('QDRANT_URL', 'http://localhost:6333'),
  qdrantApiKey: process.env.QDRANT_API_KEY ?? '',
  // OpenAI（仅后端调用，密钥不入前端）
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  // 对象存储（本地 MinIO 或 S3/R2）
  s3Endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
  s3Bucket: process.env.S3_BUCKET ?? 'trendquant-kb',
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
  s3Region: process.env.S3_REGION ?? 'us-east-1',
  // 允许的前端来源（CORS）
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
}

export function isConfigured(): { ok: boolean; missing: string[] } {
  const missing: string[] = []
  if (!config.clerkSecretKey) missing.push('CLERK_SECRET_KEY')
  if (!config.qdrantUrl) missing.push('QDRANT_URL')
  return { ok: missing.length === 0, missing }
}
