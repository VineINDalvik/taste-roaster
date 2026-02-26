# Vercel 部署说明

## 当前状态

- **生产地址**：https://db-mbti.vinex.top
- **备用地址**：https://vinex.top（若 Vercel 中同时配置了两个域名，会指向同一部署）

## 为什么 db-mbti 看起来没更新？

**vinex.top 和 db-mbti.vinex.top 只有在都添加到 Vercel 项目时才会指向同一部署。**

若 db-mbti 未在 Vercel 中添加：
- 可能指向旧服务器 / 其他服务 / 404
- 每次 deploy 只会更新 vinex.top，db-mbti 不会变

**处理方式**：在 Vercel 中把 db-mbti.vinex.top 加为域名（见下方）

## 自定义域名 db-mbti.vinex.top

1. **Vercel 添加域名**：Dashboard → 项目 → Settings → **Domains** → **Add** → 输入 `db-mbti.vinex.top`
2. **DNS**：按 Vercel 提示，将 `db-mbti` 子域 CNAME 到 `cname.vercel-dns.com`
3. **等待生效**：DNS 生效后，db-mbti 与 vinex.top 会指向同一最新部署
4. **小程序**：微信公众平台 → 开发设置 → request合法域名 → `https://db-mbti.vinex.top`

## 修复 Git 不自动部署：Deploy Hook + GitHub Actions

若 `git push` 后 Vercel 未触发部署，按以下步骤配置：

1. **Vercel 创建 Deploy Hook**
   - 登录 [Vercel](https://vercel.com) → 进入项目 `app`
   - **Settings** → **Git** → **Deploy Hooks** → **Create Hook**
   - 名称：`GitHub Actions`，分支：`main`
   - 复制生成的 Hook URL

2. **GitHub 添加 Secret**
   - 打开 [taste-roaster](https://github.com/VineINDalvik/taste-roaster) → **Settings** → **Secrets and variables** → **Actions**
   - **New repository secret**：`VERCEL_DEPLOY_HOOK` = 上述 Hook URL

3. 完成：之后每次 `git push main`，`.github/workflows/deploy.yml` 会调用 Hook 触发 Vercel 部署

## 手动部署

```bash
cd 20_Project/毒舌品味官
npm run deploy   # 编译 + 提交 + 推送 + vercel --prod --force
```

或仅部署：
```bash
vercel --prod --force
```

**必须从项目根（毒舌品味官）运行**，不能从 `app/` 运行。

## Debug：Root Directory / 路径问题

- **Root Directory**：Vercel 项目应设置为 `app`（Next.js 在 app/ 目录）
- **Production Branch**：`main`
- 若 `vercel --prod` 报错 `path "xxx/app/app"`：从 `毒舌品味官/` 运行，而非 `app/`

## 构建说明

项目使用 `next build --webpack`（因 Turbopack 对中文路径兼容问题）。`package.json` 中 `build` 和 `vercel-build` 已配置。
