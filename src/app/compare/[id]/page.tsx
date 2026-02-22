"use client";

import { useEffect, useState, use, useRef, useCallback } from "react";
import Link from "next/link";

interface MBTIDimension {
  letter: string;
  score: number;
  evidence: string;
}

interface PersonData {
  name: string;
  mbtiType: string;
  mbtiTitle: string;
  dimensions: {
    ie: MBTIDimension;
    ns: MBTIDimension;
    tf: MBTIDimension;
    jp: MBTIDimension;
  };
  radarData: Record<string, number>;
  bookCount: number;
  movieCount: number;
  musicCount: number;
}

interface ComparisonData {
  matchScore: number;
  matchTitle: string;
  overview: string;
  similarities: { point: string; detail: string }[];
  differences: { point: string; detail: string }[];
  chemistry: string;
  sharedWorks: string[];
  recommendTogether: { title: string; type: string; reason: string }[];
}

interface CompareData {
  compareId: string;
  personA: PersonData;
  personB: PersonData;
  comparison: ComparisonData;
}

const DIM_KEYS = ["ie", "ns", "tf", "jp"] as const;
const DIM_LABELS: Record<string, [string, string]> = {
  ie: ["I", "E"],
  ns: ["N", "S"],
  tf: ["T", "F"],
  jp: ["J", "P"],
};

const RADAR_LABELS: [string, string][] = [
  ["depth", "深度"],
  ["breadth", "广度"],
  ["uniqueness", "独特性"],
  ["emotionSensitivity", "情感力"],
  ["timeSpan", "时代感"],
];

function getMatchColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#667eea";
  if (score >= 40) return "#f5c518";
  return "#e94560";
}

function getMatchLabel(score: number) {
  if (score >= 90) return "灵魂伴侣";
  if (score >= 70) return "品味知己";
  if (score >= 50) return "互补搭档";
  if (score >= 30) return "平行世界";
  return "文化反义词";
}

export default function CompareResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<CompareData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`taste-compare-${id}`);
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch {
        setError("对比数据损坏");
      }
    } else {
      setError("对比报告不存在");
    }
  }, [id]);

  if (error || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="text-4xl">😵</div>
          <p className="text-gray-400">{error || "加载中..."}</p>
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

  const { personA, personB, comparison } = data;
  const matchColor = getMatchColor(comparison.matchScore);

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        <Link
          href="/upload"
          className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← 返回
        </Link>

        {/* Match Score Hero */}
        <div className="animate-fade-in-up">
          <CompareCard
            personA={personA}
            personB={personB}
            comparison={comparison}
          />
        </div>

        {/* Dimension Comparison */}
        <div className="card-glass rounded-xl p-5 space-y-4 animate-fade-in-up animate-delay-100">
          <h3 className="text-sm font-bold text-[#667eea]">
            🧬 四维度对比
          </h3>
          {DIM_KEYS.map((key) => (
            <DualDimensionBar
              key={key}
              dimKey={key}
              dimA={personA.dimensions[key]}
              dimB={personB.dimensions[key]}
              nameA={personA.name}
              nameB={personB.name}
            />
          ))}
        </div>

        {/* Dual Radar */}
        <div className="card-glass rounded-xl p-5 animate-fade-in-up animate-delay-100">
          <h3 className="text-sm font-bold text-[#667eea] mb-3">
            📊 品味雷达对比
          </h3>
          <DualRadar
            dataA={personA.radarData}
            dataB={personB.radarData}
            nameA={personA.name}
            nameB={personB.name}
          />
        </div>

        {/* Overview */}
        <div className="card-glass rounded-xl p-5 space-y-2 animate-fade-in-up animate-delay-200">
          <h3 className="text-sm font-bold text-[#e94560]">
            💡 匹配解读
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed">
            {comparison.overview}
          </p>
        </div>

        {/* Similarities & Differences */}
        <div className="grid grid-cols-1 gap-4 animate-fade-in-up animate-delay-200">
          <div className="card-glass rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-green-400">
              ✅ 相同点
            </h3>
            <div className="space-y-3">
              {comparison.similarities.map((s, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-xs font-medium text-white">
                    {s.point}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {s.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="card-glass rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#e94560]">
              ⚡ 不同点
            </h3>
            <div className="space-y-3">
              {comparison.differences.map((d, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-xs font-medium text-white">
                    {d.point}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {d.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chemistry */}
        <div className="card-glass rounded-xl p-5 space-y-2 animate-fade-in-up animate-delay-200">
          <h3 className="text-sm font-bold text-[#f5c518]">
            ⚗️ 化学反应
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
            {comparison.chemistry}
          </p>
        </div>

        {/* Shared Works - Venn-like */}
        {comparison.sharedWorks.length > 0 && (
          <div className="card-glass rounded-xl p-5 space-y-3 animate-fade-in-up animate-delay-200">
            <h3 className="text-sm font-bold text-[#667eea]">
              🔗 品味交集
            </h3>
            <p className="text-xs text-gray-500 mb-2">
              你们都看过/读过/听过的作品
            </p>
            <div className="flex flex-wrap gap-2">
              {comparison.sharedWorks.map((w, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    background: `rgba(102, 126, 234, ${0.1 + (i % 3) * 0.05})`,
                    color: "#a5b4fc",
                    border: "1px solid rgba(102, 126, 234, 0.2)",
                  }}
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recommend Together */}
        {comparison.recommendTogether.length > 0 && (
          <div className="card-glass rounded-xl p-5 space-y-3 animate-fade-in-up animate-delay-300">
            <h3 className="text-sm font-bold text-[#e94560]">
              💡 推荐你们一起
            </h3>
            <div className="space-y-3">
              {comparison.recommendTogether.map((rec, i) => (
                <a
                  key={i}
                  href={`https://search.douban.com/${rec.type === "book" ? "book" : rec.type === "movie" ? "movie" : "music"}/subject_search?search_text=${encodeURIComponent(rec.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] transition-colors group"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm">
                    {rec.type === "book"
                      ? "📖"
                      : rec.type === "movie"
                        ? "🎬"
                        : "🎵"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-white font-medium group-hover:text-[#e94560] transition-colors">
                      {rec.title}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {rec.reason}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                    ↗
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Stats comparison */}
        <div className="card-glass rounded-xl p-5 animate-fade-in-up animate-delay-300">
          <h3 className="text-sm font-bold text-[#667eea] mb-3">
            📊 数据对比
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs text-gray-500 text-center font-medium">
                {personA.name}
              </div>
              <div className="flex justify-center gap-2 text-xs">
                <span className="text-gray-400">📚{personA.bookCount}</span>
                <span className="text-gray-400">🎬{personA.movieCount}</span>
                <span className="text-gray-400">🎵{personA.musicCount}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-gray-500 text-center font-medium">
                {personB.name}
              </div>
              <div className="flex justify-center gap-2 text-xs">
                <span className="text-gray-400">📚{personB.bookCount}</span>
                <span className="text-gray-400">🎬{personB.movieCount}</span>
                <span className="text-gray-400">🎵{personB.musicCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-3 pb-8 animate-fade-in-up animate-delay-300">
          <Link
            href="/upload"
            className="inline-block px-6 py-2.5 rounded-xl card-glass text-white text-sm hover:bg-white/10 transition-colors"
          >
            测测另一个人
          </Link>
          <p className="text-xs text-gray-500">
            豆瓣书影音 MBTI · 品味即人格
          </p>
        </div>
      </div>
    </main>
  );
}

function CompareCard({
  personA,
  personB,
  comparison,
}: {
  personA: PersonData;
  personB: PersonData;
  comparison: ComparisonData;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const matchColor = getMatchColor(comparison.matchScore);

  const handleDownload = useCallback(async () => {
    const card = cardRef.current;
    if (!card) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(card, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `MBTI对比-${personA.mbtiType}vs${personB.mbtiType}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("下载失败，请截图保存");
    }
  }, [personA.mbtiType, personB.mbtiType]);

  const handleCopy = useCallback(() => {
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => alert("链接已复制！"));
    } else {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("链接已复制！");
    }
  }, []);

  return (
    <div className="space-y-4">
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl mx-auto max-w-sm"
        style={{
          background:
            "linear-gradient(135deg, #0f0c29 0%, #1a1a2e 30%, #16213e 60%, #0f3460 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-15 blur-3xl"
          style={{
            background: "radial-gradient(circle, #667eea, transparent)",
          }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full opacity-15 blur-3xl"
          style={{
            background: "radial-gradient(circle, #e94560, transparent)",
          }}
        />

        <div className="relative z-10 p-6">
          <div className="text-[10px] tracking-[0.3em] text-gray-500 uppercase text-center mb-4">
            品味双人对比
          </div>

          {/* VS Layout */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <div
                className="text-2xl font-black tracking-wider mb-0.5"
                style={{ color: "#667eea" }}
              >
                {personA.mbtiType}
              </div>
              <div className="text-[10px] text-gray-400">
                {personA.name}
              </div>
              <div className="text-[9px] text-gray-500 mt-0.5">
                {personA.mbtiTitle}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div
                className="text-3xl font-black"
                style={{ color: matchColor }}
              >
                {comparison.matchScore}
              </div>
              <div className="text-[8px] text-gray-500 uppercase tracking-wider">
                match
              </div>
            </div>
            <div className="text-center">
              <div
                className="text-2xl font-black tracking-wider mb-0.5"
                style={{ color: "#e94560" }}
              >
                {personB.mbtiType}
              </div>
              <div className="text-[10px] text-gray-400">
                {personB.name}
              </div>
              <div className="text-[9px] text-gray-500 mt-0.5">
                {personB.mbtiTitle}
              </div>
            </div>
          </div>

          {/* Match title */}
          <div className="text-center mb-3">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: `${matchColor}15`,
                color: matchColor,
                border: `1px solid ${matchColor}30`,
              }}
            >
              {comparison.matchTitle}
            </span>
          </div>

          {/* Overview */}
          <p className="text-[11px] text-gray-400 text-center leading-relaxed mb-3">
            {comparison.overview}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between text-[10px] text-gray-600 border-t border-white/5 pt-3">
            <span>{getMatchLabel(comparison.matchScore)}</span>
            <span className="text-[#667eea]">
              测测你们的书影音 MBTI →
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 max-w-sm mx-auto">
        <button
          onClick={handleDownload}
          className="flex-1 py-3 rounded-xl accent-gradient text-white font-medium text-sm hover:opacity-90 transition-opacity"
        >
          保存卡片
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 py-3 rounded-xl card-glass text-white font-medium text-sm hover:bg-white/10 transition-colors"
        >
          复制链接
        </button>
      </div>
    </div>
  );
}

function DualDimensionBar({
  dimKey,
  dimA,
  dimB,
  nameA,
  nameB,
}: {
  dimKey: string;
  dimA: MBTIDimension;
  dimB: MBTIDimension;
  nameA: string;
  nameB: string;
}) {
  const [leftLetter, rightLetter] = DIM_LABELS[dimKey] ?? ["?", "?"];

  const isALeft = dimA.letter === leftLetter;
  const isBLeft = dimB.letter === leftLetter;
  const pctA = dimA.score;
  const pctB = dimB.score;

  const posA = isALeft ? 50 - (pctA / 2) : 50 + (pctA / 2);
  const posB = isBLeft ? 50 - (pctB / 2) : 50 + (pctB / 2);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-gray-400">{leftLetter}</span>
        <span className="text-gray-400">{rightLetter}</span>
      </div>
      <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
        <div className="absolute left-1/2 top-0 w-px h-full bg-white/10" />
        <div
          className="absolute top-0.5 w-2 h-2 rounded-full"
          style={{
            left: `${posA}%`,
            transform: "translateX(-50%)",
            background: "#667eea",
            boxShadow: "0 0 6px #667eea60",
          }}
        />
        <div
          className="absolute top-0.5 w-2 h-2 rounded-full"
          style={{
            left: `${posB}%`,
            transform: "translateX(-50%)",
            background: "#e94560",
            boxShadow: "0 0 6px #e9456060",
          }}
        />
      </div>
      <div className="flex justify-between text-[9px]">
        <span style={{ color: "#667eea" }}>
          {nameA}: {dimA.letter}{pctA}%
        </span>
        <span style={{ color: "#e94560" }}>
          {nameB}: {dimB.letter}{pctB}%
        </span>
      </div>
    </div>
  );
}

function DualRadar({
  dataA,
  dataB,
  nameA,
  nameB,
}: {
  dataA: Record<string, number>;
  dataB: Record<string, number>;
  nameA: string;
  nameB: string;
}) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 25;
  const count = RADAR_LABELS.length;

  const getPoint = (i: number, val: number) => {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
    const ratio = val / 100;
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
    };
  };

  const pointsA = RADAR_LABELS.map(([key], i) =>
    getPoint(i, dataA[key] ?? 50)
  );
  const pointsB = RADAR_LABELS.map(([key], i) =>
    getPoint(i, dataB[key] ?? 50)
  );
  const polyA = pointsA.map((p) => `${p.x},${p.y}`).join(" ");
  const polyB = pointsB.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div>
      <svg
        width="100%"
        viewBox={`0 0 ${size} ${size}`}
        className="max-w-[200px] mx-auto"
      >
        {[0.25, 0.5, 0.75, 1].map((s) => (
          <polygon
            key={s}
            points={RADAR_LABELS.map((_, i) => {
              const p = getPoint(i, s * 100);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.5"
          />
        ))}
        {RADAR_LABELS.map(([, label], i) => {
          const p = getPoint(i, 120);
          return (
            <text
              key={label}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.4)"
              fontSize="8"
            >
              {label}
            </text>
          );
        })}
        <polygon
          points={polyA}
          fill="rgba(102,126,234,0.12)"
          stroke="#667eea"
          strokeWidth="1.5"
        />
        <polygon
          points={polyB}
          fill="rgba(233,69,96,0.12)"
          stroke="#e94560"
          strokeWidth="1.5"
        />
      </svg>
      <div className="flex justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5 text-[10px]">
          <div className="w-3 h-1.5 rounded-full bg-[#667eea]" />
          <span className="text-gray-400">{nameA}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <div className="w-3 h-1.5 rounded-full bg-[#e94560]" />
          <span className="text-gray-400">{nameB}</span>
        </div>
      </div>
    </div>
  );
}
