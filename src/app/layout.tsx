import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "文化 MBTI | 你的品味是什么人格",
  description: "输入豆瓣ID，AI从你的书影音数据推导你的MBTI人格类型",
  openGraph: {
    title: "文化 MBTI | 你的品味是什么人格",
    description: "你读的书、看的电影、听的音乐，暴露了你是INTJ还是ENFP",
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
