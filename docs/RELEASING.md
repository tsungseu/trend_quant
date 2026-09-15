# 构建与发布

## 版本规则

产品发布使用根 `package.json` 的语义化版本；官网和 Studio 同步版本，其他工作区保持独立版本。修改清单后同步 `package-lock.json`，并更新根 `CHANGELOG.md`。

## 发布检查

```sh
npm ci
npm run check
npm run test:api
npm run build:api
npm run test -w @trendquant/gateway-client
npm run test -w @trendquant/rag-client
npm run release:pack
```

需要 Node.js 20+、npm、Git 和系统 `tar`（Windows 10/11 自带）。先提交版本变更，再执行打包，确保清单内的 commit 与发布标签一致。

`dist/release-v<version>/` 包含静态站点压缩包、`SHA256SUMS` 和 `release-manifest.json`。打包命令重新构建三个前端，不包含 node_modules、环境文件或服务端密钥。GitHub Release 自动提供标签对应的源代码归档，后端从该源码构建。

## 部署静态包

解压 `trendquant-v<version>-static.tar.gz`，将解压目录作为 HTTP 站点根目录：

| 入口 | 路径 |
| --- | --- |
| 官网 | `/` |
| MindQuant Agent | `/#/agent` |
| MindQuant Studio | `/studio/#/app` |
| 知识库管理台 | `/admin/` |

例如使用 Python 预览：`python -m http.server 8090 --directory <解压目录>`。通过 HTTP 打开，不要直接双击 HTML。预编译包面向域名根路径部署；部署到 GitHub Pages 子路径时须按对应路径重新构建，不能直接搬移此包。

行情默认使用演示快照；Agent 独立页仍是界面预览。管理台与 Studio 知识库/网关入口使用 `/api`，静态包本身不运行 API。需要这些服务时，从同标签源码安装依赖、构建并启动 `apps/api`，按项目 README 配置身份服务、Qdrant 和模型服务，再将 `/api/*` 反向代理到后端 `/*`（移除 `/api` 前缀）。未接入服务时，相关页面会显示不可用/错误状态。

真实行情使用自行部署的数据代理，并按 `apps/terminal/.env.example` 配置后重新构建。API 运行配置使用服务端环境变量，详见 `apps/api/.env.example`。

## PR 与 Release

发布分支向 `main` 创建 PR；版本标签指向已验证的同一提交。PR 未合并时，Release 的说明须明确来自发布分支，GitHub Pages 不会因此自动更新。现有 Pages 工作流仅在 `main` 推送或手动触发时部署 Studio。

创建 Release 时上传静态压缩包、校验文件和版本清单，并从 changelog 编写发布说明。下载后可用 `sha256sum -c SHA256SUMS`，或 PowerShell `Get-FileHash -Algorithm SHA256 <压缩包>` 校验完整性。
