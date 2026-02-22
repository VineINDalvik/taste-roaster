import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "毒舌品味官 | AI品味鉴定",
  description: "上传你的豆瓣记录，让AI用最毒舌的方式鉴定你的书影音品味",
  openGraph: {
    title: "毒舌品味官 | AI品味鉴定",
    description: "你的品味经得起AI的毒舌吗？",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen gradient-bg">{children}</body>
    </html>
  );
}
