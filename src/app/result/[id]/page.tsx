"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import ShareCard from "@/components/ShareCard";

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
  timeline?: string;
  crossDomain?: string;
  personality?: string;
  blindSpots?: string;
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
    fetch(`/api/report/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setReport(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUnlock = async () => {
    setUnlocking(true);
    try {
      const res = await fetch(`/api/premium/${id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport((prev) =>
        prev
          ? {
              ...prev,
              isPremium: true,
              bookAnalysis: data.bookAnalysis,
              movieAnalysis: data.movieAnalysis,
              musicAnalysis: data.musicAnalysis,
              timeline: data.timeline,
              crossDomain: data.crossDomain,
              personality: data.personality,
              blindSpots: data.blindSpots,
            }
          : null
      );
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

        {/* Share Card */}
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

        {/* Stats bar */}
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

        {/* Premium section */}
        {!report.isPremium ? (
          <div className="animate-fade-in-up animate-delay-200">
            <div className="card-glass rounded-2xl p-6 text-center space-y-4">
              <div className="text-2xl">🔒</div>
              <h3 className="text-lg font-bold text-white">
                解锁完整品味报告
              </h3>
              <ul className="text-sm text-gray-400 space-y-1 text-left max-w-xs mx-auto">
                <li>&bull; 书 / 影 / 音 分品类深度毒评</li>
                <li>&bull; 品味进化时间线</li>
                <li>&bull; 跨领域品味关联分析</li>
                <li>&bull; AI 人格画像透视</li>
                <li>&bull; 品味盲区 + AI个性化推荐</li>
              </ul>
              <button
                onClick={handleUnlock}
                disabled={unlocking}
                className="w-full py-3 rounded-xl accent-gradient text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {unlocking ? "解锁中..." : "解锁完整报告 ¥9.9"}
              </button>
              <p className="text-xs text-gray-500">
                MVP 体验期免费解锁
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in-up animate-delay-200">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#f5c518]">★</span> 完整品味报告
            </h2>

            <PremiumSection
              icon="📚"
              title="阅读品味"
              content={report.bookAnalysis}
            />
            <PremiumSection
              icon="🎬"
              title="观影品味"
              content={report.movieAnalysis}
            />
            <PremiumSection
              icon="🎵"
              title="音乐品味"
              content={report.musicAnalysis}
            />
            <PremiumSection
              icon="📈"
              title="品味进化时间线"
              content={report.timeline}
            />
            <PremiumSection
              icon="🔗"
              title="跨领域关联"
              content={report.crossDomain}
            />
            <PremiumSection
              icon="🧠"
              title="人格画像透视"
              content={report.personality}
            />
            <PremiumSection
              icon="🎯"
              title="品味盲区 + 推荐"
              content={report.blindSpots}
            />
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
