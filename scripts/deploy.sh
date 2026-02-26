#!/usr/bin/env bash
# 毒舌品味官：两端编译 + 提交 + 推送（触发 Vercel 部署）
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(cd "$PROJECT_DIR" && git rev-parse --show-toplevel 2>/dev/null || echo "$PROJECT_DIR")"

COMMIT_MSG="${1:-chore(毒舌品味官): build and deploy}"

echo "==> 1/5 编译 Web (Next.js)..."
(cd "$PROJECT_DIR/app" && npm run build)

echo "==> 2/5 编译小程序 (Taro)..."
(cd "$PROJECT_DIR/miniprogram" && npm run build:weapp)

echo "==> 3/5 提交到 Git..."
cd "$REPO_ROOT"
PROJECT_PATH="${PROJECT_DIR#$REPO_ROOT/}"
[ -z "$PROJECT_PATH" ] && PROJECT_PATH="."
git add "$PROJECT_PATH"
if git diff --staged --quiet; then
  echo "无变更可提交，跳过 commit/push"
  exit 0
fi
git commit -m "$COMMIT_MSG"

echo "==> 4/5 推送到 GitHub..."
git push

echo "==> 5/5 显式部署到 Vercel（因 Root Directory=app，Git webhook 可能不触发）..."
(cd "$PROJECT_DIR" && vercel --prod)

echo "✓ 完成：已提交、推送并部署至 https://vinex.top"
