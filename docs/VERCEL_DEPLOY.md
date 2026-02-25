# Vercel 部署说明

## 当前状态

- **生产地址**: https://app-theta-puce.vercel.app
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

## 构建说明

项目使用 `next build --webpack`（因 Turbopack 对中文路径兼容问题）。`package.json` 中 `build` 和 `vercel-build` 已配置。
