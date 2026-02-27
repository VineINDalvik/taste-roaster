"use client";

import { useEffect, useState, useRef, use, useMemo, useCallback } from "react";
import Link from "next/link";
import ShareCard from "@/components/ShareCard";
import EvolutionCurve from "@/components/EvolutionCurve";
import MusicPortrait from "@/components/MusicPortrait";
import BookPortrait from "@/components/BookPortrait";
import MoviePortrait from "@/components/MoviePortrait";
import ShareableCard from "@/components/ShareableCard";
import InviteModal from "@/components/InviteModal";
import { markBasicPaid, markDeepPaid } from "@/lib/payment";

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
  moodScore?: number;
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
    wenqing: number;
    emo: number;
    shekong: number;
    kaogu: number;
    shangtou: number;
    chouxiang: number;
  };
  summary: string;
  isPremium: boolean;
  doubanName?: string;
  doubanId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fullInput?: any;
  sampleCount?: number;
  itemCount: number;
  bookCount: number;
  movieCount: number;
  musicCount: number;
  // Free content (loaded on first analysis)
  bookAnalysis?: string;
  movieAnalysis?: string;
  musicAnalysis?: string;
  timelineMonths?: MonthSnapshot[];
  timelineText?: string;
  // Share-unlock content
  crossDomain?: string;
  personality?: string;
  blindSpots?: string;
  recommendations?: RecommendationItem[];
}

const UNLOCK_MESSAGES = [
  "深入解读你的文化人格...",
  "分析跨领域品味关联...",
  "挖掘你的品味盲区...",
  "生成专属推荐...",
  "AI 正在写深度人格画像...",
  "快好了，最后的打磨...",
];

const FUN_FACTS = [
  "INTJ 是豆瓣上最常见的书影音 MBTI——理性派果然爱数据",
  "数据显示：ENFP 用户的书影音品类最杂食",
  "INFJ 用户平均每部电影写的短评最长",
  "看文艺片多的人80%测出来是 xNxP",
  "音乐品味是四个维度中最能区分 T/F 的",
  "ISTP 用户偏好硬科幻和推理的概率最高",
];

function getDoubanSearchUrl(title: string, type: "book" | "movie" | "music") {
  const q = encodeURIComponent(title);
  const typeMap = { book: "book", movie: "movie", music: "music" };
  return `https://search.douban.com/${typeMap[type]}/subject_search?search_text=${q}`;
}

function deriveMbtiType(dims: {
  ie: MBTIDimension;
  ns: MBTIDimension;
  tf: MBTIDimension;
  jp: MBTIDimension;
}): string {
  return (
    dims.ie.letter + dims.ns.letter + dims.tf.letter + dims.jp.letter
  ).toUpperCase();
}

const MBTI_TYPES = ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISTP", "ESTJ", "ESTP", "ISFJ", "ISFP", "ESFJ", "ESFP"];

function fixMbtiInText(
  text: string | undefined,
  _aiType: string | undefined,
  correctType: string
): string {
  if (!text || !correctType) return text ?? "";
  return MBTI_TYPES.reduce(
    (s, t) => (t !== correctType ? s.replaceAll(new RegExp(t, "gi"), correctType) : s),
    text
  );
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
  const [unlockStep, setUnlockStep] = useState(0);
  const [funFact, setFunFact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const stepInterval = useRef<NodeJS.Timeout>(undefined);

  const [expanding, setExpanding] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [fullReportGenerating, setFullReportGenerating] = useState(false);
  const [fullReportPreviewSrc, setFullReportPreviewSrc] = useState<string | null>(null);
  const [basicPaid, setBasicPaid] = useState(false);
  const [deepPaid, setDeepPaid] = useState(false);
  const mbtiType = useMemo(() => {
    if (!report?.mbti?.dimensions) return report?.mbti?.type || "????";
    return deriveMbtiType(report.mbti.dimensions);
  }, [report?.mbti]);

  const aiType = report?.mbti?.type;
  const ft = useCallback(
    (text: string | undefined) => fixMbtiInText(text, aiType, mbtiType),
    [aiType, mbtiType]
  );

  const isDeepUnlocked = !!(
    report?.personality ||
    report?.crossDomain ||
    report?.blindSpots
  );

  const hasExpandContent = !!(
    report?.bookAnalysis ||
    report?.movieAnalysis
  );
  const hasTimeline = !!(report?.timelineMonths?.length);
  const [expandFailed, setExpandFailed] = useState(false);
  const [deepUnlockFailed, setDeepUnlockFailed] = useState(false);

  const closeFullReportPreview = useCallback(() => {
    setFullReportPreviewSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(`taste-report-${id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setReport(parsed);
        markBasicPaid(parsed.id || id);
        markDeepPaid(parsed.id || id);
        setBasicPaid(true);
        setDeepPaid(true);
      } catch {
        setError("报告数据损坏");
      }
    } else {
      setError("报告不存在，请重新生成");
    }
    setLoading(false);
  }, [id]);

  const handleSaveFullReport = useCallback(async () => {
    if (!report || fullReportGenerating) return;
    if (!report.bookAnalysis && !report.movieAnalysis && !report.musicAnalysis) {
      alert("完整报告尚未加载，请稍后重试");
      return;
    }
    setFullReportGenerating(true);
    try {
      const res = await fetch("/api/share-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mbtiType,
          mbtiTitle: ft(report.mbti.title),
          roast: ft(report.roast),
          summary: ft(report.summary),
          doubanName: report.doubanName,
          bookCount: report.bookCount,
          movieCount: report.movieCount,
          musicCount: report.musicCount,
          bookAnalysis: ft(report.bookAnalysis),
          movieAnalysis: ft(report.movieAnalysis),
          musicAnalysis: ft(report.musicAnalysis),
        }),
      });
      if (!res.ok) throw new Error("API error");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const isMobile = /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent);
      if (isMobile) {
        setFullReportPreviewSrc(url);
      } else {
        const link = document.createElement("a");
        link.download = `完整报告-${mbtiType}.png`;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (e) {
      console.error("share-report failed:", e);
      alert("生成失败，请直接截图保存");
    } finally {
      setFullReportGenerating(false);
    }
  }, [report, fullReportGenerating, mbtiType, ft]);

  // Auto-trigger expand load when basic is paid but content not yet loaded
  useEffect(() => {
    if (
      report?.input &&
      report?.mbti?.type &&
      basicPaid &&
      !hasExpandContent &&
      !expanding &&
      !expandFailed
    ) {
      handleLoadExpand();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id, hasExpandContent, basicPaid]);

  // Auto-trigger deep analysis when deepPaid but content not loaded
  useEffect(() => {
    if (
      report?.input &&
      deepPaid &&
      !isDeepUnlocked &&
      !unlocking &&
      !deepUnlockFailed
    ) {
      handleDeepUnlock();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepPaid, isDeepUnlocked]);

  const handleLoadExpand = useCallback(async () => {
    if (!report?.input || !report?.mbti?.type || expanding) return;
    setExpanding(true);
    setExpandFailed(false);

    try {
      const expandInput = report.fullInput || report.input;
      const res = await fetch(`/api/expand/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: report.id,
          input: expandInput,
          mbti: report.mbti,
          roast: report.roast,
          summary: report.summary,
          radarData: report.radarData,
        }),
      });
      if (!res.ok) throw new Error("请求失败");
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) throw new Error("返回格式异常");
      const data = await res.json();
      if (data._usage) console.log("[LLM Usage] expand:", data._usage);
      setReport((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          bookAnalysis: data.bookAnalysis || prev.bookAnalysis,
          movieAnalysis: data.movieAnalysis || prev.movieAnalysis,
          musicAnalysis: data.musicAnalysis || prev.musicAnalysis,
          timelineMonths: data.timelineMonths?.length
            ? data.timelineMonths
            : prev.timelineMonths,
          timelineText: data.timelineText || prev.timelineText,
        };
        localStorage.setItem(
          `taste-report-${id}`,
          JSON.stringify(updated)
        );
        return updated;
      });
    } catch {
      setExpandFailed(true);
    } finally {
      setExpanding(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id, expanding]);

  const handleDeepUnlock = async () => {
    if (!report?.input) {
      alert("缺少原始数据，请重新测试");
      return;
    }

    setUnlocking(true);
    setDeepUnlockFailed(false);
    setUnlockStep(0);
    setFunFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);

    stepInterval.current = setInterval(() => {
      setUnlockStep((prev) =>
        prev < UNLOCK_MESSAGES.length - 1 ? prev + 1 : prev
      );
      if (Math.random() < 0.3) {
        setFunFact(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);
      }
    }, 3000);

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
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        throw new Error("服务器返回异常，请稍后重试");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data._usage) console.log("[LLM Usage] share-unlock:", data._usage);

      const updated: ReportData = {
        ...report,
        crossDomain: data.crossDomain,
        personality: data.personality,
        blindSpots: data.blindSpots,
        recommendations: data.recommendations,
      };
      setReport(updated);
      localStorage.setItem(`taste-report-${id}`, JSON.stringify(updated));
    } catch (err) {
      setDeepUnlockFailed(true);
      alert(err instanceof Error ? err.message : "加载失败，请重试");
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
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/upload"
            className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← 重新测试
          </Link>
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-1.5 text-sm text-[#e94560] hover:text-[#f5c518] transition-colors font-medium"
          >
            👥 邀请TA来测
          </button>
        </div>

        {/* Share Card */}
        <div className="animate-fade-in-up">
          <ShareCard
            mbtiType={mbtiType}
            mbtiTitle={ft(report.mbti.title)}
            dimensions={report.mbti.dimensions}
            roast={ft(report.roast)}
            radarData={report.radarData}
            summary={ft(report.summary)}
            itemCount={report.itemCount}
            doubanName={report.doubanName}
            bookCount={report.bookCount}
            movieCount={report.movieCount}
            musicCount={report.musicCount}
          />
        </div>

        {/* MBTI Dimensions */}
        <div className="animate-fade-in-up animate-delay-100">
          <div className="card-glass rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#667eea]">
              🧬 {mbtiType} 维度解读
            </h3>
            <div className="space-y-3">
              <EvidenceRow label="I/E" dim={report.mbti.dimensions.ie} />
              <EvidenceRow label="N/S" dim={report.mbti.dimensions.ns} />
              <EvidenceRow label="T/F" dim={report.mbti.dimensions.tf} />
              <EvidenceRow label="J/P" dim={report.mbti.dimensions.jp} />
            </div>
            {report.mbti.summary && (
              <p className="text-xs text-gray-300 leading-relaxed pt-2 border-t border-white/10">
                {ft(report.mbti.summary)}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className={`grid gap-3 animate-fade-in-up animate-delay-100 ${
          [report.bookCount, report.movieCount, report.musicCount].filter(c => c > 0).length === 3
            ? "grid-cols-3"
            : [report.bookCount, report.movieCount, report.musicCount].filter(c => c > 0).length === 2
              ? "grid-cols-2"
              : "grid-cols-1"
        }`}>
          {report.bookCount > 0 && <StatBlock value={report.bookCount} label="本书" emoji="📚" />}
          {report.movieCount > 0 && <StatBlock value={report.movieCount} label="部电影" emoji="🎬" />}
          {report.musicCount > 0 && <StatBlock value={report.musicCount} label="首音乐" emoji="🎵" />}
        </div>

        {/* sample count hidden — avoid showing small numbers */}

        {/* === Taste Analysis: Book/Movie/Music + Timeline === */}
        {(
          <>
            <div className="space-y-4 animate-fade-in-up animate-delay-200">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-[#667eea]">✦</span> {mbtiType}{" "}
                品味报告
              </h2>

              {/* Full report save (server-rendered image) */}
              {hasExpandContent && (
                <div className="card-glass rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      📋 保存完整报告
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      手机端会弹出预览，长按保存
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveFullReport}
                    disabled={fullReportGenerating}
                    className="px-4 py-2 rounded-xl accent-gradient text-white text-sm font-medium disabled:opacity-70"
                  >
                    {fullReportGenerating ? "生成中..." : "保存"}
                  </button>
                </div>
              )}

              {report.bookCount > 0 && (
                report.bookAnalysis ? (
                  <ShareableCard filename={`阅读画像-${mbtiType}`}>
                    <BookPortrait analysis={ft(report.bookAnalysis)!} mbtiType={mbtiType} />
                  </ShareableCard>
                ) : expanding ? (
                  <ExpandSkeleton icon="📚" label="阅读画像" />
                ) : null
              )}

              {report.movieCount > 0 && (
                report.movieAnalysis ? (
                  <ShareableCard filename={`观影画像-${mbtiType}`}>
                    <MoviePortrait analysis={ft(report.movieAnalysis)!} mbtiType={mbtiType} />
                  </ShareableCard>
                ) : expanding ? (
                  <ExpandSkeleton icon="🎬" label="观影画像" />
                ) : null
              )}

              {report.musicCount > 0 && (
                report.musicAnalysis ? (
                  <ShareableCard filename={`音乐画像-${mbtiType}`}>
                    <MusicPortrait analysis={ft(report.musicAnalysis)!} mbtiType={mbtiType} />
                  </ShareableCard>
                ) : expanding ? (
                  <ExpandSkeleton icon="🎵" label="音乐画像" />
                ) : null
              )}

              {!hasExpandContent && !expanding && expandFailed && (
                <button
                  onClick={handleLoadExpand}
                  className="w-full flex items-center gap-4 p-4 rounded-xl card-glass border border-red-500/20 hover:border-[#667eea]/40 transition-all group"
                >
                  <span className="text-xl flex-shrink-0">🔄</span>
                  <span className="flex-1 text-left">
                    <span className="block text-sm font-semibold text-white">品味分析加载失败</span>
                    <span className="block text-xs text-gray-500 mt-0.5">点击重试</span>
                  </span>
                  <span className="text-[#667eea] group-hover:translate-x-1 transition-transform">→</span>
                </button>
              )}
            </div>

            {report.timelineMonths && report.timelineMonths.length > 0 && (
              <div className="animate-fade-in-up animate-delay-200">
                <ShareableCard filename={`品味进化-${mbtiType}`}>
                  <EvolutionCurve
                    months={report.timelineMonths}
                    trend={ft(report.timelineText?.split("\n")[0])}
                    prediction={ft(
                      report.timelineText?.includes("预测")
                        ? report.timelineText.split("\n").slice(1).join("\n")
                        : undefined
                    )}
                  />
                </ShareableCard>
              </div>
            )}

            {!hasTimeline && expanding && (
              <ExpandSkeleton icon="📅" label="品味进化时间线" />
            )}
          </>
        )}

        {fullReportPreviewSrc && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
            onClick={closeFullReportPreview}
          >
            <p className="text-white text-sm mb-3 animate-pulse">
              👆 长按图片保存到相册
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullReportPreviewSrc}
              alt="完整报告"
              className="max-w-full max-h-[80vh] rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="mt-4 px-6 py-2 rounded-xl bg-white/10 text-white text-sm"
              onClick={closeFullReportPreview}
            >
              关闭
            </button>
          </div>
        )}

        {/* === Deep Analysis === */}
        {(
          !isDeepUnlocked ? (
            unlocking ? (
              <UnlockingOverlay step={unlockStep} funFact={funFact} />
            ) : deepUnlockFailed ? (
              <div className="card-glass rounded-xl p-5 text-center space-y-3 animate-fade-in-up animate-delay-300">
                <div className="text-xl">🔮</div>
                <p className="text-sm text-gray-400">加载失败，网络可能较慢</p>
                <p className="text-xs text-gray-500">建议开启 VPN 后重试</p>
                <button
                  onClick={handleDeepUnlock}
                  className="mt-3 px-6 py-2 rounded-xl bg-gradient-to-r from-[#e94560] to-[#764ba2] text-white text-sm font-medium"
                >
                  点击重试
                </button>
              </div>
            ) : (
              <div className="card-glass rounded-xl p-5 text-center space-y-3 animate-fade-in-up animate-delay-300">
                <div className="text-xl animate-pulse">🔮</div>
                <p className="text-sm text-gray-400">正在加载深度解读...</p>
              </div>
            )
          ) : (
          <div className="space-y-4 animate-fade-in-up animate-delay-300">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#e94560]">✦</span> 深度解读
            </h2>

            <AnalysisSection
              icon="🔗"
              title="跨领域品味关联"
              content={ft(report.crossDomain)}
            />
            <AnalysisSection
              icon="🧠"
              title={`${mbtiType} 深度人格画像`}
              content={ft(report.personality)}
            />
            <AnalysisSection
              icon="🎯"
              title="品味盲区"
              content={ft(report.blindSpots)}
            />
            {/* Recommendations with Douban links */}
            {report.recommendations && report.recommendations.length > 0 && (
              <div className="card-glass rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#e94560]">
                  💡 {mbtiType} 专属推荐
                </h3>
                <p className="text-xs text-gray-500">
                  点击可跳转豆瓣搜索
                </p>
                <div className="space-y-3">
                  {report.recommendations
                    .filter((r) => !r.alreadyConsumed)
                    .map((rec, i) => (
                      <a
                        key={i}
                        href={getDoubanSearchUrl(rec.title, rec.type)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] transition-colors cursor-pointer group"
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
                            <span className="text-sm text-white font-medium truncate group-hover:text-[#e94560] transition-colors">
                              {rec.title}
                            </span>
                            <MatchBadge score={rec.matchScore} />
                            <span className="text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              ↗
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                            {ft(rec.reason)}
                          </p>
                        </div>
                      </a>
                    ))}
                </div>
              </div>
            )}
          </div>
          )
        )}

        {/* CTA: Compare */}
        <div className="animate-fade-in-up animate-delay-300">
          <div className="card-glass rounded-2xl p-6 text-center space-y-3">
            <div className="text-2xl">👥</div>
            <h3 className="text-lg font-bold text-white">
              品味双人对比
            </h3>
            <p className="text-sm text-gray-400">
              邀请另一个人来测，看看你们的书影音 MBTI 有多配
            </p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="w-full py-3 rounded-xl accent-gradient text-white font-medium hover:opacity-90 transition-opacity"
            >
              邀请 TA 来对比
            </button>
          </div>
        </div>

        {/* === Explore More：网易云 + 塔罗，一行两格 === */}
        <div className="animate-fade-in-up animate-delay-300">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-400 flex items-center gap-2">
              <span className="text-[#667eea]">🌐</span> 探索更多
            </h2>
            <div className="grid grid-cols-2 gap-3 w-full">
              {[
                { icon: "🎧", name: "网易云音乐", desc: "听歌品味分析", color: "#e94560", badge: "即将上线" },
                { icon: "🔮", name: "赛博神算子", desc: "AI 塔罗占卜", color: "#a855f7", badge: "可体验", href: "https://cyber-oracle-nine.vercel.app" },
              ].map((item) => (
                <a
                  key={item.name}
                  href={(item as any).href || undefined}
                  target={(item as any).href ? "_blank" : undefined}
                  rel={(item as any).href ? "noopener noreferrer" : undefined}
                  className={`card-glass rounded-xl p-4 pr-14 space-y-1.5 relative overflow-visible min-w-0 flex flex-col justify-between min-h-[72px] ${(item as any).href ? "cursor-pointer hover:bg-white/[0.06] transition-colors" : "cursor-default"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-xs font-semibold text-white">{item.name}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-tight">{item.desc}</p>
                  <span
                    className="absolute top-2.5 right-2.5 text-[9px] px-2 py-0.5 rounded-full font-medium"
                    style={{ color: item.color, background: `${item.color}18` }}
                  >
                    {item.badge}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Tip / 请作者喝杯咖啡 */}
        <div className="animate-fade-in-up animate-delay-400">
          <div className="card-glass rounded-2xl p-6 text-center space-y-4">
            <div className="text-2xl">☕</div>
            <h3 className="text-sm font-bold text-white">请作者喝杯咖啡</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              如果这个工具给你带来了快乐，可以赞赏支持一下
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/tip-qrcode.jpg"
              alt="赞赏二维码"
              className="w-52 h-52 mx-auto rounded-xl cursor-pointer hover:opacity-90 transition-opacity object-cover object-center"
              onClick={() => setShowTipModal(true)}
            />
            <p className="text-[10px] text-gray-500">
              微信里长按识别二维码 · 电脑端用微信扫码
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-3 pb-8 animate-fade-in-up animate-delay-400">
          <Link
            href="/upload"
            className="inline-block px-6 py-2.5 rounded-xl card-glass text-white text-sm hover:bg-white/10 transition-colors"
          >
            再测一个人
          </Link>
          <p className="text-xs text-gray-500">
            分享链接给朋友，看看谁是什么书影音 MBTI
          </p>
        </div>
      </div>

      {showInviteModal && (
        <InviteModal
          reportId={id}
          report={report}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {showTipModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setShowTipModal(false)}
        >
          <div className="max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-sm mb-4">微信内长按识别二维码</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/tip-qrcode.jpg"
              alt="赞赏二维码"
              className="w-[340px] max-w-full aspect-square mx-auto rounded-2xl object-cover object-center"
            />
            <p className="text-gray-400 text-xs mt-4">点击空白处关闭（可双指放大）</p>
          </div>
        </div>
      )}

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
        <p className="text-xs text-gray-500">深度分析中 · 约需 15-20 秒</p>
      </div>
      <div className="pt-3 border-t border-white/5">
        <p className="text-[11px] text-gray-500 italic leading-relaxed">
          💡 {funFact}
        </p>
      </div>
    </div>
  );
}

function StatBlock({
  value,
  label,
  emoji,
}: {
  value: number;
  label: string;
  emoji: string;
}) {
  return (
    <div className="card-glass rounded-xl p-3 text-center">
      <div className="text-lg mb-0.5">{emoji}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

function AnalysisSection({
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

function ExpandSkeleton({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="card-glass rounded-xl p-5 space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-sm font-bold text-gray-500">{label}</span>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-white/5 rounded-full w-4/5" />
        <div className="h-3 bg-white/5 rounded-full w-3/5" />
        <div className="h-3 bg-white/5 rounded-full w-2/3" />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full w-1/3 accent-gradient rounded-full animate-[pulse_2s_ease-in-out_infinite]" />
        </div>
        <span className="text-[10px] text-gray-600">生成中...</span>
      </div>
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
// deploy trigger Mon Feb 23 00:08:06 CST 2026
