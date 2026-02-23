#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  书影音 MBTI — 一键部署${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 1. Git commit & push
echo -e "${YELLOW}[1/3] Git commit & push...${NC}"
cd "$ROOT"
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  read -p "  输入 commit message (回车使用默认): " MSG
  MSG="${MSG:-update: deploy $(date +%Y-%m-%d_%H:%M)}"
  git commit -m "$MSG"
  git push
  echo -e "${GREEN}  ✓ Git push 完成${NC}"
else
  echo -e "  无更改需要提交，跳过 git push"
fi
echo ""

# 2. Vercel deploy (Web App)
echo -e "${YELLOW}[2/3] Vercel 部署 (Web App)...${NC}"
cd "$ROOT/app"
if command -v vercel &> /dev/null; then
  vercel --prod --yes
  echo -e "${GREEN}  ✓ Vercel 部署完成${NC}"
else
  echo -e "${RED}  ✗ vercel CLI 未安装，请运行: npm i -g vercel${NC}"
  echo -e "  跳过 Vercel 部署"
fi
echo ""

# 3. Mini Program build
echo -e "${YELLOW}[3/3] 微信小程序编译...${NC}"
cd "$ROOT/miniprogram"
if [ ! -d "node_modules" ]; then
  echo "  安装依赖..."
  npm install
fi
npx taro build --type weapp
echo -e "${GREEN}  ✓ 小程序编译完成${NC}"
echo -e "  → 请在微信开发者工具中打开 ${ROOT}/miniprogram 并上传"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "  Web App: 已部署到 Vercel (自动绑定域名)"
echo "  小程序:  请在微信开发者工具中上传新版本"
echo ""
