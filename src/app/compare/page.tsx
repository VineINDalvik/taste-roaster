"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const PROGRESS_MESSAGES = [
  "正在爬取对方的豆瓣数据...",
  "采样对方读过的书...",
  "采样对方看过的电影...",
  "推导对方的文化 MBTI...",
  "寻找你们的品味交集...",
  "AI 正在犀利点评你们的匹配度...",
  "生成双人对比报告...",
];

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromId = searchParams.get("from");
  const [doubanIdB, setDoubanIdB] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressIdx, setProgressIdx] = useState(0);
  const [myName, setMyName] = useState("");

  useEffect(() => {
    if (fromId) {
      const stored = localStorage.getItem(`taste-report-${fromId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setMyName(parsed.doubanName || parsed.input?.doubanId || "");
        } catch {
          // ignore
        }
      }
    }
  }, [fromId]);

  async function safeFetchJson(url: string, options: RequestInit) {
    const res = await fetch(url, options);
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
      throw new Error("服务器超时或返回异常，请稍后重试");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "请求失败");
    return data;
  }

  const handleCompare = async () => {
    if (!doubanIdB.trim() || !fromId) return;

    const stored = localStorage.getItem(`taste-report-${fromId}`);
    if (!stored) {
      setError("找不到你的报告数据，请先测试自己的文化MBTI");
      return;
    }

    const myReport = JSON.parse(stored);
    setIsLoading(true);
    setError(null);
    setProgressIdx(0);

    const interval = setInterval(() => {
      setProgressIdx((prev) =>
        prev < PROGRESS_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 3500);

    try {
      // Step 1: Analyze person B (reuse /api/analyze, ~20s)
      const reportB = await safeFetchJson("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doubanId: doubanIdB.trim() }),
      });

      setProgressIdx(4);

      // Step 2: Lightweight comparison (~5s)
      const result = await safeFetchJson("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personA: {
            name: myReport.doubanName || myReport.input?.doubanId || "你",
            mbtiType: myReport.mbti.type,
            mbtiTitle: myReport.mbti.title,
            dimensions: myReport.mbti.dimensions,
            radarData: myReport.radarData,
            summary: myReport.summary,
            roast: myReport.roast,
            bookTitles: (myReport.input?.books ?? [])
              .slice(0, 30)
              .map((b: { title: string }) => b.title),
            movieTitles: (myReport.input?.movies ?? [])
              .slice(0, 30)
              .map((m: { title: string }) => m.title),
            musicTitles: (myReport.input?.music ?? [])
              .slice(0, 30)
              .map((m: { title: string }) => m.title),
            bookCount: myReport.bookCount,
            movieCount: myReport.movieCount,
            musicCount: myReport.musicCount,
          },
          personB: {
            name: reportB.doubanName || doubanIdB.trim(),
            mbtiType: reportB.mbti.type,
            mbtiTitle: reportB.mbti.title,
            dimensions: reportB.mbti.dimensions,
            radarData: reportB.radarData,
            summary: reportB.summary,
            roast: reportB.roast,
            bookTitles: (reportB.input?.books ?? [])
              .slice(0, 30)
              .map((b: { title: string }) => b.title),
            movieTitles: (reportB.input?.movies ?? [])
              .slice(0, 30)
              .map((m: { title: string }) => m.title),
            musicTitles: (reportB.input?.music ?? [])
              .slice(0, 30)
              .map((m: { title: string }) => m.title),
            bookCount: reportB.bookCount,
            movieCount: reportB.movieCount,
            musicCount: reportB.musicCount,
          },
        }),
      });

      localStorage.setItem(
        `taste-compare-${result.compareId}`,
        JSON.stringify(result)
      );
      router.push(`/compare/${result.compareId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "对比失败，请重试");
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  if (!fromId) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center space-y-4">
          <div className="text-4xl">👥</div>
          <h1 className="text-xl font-bold text-white">品味双人对比</h1>
          <p className="text-gray-400">
            请先测试自己的文化MBTI，然后从结果页发起对比
          </p>
          <Link
            href="/upload"
            className="inline-block px-6 py-3 rounded-xl accent-gradient text-white font-medium"
          >
            先测测自己
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="text-4xl mb-4">👥</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            品味双人对比
          </h1>
          <p className="text-sm text-gray-400">
            {myName ? `${myName}，` : ""}输入对方的豆瓣 ID
            <br />
            看看你们的文化 MBTI 有多配
          </p>
        </div>

        {!isLoading && (
          <div className="space-y-4 animate-fade-in-up animate-delay-100">
            <input
              type="text"
              value={doubanIdB}
              onChange={(e) => {
                setDoubanIdB(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleCompare()}
              placeholder="对方的豆瓣 ID 或主页链接"
              className="w-full rounded-2xl bg-white/5 border border-white/20 px-5 py-4 text-white text-center text-lg placeholder-gray-500 focus:outline-none focus:border-[#e94560] transition-colors"
              autoFocus
            />

            <button
              onClick={handleCompare}
              disabled={!doubanIdB.trim()}
              className="w-full py-4 rounded-2xl accent-gradient text-white font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              开始对比
            </button>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div className="card-glass rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">
                对方的豆瓣标记需为公开状态 · 分析约需 25-35 秒
              </p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="text-center space-y-6 animate-fade-in-up">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-white/10" />
              <div className="absolute inset-0 rounded-full border-2 border-t-[#e94560] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                👥
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
                正在对比 {myName || "你"} 与 {doubanIdB} 的品味...
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-gray-400">加载中...</p>
        </main>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
