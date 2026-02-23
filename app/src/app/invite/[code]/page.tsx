"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PROGRESS_MESSAGES = [
  "正在爬取你的豆瓣数据...",
  "采样你读过的书...",
  "采样你看过的电影...",
  "推导你的书影音 MBTI...",
  "寻找你们的品味交集...",
  "AI 正在犀利点评你们的匹配度...",
  "生成双人对比报告...",
];

interface InviterInfo {
  name: string;
  mbtiType: string;
  mbtiTitle: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  full?: any;
}

export default function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();

  const [inviter, setInviter] = useState<InviterInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [doubanId, setDoubanId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressIdx, setProgressIdx] = useState(0);

  useEffect(() => {
    fetch(`/api/invite/${code}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "邀请不存在或已过期");
        }
        return res.json();
      })
      .then((data) => setInviter(data))
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : "加载失败")
      );
  }, [code]);

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

  const handleAccept = async () => {
    if (!doubanId.trim() || !inviter?.full) return;

    setIsLoading(true);
    setError(null);
    setProgressIdx(0);

    const interval = setInterval(() => {
      setProgressIdx((prev) =>
        prev < PROGRESS_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 3500);

    try {
      const reportB = await safeFetchJson("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doubanId: doubanId.trim() }),
      });

      setProgressIdx(4);

      const personA = inviter.full;
      const bBookCount =
        reportB.realCounts?.books ||
        reportB.bookCount ||
        reportB.input?.books?.length ||
        0;
      const bMovieCount =
        reportB.realCounts?.movies ||
        reportB.movieCount ||
        reportB.input?.movies?.length ||
        0;
      const bMusicCount =
        reportB.realCounts?.music ||
        reportB.musicCount ||
        reportB.input?.music?.length ||
        0;

      const result = await safeFetchJson("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personA: {
            name: personA.name,
            mbtiType: personA.mbtiType,
            mbtiTitle: personA.mbtiTitle,
            dimensions: personA.dimensions,
            radarData: personA.radarData,
            summary: personA.summary,
            roast: personA.roast,
            bookTitles: personA.bookTitles,
            movieTitles: personA.movieTitles,
            musicTitles: personA.musicTitles,
            bookCount: personA.bookCount,
            movieCount: personA.movieCount,
            musicCount: personA.musicCount,
          },
          personB: {
            name: reportB.doubanName || doubanId.trim(),
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
            bookCount: bBookCount,
            movieCount: bMovieCount,
            musicCount: bMusicCount,
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

  if (loadError) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center space-y-4">
          <div className="text-4xl">😢</div>
          <h1 className="text-xl font-bold text-white">邀请已过期</h1>
          <p className="text-gray-400">{loadError}</p>
          <Link
            href="/upload"
            className="inline-block px-6 py-3 rounded-xl accent-gradient text-white font-medium"
          >
            自己去测测
          </Link>
        </div>
      </main>
    );
  }

  if (!inviter) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-spin">🔍</div>
          <p className="text-gray-400">加载邀请信息...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md mx-auto">
        {/* Invite Hero */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "linear-gradient(135deg, #667eea 0%, #e94560 100%)",
                opacity: 0.15,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-3xl font-black tracking-wider"
                style={{
                  background:
                    "linear-gradient(135deg, #667eea, #e94560)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {inviter.mbtiType}
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            {inviter.name} 邀请你对比品味
          </h1>
          <p className="text-sm text-gray-400">
            TA 的书影音 MBTI 是{" "}
            <span className="text-[#e94560] font-medium">
              {inviter.mbtiType}
            </span>{" "}
            · {inviter.mbtiTitle}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            输入你的豆瓣 ID，看看你们有多配
          </p>
        </div>

        {!isLoading && (
          <div className="space-y-4 animate-fade-in-up animate-delay-100">
            <input
              type="text"
              value={doubanId}
              onChange={(e) => {
                setDoubanId(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAccept()}
              placeholder="你的豆瓣 ID 或主页链接"
              className="w-full rounded-2xl bg-white/5 border border-white/20 px-5 py-4 text-white text-center text-lg placeholder-gray-500 focus:outline-none focus:border-[#e94560] transition-colors"
              autoFocus
            />

            <button
              onClick={handleAccept}
              disabled={!doubanId.trim()}
              className="w-full py-4 rounded-2xl accent-gradient text-white font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              接受挑战
            </button>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div className="card-glass rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">
                你的豆瓣标记需为公开状态 · 分析约需 25-35 秒
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
                正在对比 {inviter.name} 与 {doubanId} 的品味...
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
