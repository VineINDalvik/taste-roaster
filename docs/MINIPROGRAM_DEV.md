# 小程序开发与微信开发者工具

## 结论：打开哪个目录？

**打开 `miniprogram/`**（项目根），不要打开 `miniprogram/dist/`。

## 两个目录的区别

| 目录 | 内容 | 用途 |
|------|------|------|
| `miniprogram/` | 源码、配置、cloud 云函数 | 项目根，**在微信开发者工具中打开此目录** |
| `miniprogram/dist/` | Taro 编译后的微信原生格式 | 构建产物，由 `npm run build:weapp` 生成，**不要直接打开** |

## 为何以 miniprogram/ 为准？

1. `miniprogram/project.config.json` 配置了：
   - `miniprogramRoot: "dist/"` — 运行时代码来自 dist/
   - `cloudfunctionRoot: "cloud/functions/"` — 云函数在 miniprogram/cloud/functions/
2. 打开 `miniprogram/` 时，微信会正确加载 dist 中的代码和 cloud 中的云函数。
3. 若打开 `miniprogram/dist/`：云函数路径会错误（找不到 `../cloud/functions/`），云开发相关功能会失效。

## 工作流程

1. 用 Cursor/IDE 编辑 `miniprogram/src/` 下的 TSX、SCSS
2. 运行 `npm run build:weapp` 或 `npm run dev:weapp`（监听模式）
3. 在微信开发者工具中打开 `miniprogram/` 目录，预览、调试、上传

## 重要：不要编辑 dist/

`dist/` 下的所有文件都会在每次 `build:weapp` 时被覆盖。源码是 `miniprogram/src/`，只改 src 里的文件。
