"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import ShareCard from "@/components/ShareCard";

const TasteGraph = dynamic(() => import("@/components/TasteGraph"), {
  ssr: false,
});

interface MBTIDimension {
  letter: string;
  score: number;
  evidence: string;
}

interface CulturalMBTI {
  type: string;
  title: string;
  dimensions: {
    ie: MBTIDimension;
    ns: MBTIDimension;
    tf: MBTIDimension;
    jp: MBTIDimension;
  };
  summary: string;
}

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
  alreadyConsumed?: boolean;
}

interface ReportData {
  id: string;
  mbti: CulturalMBTI;
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
  sampleCount?: number;
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
    nodes: {
      id: string;
      label: string;
      type: string;
      size: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
    }[];
    edges: { source: string; target: string; weight: number }[];
  };
}

const UNLOCK_MESSAGES = [
  "正在全量扫描书影音数据...",
  "深入挖掘评论和日记...",
  "分析你的 MBTI 维度变化...",
  "解读阅读品味进化轨迹...",
  "构建品味知识图谱...",
  "生成个性化推荐（排除已读）...",
  "AI 正在写深度人格画像...",
  "快好了，最后的打磨...",
];

const FUN_FACTS = [
  "INTJ 是豆瓣上最常见的文化MBTI——理性派果然爱数据",
  "数据显示：ENFP 用户的书影音品类最杂食",
  "INFJ 用户平均每部电影写的短评最长",
  "看文艺片多的人80%测出来是 xNxP",
  "音乐品味是四个维度中最能区分 T/F 的",
  "ISTP 用户偏好硬科幻和推理的概率最高",
];

export default function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [shareUnlocking, setShareUnlocking] = useState(false);
  const [shareUnlocked, setShareUnlocked] = useState(false);
  const [unlockStep, setUnlockStep] = useState(0);
  const [funFact, setFunFact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const stepInterval = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    const stored = localStorage.getItem(`taste-report-${id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setReport(parsed);
        if (parsed.personality || parsed.crossDomain) {
          setShareUnlocked(true);
        }
      } catch {
        setError("报告数据损坏");
      }
    } else {
      setError("报告不存在，请重新生成");
    }
    setLoading(false);
  }, [id]);

  const handleShareUnlock = async () => {
    if (!report?.input) return;

    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url).catch(() => {});
    } else {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    setShareUnlocking(true);
    try {
      const res = await fetch(`/api/share-unlock/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: report.id,
          input: report.input,
          mbti: report.mbti,
          roast: report.roast,
          summary: report.summary,
          radarData: report.radarData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const updated: ReportData = {
        ...report,
        personality: data.personality,
        crossDomain: data.crossDomain,
      };
      setReport(updated);
      setShareUnlocked(true);
      localStorage.setItem(`taste-report-${id}`, JSON.stringify(updated));
    } catch (err) {
      alert(err instanceof Error ? err.message : "解锁失败");
    } finally {
      setShareUnlocking(false);
    }
  };

  const handleUnlock = async () => {
    if (!report?.input) {
      alert("缺少原始数据，请重新鉴定");
      return;
    }
    setUnlocking(true);
    setUnlockStep(0);
    setFunFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);

    stepInterval.current = setInterval(() => {
      setUnlockStep((prev) => {
        if (prev < UNLOCK_MESSAGES.length - 1) return prev + 1;
        return prev;
      });
      if (Math.random() < 0.3) {
        setFunFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);
      }
    }, 4000);

    try {
      const res = await fetch(`/api/premium/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: report.id,
          input: report.input,
          mbti: report.mbti,
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
        bookCount: data.fullCounts?.bookCount ?? report.bookCount,
        movieCount: data.fullCounts?.movieCount ?? report.movieCount,
        musicCount: data.fullCounts?.musicCount ?? report.musicCount,
        reviewCount: data.fullCounts?.reviewCount ?? 0,
        diaryCount: data.fullCounts?.diaryCount ?? 0,
        statusCount: data.fullCounts?.statusCount ?? 0,
        itemCount:
          (data.fullCounts?.bookCount ?? 0) +
          (data.fullCounts?.movieCount ?? 0) +
          (data.fullCounts?.musicCount ?? 0) +
          (data.fullCounts?.reviewCount ?? 0) +
          (data.fullCounts?.diaryCount ?? 0) +
          (data.fullCounts?.statusCount ?? 0),
      };
      setReport(updated);
      localStorage.setItem(`taste-report-${id}`, JSON.stringify(updated));
    } catch (err) {
      alert(err instanceof Error ? err.message : "解锁失败");
    } finally {
      clearInterval(stepInterval.current);
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
            重新测试
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
          ← 重新测试
        </Link>

        {/* Share Card with MBTI */}
        <div className="animate-fade-in-up">
          <ShareCard
            mbtiType={report.mbti.type}
            mbtiTitle={report.mbti.title}
            dimensions={report.mbti.dimensions}
            roast={report.roast}
            radarData={report.radarData}
            summary={report.summary}
            itemCount={report.itemCount}
            doubanName={report.doubanName}
          />
        </div>

        {/* MBTI Evidence Section */}
        <div className="animate-fade-in-up animate-delay-100">
          <div className="card-glass rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#667eea]">
              🧬 MBTI 维度解读
            </h3>
            <div className="space-y-3">
              <EvidenceRow
                label="I/E"
                dim={report.mbti.dimensions.ie}
              />
              <EvidenceRow
                label="N/S"
                dim={report.mbti.dimensions.ns}
              />
              <EvidenceRow
                label="T/F"
                dim={report.mbti.dimensions.tf}
              />
              <EvidenceRow
                label="J/P"
                dim={report.mbti.dimensions.jp}
              />
            </div>
            {report.mbti.summary && (
              <p className="text-xs text-gray-300 leading-relaxed pt-2 border-t border-white/10">
                {report.mbti.summary}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 animate-fade-in-up animate-delay-100">
          <StatBlock value={report.bookCount} label="本书" />
          <StatBlock value={report.movieCount} label="部电影" />
          <StatBlock value={report.musicCount} label="首音乐" />
        </div>
        {report.isPremium &&
          (report.reviewCount || report.diaryCount || report.statusCount) && (
            <div className="grid grid-cols-3 gap-3 animate-fade-in-up animate-delay-100">
              <StatBlock value={report.reviewCount ?? 0} label="篇评论" />
              <StatBlock value={report.diaryCount ?? 0} label="篇日记" />
              <StatBlock value={report.statusCount ?? 0} label="条动态" />
            </div>
          )}

        {/* Sample note */}
        {!report.isPremium && report.sampleCount && (
          <div className="text-center text-xs text-gray-500 animate-fade-in-up animate-delay-100">
            基于 {report.sampleCount} 条采样数据分析 · 分享或解锁获取全量深度报告
          </div>
        )}

        {/* Share-unlock section */}
        {!report.isPremium && !shareUnlocked && (
          <div className="animate-fade-in-up animate-delay-200">
            <div className="card-glass rounded-2xl p-6 text-center space-y-4">
              <div className="text-2xl">📤</div>
              <h3 className="text-lg font-bold text-white">
                分享解锁深度分析
              </h3>
              <p className="text-sm text-gray-400">
                分享给朋友，免费解锁「{report.mbti.type} 深度人格画像」
              </p>
              <button
                onClick={handleShareUnlock}
                disabled={shareUnlocking}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {shareUnlocking ? "AI 正在分析..." : "分享并解锁 (免费)"}
              </button>
              <p className="text-xs text-gray-500">链接已自动复制到剪贴板</p>
            </div>
          </div>
        )}

        {/* Share-unlocked content */}
        {!report.isPremium && shareUnlocked && (
          <div className="space-y-4 animate-fade-in-up animate-delay-200">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#667eea]">✦</span> 分享解锁内容
            </h2>
            <PremiumSection
              icon="🧠"
              title={`${report.mbti.type} 深度人格画像`}
              content={report.personality}
            />
            <PremiumSection
              icon="🔗"
              title="跨领域品味关联"
              content={report.crossDomain}
            />
          </div>
        )}

        {/* Full premium unlock */}
        {!report.isPremium ? (
          unlocking ? (
            <UnlockingOverlay step={unlockStep} funFact={funFact} />
          ) : (
            <div className="animate-fade-in-up animate-delay-300">
              <div className="card-glass rounded-2xl p-6 text-center space-y-4">
                <div className="text-2xl">🔒</div>
                <h3 className="text-lg font-bold text-white">
                  {shareUnlocked
                    ? "解锁完整报告"
                    : "直接购买完整报告"}
                </h3>
                <ul className="text-sm text-gray-400 space-y-1.5 text-left max-w-xs mx-auto">
                  <li className="flex items-start gap-2">
                    <span className="text-[#e94560]">✦</span>
                    全量数据深度分析（含评论、日记、动态）
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#e94560]">✦</span>
                    书 / 影 / 音 分品类 MBTI 解读
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#e94560]">✦</span>
                    品味时间线 + 品味图谱
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#e94560]">✦</span>
                    AI 精准推荐（排除已读/已看/已听）
                  </li>
                </ul>
                <button
                  onClick={handleUnlock}
                  className="w-full py-3 rounded-xl accent-gradient text-white font-medium hover:opacity-90 transition-opacity"
                >
                  解锁完整报告 ¥6.9
                </button>
                <p className="text-xs text-gray-500">
                  MVP 体验期免费 · 全量扫描约需 30-60 秒
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-6 animate-fade-in-up animate-delay-200">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-[#f5c518]">★</span> {report.mbti.type}{" "}
              完整品味报告
            </h2>

            <PremiumSection
              icon="📚"
              title={`${report.mbti.type} 的阅读品味`}
              content={report.bookAnalysis}
            />
            <PremiumSection
              icon="🎬"
              title={`${report.mbti.type} 的观影品味`}
              content={report.movieAnalysis}
            />
            <PremiumSection
              icon="🎵"
              title={`${report.mbti.type} 的音乐品味`}
              content={report.musicAnalysis}
            />

            {/* Timeline */}
            {report.timelineMonths && report.timelineMonths.length > 0 && (
              <div className="card-glass rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#e94560]">
                  📅 品味时间线
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

            <PremiumSection
              icon="🔗"
              title="跨领域品味关联"
              content={report.crossDomain}
            />
            <PremiumSection
              icon="🧠"
              title={`${report.mbti.type} 深度人格画像`}
              content={report.personality}
            />
            <PremiumSection
              icon="🎯"
              title={`${report.mbti.type} 的品味盲区`}
              content={report.blindSpots}
            />

            {/* Graph */}
            {report.graph && report.graph.nodes.length > 0 && (
              <TasteGraph
                nodes={report.graph.nodes.map((n, i) => ({
                  ...n,
                  type: n.type as
                    | "book"
                    | "movie"
                    | "music"
                    | "keyword"
                    | "genre"
                    | "person",
                  x:
                    200 +
                    Math.cos(
                      (i / report.graph!.nodes.length) * Math.PI * 2
                    ) *
                      100,
                  y:
                    200 +
                    Math.sin(
                      (i / report.graph!.nodes.length) * Math.PI * 2
                    ) *
                      100,
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
                  💡 {report.mbti.type} 专属推荐
                </h3>
                <p className="text-xs text-gray-500">
                  已排除你读过/看过/听过的作品
                </p>
                <div className="space-y-3">
                  {report.recommendations
                    .filter((r) => !r.alreadyConsumed)
                    .map((rec, i) => (
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
            分享链接给朋友，看看谁是什么 MBTI
          </p>
        </div>
      </div>
    </main>
  );
}

function EvidenceRow({
  label,
  dim,
}: {
  label: string;
  dim: MBTIDimension;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-10 h-6 rounded bg-white/5 flex items-center justify-center">
        <span className="text-xs font-bold text-[#667eea]">
          {dim.letter}
        </span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed flex-1">
        {dim.evidence}
      </p>
    </div>
  );
}

function UnlockingOverlay({
  step,
  funFact,
}: {
  step: number;
  funFact: string;
}) {
  return (
    <div className="card-glass rounded-2xl p-8 text-center space-y-6 animate-fade-in-up">
      <div className="relative w-24 h-24 mx-auto">
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="absolute inset-0 rounded-full border-2 border-t-[#e94560] border-r-[#e94560] animate-spin" />
        <div className="absolute inset-3 rounded-full border-2 border-white/5" />
        <div
          className="absolute inset-3 rounded-full border-2 border-t-[#f5c518] animate-spin"
          style={{
            animationDirection: "reverse",
            animationDuration: "1.5s",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">
          🧠
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-white font-medium text-sm">
          {UNLOCK_MESSAGES[step]}
        </p>
        <div className="w-56 mx-auto h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full accent-gradient rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${((step + 1) / UNLOCK_MESSAGES.length) * 100}%`,
            }}
          />
        </div>
        <p className="text-xs text-gray-500">全量分析中 · 约需 30-60 秒</p>
      </div>
      <div className="pt-3 border-t border-white/5">
        <p className="text-[11px] text-gray-500 italic leading-relaxed">
          💡 {funFact}
        </p>
      </div>
    </div>
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
