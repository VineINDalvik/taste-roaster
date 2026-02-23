"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PROGRESS_MESSAGES = [
  "正在潜入ta的豆瓣主页...",
  "采样ta读过的书...",
  "采样ta看过的电影...",
  "采样ta听过的音乐...",
  "AI 正在分析 MBTI 四维度...",
  "从品味中推导人格类型...",
  "生成书影音 MBTI 报告...",
];

export default function UploadPage() {
  const router = useRouter();
  const [doubanId, setDoubanId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressIdx, setProgressIdx] = useState(0);

  const handleAnalyze = async () => {
    if (!doubanId.trim()) return;
    setIsLoading(true);
    setError(null);
    setProgressIdx(0);

    const interval = setInterval(() => {
      setProgressIdx((prev) =>
        prev < PROGRESS_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 3000);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doubanId: doubanId.trim() }),
      });

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        throw new Error("服务器超时或返回异常，请稍后重试");
      }

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "分析失败");
      }

      localStorage.setItem(`taste-report-${result.id}`, JSON.stringify(result));
      router.push(`/result/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败，请重试");
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in-up">
          <h1 className="text-2xl font-bold text-white mb-2">
            输入豆瓣 ID
          </h1>
          <p className="text-sm text-gray-400">
            AI 将采样你的书影音数据
            <br />
            推导你的书影音 MBTI
          </p>
        </div>

        {/* Input */}
        {!isLoading && (
          <div className="space-y-4 animate-fade-in-up animate-delay-100">
            <div className="relative">
              <input
                type="text"
                value={doubanId}
                onChange={(e) => {
                  setDoubanId(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                placeholder="豆瓣 ID 或个人主页链接"
                className="w-full rounded-2xl bg-white/5 border border-white/20 px-5 py-4 text-white text-center text-lg placeholder-gray-500 focus:outline-none focus:border-[#e94560] transition-colors"
                autoFocus
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!doubanId.trim()}
              className="w-full py-4 rounded-2xl accent-gradient text-white font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed pulse-glow"
            >
              开始鉴定
            </button>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {/* Help */}
            <div className="card-glass rounded-xl p-4 space-y-3">
              <p className="text-xs text-gray-400 font-medium">
                如何找到你的豆瓣 ID？
              </p>
              <ul className="text-xs text-gray-500 space-y-1.5">
                <li>
                  &bull; 打开豆瓣 App → 我的 → 个人主页 → URL 中的数字或英文即为 ID
                </li>
                <li>
                  &bull; 例如：<span className="text-gray-400">douban.com/people/<strong className="text-white">ahbei</strong>/</span> 中的 <strong className="text-white">ahbei</strong>
                </li>
                <li>
                  &bull; 也可以直接粘贴完整的个人主页链接
                </li>
                <li>
                  &bull; 需要对方的主页和标记为公开状态
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="text-center space-y-6 animate-fade-in-up">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-white/10" />
              <div className="absolute inset-0 rounded-full border-2 border-t-[#e94560] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                🔍
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-white font-medium">
                {PROGRESS_MESSAGES[progressIdx]}
              </p>
              <div className="w-48 mx-auto h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full accent-gradient rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${((progressIdx + 1) / PROGRESS_MESSAGES.length) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-500">
                正在分析 {doubanId} 的品味数据...
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
