"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PROGRESS_MESSAGES = [
  "正在潜入ta的豆瓣主页...",
  "翻看ta读过的书...",
  "扒拉ta看过的电影...",
  "偷听ta循环的歌单...",
  "AI 正在推理人格密码...",
  "从品味里看穿ta的灵魂...",
  "生成书影音 MBTI 报告...",
];

export default function UploadPage() {
  const router = useRouter();
  const [doubanId, setDoubanId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressIdx, setProgressIdx] = useState(0);
  const [showDoubanHelp, setShowDoubanHelp] = useState(false);

  const handleAnalyze = async () => {
    if (!doubanId.trim()) return;

    const cleanId = doubanId
      .trim()
      .replace(/^https?:\/\/.*\/people\//, "")
      .replace(/\/$/, "");

    // Check local cache by douban ID
    const localKey = `taste-douban-${cleanId}`;
    const localCached = localStorage.getItem(localKey);
    if (localCached) {
      try {
        const cached = JSON.parse(localCached);
        if (cached.id) {
          localStorage.setItem(`taste-report-${cached.id}`, localCached);
          router.push(`/result/${cached.id}`);
          return;
        }
      } catch { /* ignore parse errors */ }
    }

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
        body: JSON.stringify({ doubanId: cleanId }),
      });

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        throw new Error("服务器超时或返回异常，请稍后重试");
      }

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "分析失败");
      }

      if (result._usage) {
        console.log("[LLM Usage]", result._usage);
      }
      if (result._cached) {
        console.log("[Cache HIT] 使用缓存结果");
      }

      const json = JSON.stringify(result);
      localStorage.setItem(`taste-report-${result.id}`, json);
      localStorage.setItem(localKey, json);
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
            AI 翻遍你的书影音记录
            <br />
            看穿你的品味人格
          </p>
        </div>

        {/* Input */}
        {!isLoading && (
          <div className="space-y-4 animate-fade-in-up animate-delay-100">
            {/* Mode 1: Get ID from Douban App */}
            <button
              type="button"
              onClick={() => setShowDoubanHelp(true)}
              className="w-full card-glass rounded-2xl p-4 text-left flex items-center justify-between gap-4 hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📱</span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    从豆瓣 App 获取 ID
                  </div>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">
                    打开豆瓣 → 复制个人主页 ID → 回来粘贴
                  </div>
                </div>
              </div>
              <span className="text-gray-500 text-lg flex-shrink-0">→</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] text-gray-500">或直接输入</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

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

      {showDoubanHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setShowDoubanHelp(false)}
        >
          <div
            className="max-w-sm w-full card-glass rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-white font-bold text-sm mb-3">📱 从豆瓣 App 获取 ID</div>
            <ol className="text-xs text-gray-400 space-y-2 leading-relaxed list-decimal list-inside">
              <li>打开豆瓣 App</li>
              <li>进入「我的」页面</li>
              <li>点击头像进入个人主页</li>
              <li>复制地址栏中的 ID（数字或英文）</li>
              <li>回到这里粘贴到输入框</li>
            </ol>
            <div className="mt-4 text-[11px] text-gray-500">
              例：`douban.com/people/ahbei/` 中的 `ahbei`
            </div>
            <button
              type="button"
              className="mt-5 w-full py-2.5 rounded-xl accent-gradient text-white text-sm font-medium"
              onClick={() => setShowDoubanHelp(false)}
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
