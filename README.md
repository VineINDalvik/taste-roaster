---
type: project
status: active
area: "[[商业化+相关创业产品idea+Agent]]"
tags:
  - 创业
  - AI
  - 小程序
created: 2026-02-22
---
# 毒舌品味官

用 AI 把你的豆瓣书影音记录变成一份"又准又毒的品味人格报告"。

## 快速启动

```bash
cd app
cp .env.example .env.local
# 编辑 .env.local 填入你的 OpenAI API Key
npm install
npm run dev
```

访问 http://localhost:3000

## 功能

- **截图解析**：上传豆瓣截图，AI自动识别书影音列表
- **手动输入**：直接输入书名/电影名/音乐名
- **品味鉴定**：生成品味人格标签 + 毒舌评语 + 雷达图
- **分享卡片**：精美报告卡片，一键保存/分享
- **完整报告**（付费）：深度分析 + 品味时间线 + 盲区推荐

## 技术栈

- Next.js 16 + TypeScript + Tailwind CSS
- OpenAI GPT-4o（截图解析）+ GPT-4o-mini（报告生成）
- html2canvas（分享卡片导出）

## 相关链接

- [[轻量级AI小应用创业Ideas]]
- [[商业化+相关创业产品idea+Agent]]
