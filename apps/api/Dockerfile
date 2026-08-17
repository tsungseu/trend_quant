# 多阶段构建：构建期用 node + tsc，运行期只带产物与生产依赖。
# 根目录构建以利用 npm workspaces 安装本地包（packages/rag-client 等）。

FROM node:20-alpine AS builder
WORKDIR /app
# 先拷工作区清单，利用 docker 缓存
COPY package.json package-lock.json* ./
COPY tsconfig.base.json* ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN npm install --workspace=@trendquant/api --include-workspace-root --ignore-scripts && \
    npm run build --workspace=@trendquant/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json
EXPOSE 8080
CMD ["node", "dist/index.js"]
