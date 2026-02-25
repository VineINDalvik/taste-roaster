# 毒舌品味官 - 部署流程

## 双端一致性

- **Web**: `app/` (Next.js)
- **小程序**: `miniprogram/` (Taro)

每次改动需同时更新两端，保证功能与效果一致。

## 一键部署

在项目根目录执行：

```bash
npm run deploy
```

或自定义提交信息：

```bash
bash scripts/deploy.sh "feat: 添加xxx功能"
```

## 流程说明

1. 编译 Web（Next.js）
2. 编译小程序（Taro → `miniprogram/dist/`）
3. 提交到 Git
4. 推送到 GitHub → 自动触发 Vercel 部署

## 小程序发布

小程序的 `dist/` 不纳入 Git。发布时在微信开发者工具中打开 `miniprogram/dist/` 目录，上传为体验版/正式版。
