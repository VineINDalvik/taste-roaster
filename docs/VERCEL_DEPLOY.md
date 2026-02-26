# Vercel 部署说明

## 当前状态

- **生产地址**: https://vinex.top

## 自定义域名 vinex.top

1. **Vercel 添加域名**：Dashboard → 项目 → Settings → Domains → 添加 `vinex.top`（及 `www.vinex.top` 如需）
2. **DNS**：将域名 CNAME 到 `cname.vercel-dns.com`，或按 Vercel 提示配置
3. **小程序配置**：微信公众平台 → 开发管理 → 开发设置 → 服务器域名 → request合法域名 中添加 `https://vinex.top`
- **Git 仓库**: https://github.com/VineINDalvik/taste-roaster
- 最新代码已推送至 `main` 分支
- 已通过 `vercel --prod` 手动部署完成

## 自动部署设置（推荐）

1. 登录 [Vercel](https://vercel.com) → 进入项目
2. **Settings** → **Git**
3. 若显示 "Connected to GitHub: VineINDalvik/taste-roaster" → 已开启自动部署，每次 `git push main` 会自动部署
4. 若未连接：
   - 点击 **Connect Git Repository**
   - 选择 GitHub → 授权 → 选择 `taste-roaster` 仓库
   - **Root Directory** 设置为 `app`（因为 Next.js 在 app/ 目录）
5. **Settings** → **General** 确认：
   - **Production Branch**: `main`
   - **Root Directory**: `app`

## 手动部署（备用）

```bash
cd 20_Project/毒舌品味官
vercel --prod
```

**必须从项目根（毒舌品味官）运行，不能从 app/ 运行**（见下方 Debug 说明）。

## Debug：Git 未触发部署 / 双层目录问题

### 症状
- `git push` 后 Vercel 无自动部署
- 或 `vercel --prod` 报错：`path "xxx/app/app" does not exist`

### 原因
1. **Root Directory = app**：Vercel 项目设置了 Root Directory 为 `app`，构建时只用 `app/` 子目录。
2. **CLI 路径问题**：从 `app/` 运行 `vercel --prod` 时，CLI 会叠加 Root Directory，变成 `app/app`，路径不存在。
3. **Git Webhook 可能不触发**：部分 Vercel + 子目录配置下，Git 推送的 webhook 可能未正确触发部署。

### 解决
- **CLI 部署**：必须从项目根 `毒舌品味官/` 运行 `vercel --prod`，不能从 `app/` 运行。
- **自动化**：`scripts/deploy.sh` 已加入显式 `vercel --prod` 步骤，每次 deploy 都会强制部署，不依赖 Git webhook。
- **Git 自动部署**：可在 Vercel Dashboard → Settings → Git 检查连接；若仍不触发，可依赖 deploy 脚本的显式部署。

## 构建说明

项目使用 `next build --webpack`（因 Turbopack 对中文路径兼容问题）。`package.json` 中 `build` 和 `vercel-build` 已配置。
