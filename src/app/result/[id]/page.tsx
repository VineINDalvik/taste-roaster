"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import ShareCard from "@/components/ShareCard";

const TasteGraph = dynamic(() => import("@/components/TasteGraph"), { ssr: false });

interface MonthSnapshot {
  month: string;
  books: string[];
  movies: string[];
  music: string[];
  mood: string;
  tasteShift: string;
  roast: string;
}

interface RecommendationItem {
  title: string;
  type: "book" | "movie" | "music";
  reason: string;
  matchScore: number;
}

interface ReportData {
  id: string;
  label: string;
  roast: string;
  radarData: {
    depth: number;
    breadth: number;
    uniqueness: number;
    emotionSensitivity: number;
    timeSpan: number;
  };
  summary: string;
  isPremium: boolean;
  doubanName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input?: any;
  itemCount: number;
  bookCount: number;
  movieCount: number;
  musicCount: number;
  reviewCount?: number;
  diaryCount?: number;
  statusCount?: number;
  bookAnalysis?: string;
  movieAnalysis?: string;
  musicAnalysis?: string;
  timelineMonths?: MonthSnapshot[];
  timelineText?: string;
  crossDomain?: string;
  personality?: string;
  blindSpots?: string;
  recommendations?: RecommendationItem[];
  graph?: {
    nodes: { id: string; label: string; type: string; size: number; x: number; y: number; vx: number; vy: number }[];
    edges: { source: string; target: string; weight: number }[];
  };
}

export default function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`taste-report-${id}`);
    if (stored) {
      try {
        setReport(JSON.parse(stored));
      } catch {
        setError("报告数据损坏");
      }
    } else {
      setError("报告不存在，请重新生成");
    }
    setLoading(false);
  }, [id]);

  const handleUnlock = async () => {
    if (!report?.input) {
      alert("缺少原始数据，请重新鉴定");
      return;
    }
    setUnlocking(true);
    try {
      const res = await fetch(`/api/premium/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: report.input,
          label: report.label,
          roast: report.roast,
          summary: report.summary,
          radarData: report.radarData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const updated: ReportData = {
        ...report,
        isPremium: true,
        bookAnalysis: data.bookAnalysis,
        movieAnalysis: data.movieAnalysis,
        musicAnalysis: data.musicAnalysis,
        timelineMonths: data.timelineMonths,
        timelineText: data.timelineText,
        crossDomain: data.crossDomain,
        personality: data.personality,
              blindSpots: data.blindSpots,
              recommendations: data.recommendations,
              graph: data.graph,
            };
      setReport(updated);
      localStorage.setItem(`taste-report-${id}`, JSON.stringify(updated));
    } catch (err) {
      alert(err instanceof Error ? err.message : "解锁失败");
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-spin">🔍</div>
          <p className="text-gray-400">加载报告中...</p>
        </div>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="text-4xl">😵</div>
          <p className="text-gray-400">{error || "报告不存在"}</p>
          <Link
            href="/upload"
            className="inline-block px-6 py-2 rounded-xl accent-gradient text-white text-sm"
          >
            重新鉴定
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-lg mx-auto space-y-8">
        <Link
          href="/upload"
          className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← 重新鉴定
        </Link>

        <div className="animate-fade-in-up">
          <ShareCard
            label={report.label}
            roast={report.roast}
            radarData={report.radarData}
            summary={report.summary}
            itemCount={report.itemCount}
            doubanName={report.doubanName}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 animate-fade-in-up animate-delay-100">
          <StatBlock value={report.bookCount} label="本书" />
          <StatBlock value={report.movieCount} label="部电影" />
          <StatBlock value={report.musicCount} label="首音乐" />
        </div>
        {(report.reviewCount || report.diaryCount || report.statusCount) && (
          <div className="grid grid-cols-3 gap-3 animate-fade-in-up animate-delay-100">
            <StatBlock value={report.reviewCount ?? 0} label="篇评论" />
            <StatBlock value={report.diaryCount ?? 0} label="篇日记" />
            <StatBlock value={report.statusCount ?? 0} label="条动态" />
          </div>
        )}

        {/* Premium */}
        {!report.isPremium ? (
          <div className="animate-fade-in-up animate-delay-200">
            <div className="card-glass rounded-2xl p-6 text-center space-y-4">
              <div className="text-2xl">🔒</div>
              <h3 className="text-lg font-bold text-white">
                解锁完整品味报告
              </h3>
              <ul className="text-sm text-gray-400 space-y-1 text-left max-w-xs mx-auto">
                <li>&bull; 书 / 影 / 音 分品类深度毒评</li>
                <li>&bull; 近 6 月品味时间线 + 每月毒舌点评</li>
                <li>&bull; AI 人格画像透视</li>
                <li>&bull; 品味盲区 + 10 部 AI 精准推荐</li>
              </ul>
              <button
                onClick={handleUnlock}
                disabled={unlocking}
                className="w-full py-3 rounded-xl accent-gradient text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {unlocking ? "AI 正在深度分析..." : "解锁完整报告 ¥9.9"}
              </button>
              <p className="text-xs text-gray-500">MVP 体验期免费解锁</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in-up animate-delay-200">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#f5c518]">★</span> 完整品味报告
            </h2>

            <PremiumSection icon="📚" title="阅读品味" content={report.bookAnalysis} />
            <PremiumSection icon="🎬" title="观影品味" content={report.movieAnalysis} />
            <PremiumSection icon="🎵" title="音乐品味" content={report.musicAnalysis} />

            {/* Timeline */}
            {report.timelineMonths && report.timelineMonths.length > 0 && (
              <div className="card-glass rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#e94560]">
                  📅 近 6 月品味时间线
                </h3>
                <div className="space-y-4">
                  {report.timelineMonths.map((m) => (
                    <div
                      key={m.month}
                      className="relative pl-6 border-l-2 border-white/10 space-y-1"
                    >
                      <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-[#e94560]" />
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {m.month}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                          {m.mood}
                        </span>
                      </div>
                      {m.books.length > 0 && (
                        <p className="text-xs text-gray-400">
                          📖 {m.books.join("、")}
                        </p>
                      )}
                      {m.movies.length > 0 && (
                        <p className="text-xs text-gray-400">
                          🎬 {m.movies.join("、")}
                        </p>
                      )}
                      {m.music.length > 0 && (
                        <p className="text-xs text-gray-400">
                          🎵 {m.music.join("、")}
                        </p>
                      )}
                      {m.tasteShift && (
                        <p className="text-xs text-gray-500 italic">
                          {m.tasteShift}
                        </p>
                      )}
                      {m.roast && (
                        <p className="text-xs text-[#e94560]/80 mt-1">
                          💬 {m.roast}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {report.timelineText && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                      {report.timelineText}
                    </p>
                  </div>
                )}
              </div>
            )}

            <PremiumSection icon="🔗" title="跨领域关联" content={report.crossDomain} />
            <PremiumSection icon="🧠" title="人格画像透视" content={report.personality} />
            <PremiumSection icon="🎯" title="品味盲区" content={report.blindSpots} />

            {/* Taste Graph */}
            {report.graph && report.graph.nodes.length > 0 && (
              <TasteGraph
                nodes={report.graph.nodes.map((n, i) => ({
                  ...n,
                  type: n.type as "book" | "movie" | "music" | "keyword" | "genre" | "person",
                  x: 200 + Math.cos((i / report.graph!.nodes.length) * Math.PI * 2) * 100,
                  y: 200 + Math.sin((i / report.graph!.nodes.length) * Math.PI * 2) * 100,
                  vx: 0,
                  vy: 0,
                }))}
                edges={report.graph.edges}
              />
            )}

            {/* Recommendations */}
            {report.recommendations && report.recommendations.length > 0 && (
              <div className="card-glass rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#e94560]">
                  💡 AI 精准推荐
                </h3>
                <div className="space-y-3">
                  {report.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm">
                        {rec.type === "book"
                          ? "📖"
                          : rec.type === "movie"
                            ? "🎬"
                            : "🎵"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-medium truncate">
                            {rec.title}
                          </span>
                          <MatchBadge score={rec.matchScore} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                          {rec.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="text-center space-y-3 pb-8 animate-fade-in-up animate-delay-300">
          <Link
            href="/upload"
            className="inline-block px-6 py-2.5 rounded-xl card-glass text-white text-sm hover:bg-white/10 transition-colors"
          >
            再测一个人
          </Link>
          <p className="text-xs text-gray-500">
            分享链接给朋友，看看谁的品味更 &quot;独特&quot;
          </p>
        </div>
      </div>
    </main>
  );
}

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="card-glass rounded-xl p-3 text-center">
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function PremiumSection({
  icon,
  title,
  content,
}: {
  icon: string;
  title: string;
  content?: string;
}) {
  if (!content) return null;
  return (
    <div className="card-glass rounded-xl p-5 space-y-2">
      <h3 className="text-sm font-bold text-[#e94560]">
        {icon} {title}
      </h3>
      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
        {content}
      </p>
    </div>
  );
}

function MatchBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-green-400 bg-green-400/10"
      : score >= 50
        ? "text-yellow-400 bg-yellow-400/10"
        : "text-red-400 bg-red-400/10";
  const text =
    score >= 80 ? "高匹配" : score >= 50 ? "可能惊艳" : "挑战区";
  return (
    <span
      className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded ${color}`}
    >
      {text} {score}%
    </span>
  );
}
