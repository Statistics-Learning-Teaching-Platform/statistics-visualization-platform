# StatMind 题库

题库把人工筛选、课件知识点提取、AI 辅助组卷和 DOCX 导出放在同一个工作区。正式组卷索引只包含通过结构化审核门禁的完整题目；AI 新题始终保持待审核状态，不会直接进入正式题库。

当前正式题库不是 13 章完整覆盖：Ch11 只有 2 道通过审核的题目，Ch12 为 0 道。界面不会把空章节显示为可选筛选项，生成和发布校验会显式报告低覆盖章节；AI 待审核草稿不计入正式覆盖数量。

## Getting Started

先配置数据库运行时密钥，再启动开发服务器：

```bash
cp .env.example .env.local
npm run dev
```

访问 [http://localhost:3200/st-qselector](http://localhost:3200/st-qselector)。

## AI 与课件解析

默认 AI 地址与模型已经指向项目约定的服务，也可用 `STAT_AI_API_URL` 和 `STAT_AI_MODEL` 覆盖。所有 AI 路由都要求登录；知识提取和组卷仅允许教师或超级管理员调用。

AI 不可用时，课件知识点提取会回退到内置统计学分类。支持 PDF、PPTX、DOCX、TXT 和 Markdown，单文件不超过 15 MB，并限制解压体积、页数和解析时间。

## Cloudflare 构建

```bash
npm run lint
npm run typecheck
npm run build:cloudflare
npm run preview:cloudflare
```

普通 Node.js 本地开发通过 `STAT_DB_PASSWORD` 提供密码；Cloudflare Worker 只使用 `wrangler.jsonc` 声明的 `HYPERDRIVE` binding，不需要也不会回退读取数据库密码。不要把密码、Hyperdrive connection string 写入 YAML、Wrangler 配置或仓库；`config/database.yaml` 只保存非敏感直连参数和本地密钥变量名。

首次初始化先按 `bootstrap.env.example` 提供数据库管理员密码、应用账号密码和三个互不相同的临时账号密码，再运行 `npm run db:bootstrap`。脚本按文件名顺序应用 `database/NNN_*.sql`，同步经过哈希校验的私有附件，并强制所有初始账号首次登录改密。每次新增 migration 后应再次执行同一命令；migration 必须保持幂等。

附件和完整答案不放在 `public/`。Cloudflare 构建只把题库索引编译进服务端路由，附件由 PostgreSQL `private_assets` 表在会话鉴权后返回。更新题目元数据或附件前必须完成复审，并显式执行 `node scripts/generate-reviewed-index.mjs --write-review-lock` 更新完整审核锁；普通构建只验证锁，不会自动接受变更。

`/st-qselector/*` 已路由到题库 Worker，`STAT_ALLOWED_ORIGINS` 必须与正式域名一致。Worker 每次数据库操作创建请求范围内的 `pg.Client`，Hyperdrive 在靠近源库的位置负责连接复用；用于认证、会话和权限的 Hyperdrive 配置必须关闭查询缓存，避免返回过期授权状态。本地 Wrangler 预览可通过 `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` 注入被忽略的测试连接串。

匿名登录限流默认不信任客户端提供的代理头。Cloudflare Worker 设置
`STAT_TRUSTED_PROXY=cloudflare` 后只读取 Cloudflare 覆盖写入的
`CF-Connecting-IP`；非 Cloudflare 反向代理只有在确认入口会清洗客户端
`X-Forwarded-For` 后，才可显式设置 `STAT_TRUSTED_PROXY=x-forwarded-for`。

当前 Hyperdrive 到 PostgreSQL 的链路要求 TLS，VPC Service 在测试阶段允许数据库的自签名证书；这不会修改 PostgreSQL 的全局接入策略，也不会停用已有的非 TLS 直连。不要为了启用 Hyperdrive 而把数据库改成仅接受 TLS。若以后为公开题库增加查询缓存，应使用第二个 Hyperdrive binding；登录、会话、权限、管理和写后读继续走禁用缓存的 `HYPERDRIVE`。
