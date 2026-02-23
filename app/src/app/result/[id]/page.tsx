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
  "生成专属推荐（排除已读）...",
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

function fixMbtiInText(
  text: string | undefined,
  aiType: string | undefined,
  correctType: string
): string {
  if (!text) return "";
  if (!aiType || aiType === correctType) return text;
  return text.replaceAll(aiType, correctType).replaceAll(aiType.toLowerCase(), correctType);
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

  // Auto-trigger expand load when report is ready but expand content is missing
  useEffect(() => {
    if (
      report?.input &&
      report?.mbti?.type &&
      !hasExpandContent &&
      !expanding &&
      !expandFailed
    ) {
      handleLoadExpand();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id, hasExpandContent]);

  const handleLoadExpand = useCallback(async () => {
    if (!report?.input || !report?.mbti?.type || expanding) return;
    setExpanding(true);
    setExpandFailed(false);

    try {
      const res = await fetch(`/api/expand/${id}`, {
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

    // Copy link first
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

    setUnlocking(true);
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
        <div className="grid grid-cols-3 gap-3 animate-fade-in-up animate-delay-100">
          <StatBlock value={report.bookCount} label="本书" emoji="📚" />
          <StatBlock value={report.movieCount} label="部电影" emoji="🎬" />
          <StatBlock value={report.musicCount} label="首音乐" emoji="🎵" />
        </div>

        {report.sampleCount && (
          <div className="text-center text-xs text-gray-500 animate-fade-in-up">
            基于 {report.sampleCount} 条采样数据 · 实际总量{" "}
            {report.bookCount + report.movieCount + report.musicCount}
          </div>
        )}

        {/* === FREE CONTENT: Book/Movie/Music Analysis === */}
        <div className="space-y-4 animate-fade-in-up animate-delay-200">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-[#667eea]">✦</span> {mbtiType}{" "}
            品味报告
          </h2>

          {/* Book Analysis */}
          {report.bookAnalysis ? (
            <ShareableCard filename={`阅读画像-${mbtiType}`}>
              <BookPortrait
                analysis={ft(report.bookAnalysis)!}
                mbtiType={mbtiType}
              />
            </ShareableCard>
          ) : expanding ? (
            <ExpandSkeleton icon="📚" label="阅读画像" />
          ) : null}

          {/* Movie Analysis */}
          {report.movieAnalysis ? (
            <ShareableCard filename={`观影画像-${mbtiType}`}>
              <MoviePortrait
                analysis={ft(report.movieAnalysis)!}
                mbtiType={mbtiType}
              />
            </ShareableCard>
          ) : expanding ? (
            <ExpandSkeleton icon="🎬" label="观影画像" />
          ) : null}

          {/* Music Analysis */}
          {report.musicAnalysis ? (
            <ShareableCard filename={`音乐画像-${mbtiType}`}>
              <MusicPortrait
                analysis={ft(report.musicAnalysis)!}
                mbtiType={mbtiType}
              />
            </ShareableCard>
          ) : expanding ? (
            <ExpandSkeleton icon="🎵" label="音乐画像" />
          ) : null}

          {/* Retry button on failure */}
          {!hasExpandContent && !expanding && expandFailed && (
            <button
              onClick={handleLoadExpand}
              className="w-full flex items-center gap-4 p-4 rounded-xl card-glass border border-red-500/20 hover:border-[#667eea]/40 transition-all group"
            >
              <span className="text-xl flex-shrink-0">🔄</span>
              <span className="flex-1 text-left">
                <span className="block text-sm font-semibold text-white">品味分析加载失败</span>
                <span className="block text-xs text-gray-500 mt-0.5">点击重试 · 书影音逐项分析 + 品味时间线</span>
              </span>
              <span className="text-[#667eea] group-hover:translate-x-1 transition-transform">→</span>
            </button>
          )}
        </div>

        {/* === FREE CONTENT: Evolution Curve === */}
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

        {/* Timeline skeleton while loading */}
        {!hasTimeline && expanding && (
          <ExpandSkeleton icon="📅" label="品味进化时间线" />
        )}

        {/* Timeline retry button */}
        {hasExpandContent && !hasTimeline && !expanding && (
          <button
            onClick={handleLoadExpand}
            className="w-full flex items-center gap-4 p-4 rounded-xl card-glass border border-[#667eea]/20 hover:border-[#667eea]/40 transition-all group animate-fade-in-up animate-delay-200"
            style={{ background: "linear-gradient(135deg, rgba(102,126,234,0.06), rgba(233,69,96,0.04))" }}
          >
            <span className="text-xl flex-shrink-0">📅</span>
            <span className="flex-1 text-left">
              <span className="block text-sm font-semibold text-white">重新加载时间线</span>
              <span className="block text-xs text-gray-500 mt-0.5">品味分析已加载，点击重试时间线</span>
            </span>
            <span className="text-[#667eea] group-hover:translate-x-1 transition-transform">↻</span>
          </button>
        )}

        {/* === UNLOCK SECTION: Deep Analysis === */}
        {!isDeepUnlocked ? (
          unlocking ? (
            <UnlockingOverlay step={unlockStep} funFact={funFact} />
          ) : (
            <div className="animate-fade-in-up animate-delay-300">
              <div className="card-glass rounded-2xl p-6 text-center space-y-4">
                <div className="text-2xl">🔮</div>
                <h3 className="text-lg font-bold text-white">
                  分享解锁深度解读
                </h3>
                <ul className="text-sm text-gray-400 space-y-1.5 text-left max-w-xs mx-auto">
                  <li className="flex items-start gap-2">
                    <span className="text-[#e94560]">✦</span>
                    跨领域品味关联分析
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#e94560]">✦</span>
                    {mbtiType} 深度人格画像
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#e94560]">✦</span>
                    品味盲区诊断
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#e94560]">✦</span>
                    AI 专属推荐（排除已读/已看/已听）
                  </li>
                </ul>
                <button
                  onClick={handleDeepUnlock}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-medium hover:opacity-90 transition-opacity"
                >
                  分享并解锁 (免费)
                </button>
                <p className="text-xs text-gray-500">
                  链接已自动复制到剪贴板 · 分析约需 15-20 秒
                </p>
              </div>
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
                  已排除你读过/看过/听过的作品 · 点击可跳转豆瓣
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
                            {rec.reason}
                          </p>
                        </div>
                      </a>
                    ))}
                </div>
              </div>
            )}
          </div>
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

        {/* === Explore More Platforms === */}
        <div className="animate-fade-in-up animate-delay-300">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-400 flex items-center gap-2">
              <span className="text-[#667eea]">🌐</span> 探索更多品味维度
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: "🎧", name: "网易云音乐", desc: "听歌品味分析", color: "#e94560" },
                { icon: "📖", name: "微信读书", desc: "阅读品味画像", color: "#667eea" },
                { icon: "🎶", name: "Spotify", desc: "全球音乐品味", color: "#1DB954" },
                { icon: "🧩", name: "Chrome 插件", desc: "一键分析浏览器书签", color: "#f5c518" },
              ].map((item) => (
                <div
                  key={item.name}
                  className="card-glass rounded-xl p-3 space-y-1.5 relative overflow-hidden group cursor-default"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-xs font-medium text-white">{item.name}</span>
                  </div>
                  <p className="text-[10px] text-gray-500">{item.desc}</p>
                  <span
                    className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ color: item.color, background: `${item.color}15` }}
                  >
                    即将上线
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tip / Donation */}
        <div className="animate-fade-in-up animate-delay-400">
          <div className="card-glass rounded-2xl p-6 text-center space-y-4">
            <div className="text-2xl">☕</div>
            <h3 className="text-sm font-bold text-white">
              请作者喝杯咖啡
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              如果这个工具给你带来了快乐，可以赞赏支持一下
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/tip-qrcode.jpg"
              alt="赞赏二维码"
              className="w-40 h-40 mx-auto rounded-xl"
            />
            <p className="text-[10px] text-gray-500">
              长按识别 / 扫码赞赏
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
