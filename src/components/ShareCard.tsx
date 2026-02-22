"use client";

import { useRef, useCallback } from "react";

interface MBTIDimension {
  letter: string;
  score: number;
  evidence: string;
}

interface ShareCardProps {
  mbtiType: string;
  mbtiTitle: string;
  dimensions: {
    ie: MBTIDimension;
    ns: MBTIDimension;
    tf: MBTIDimension;
    jp: MBTIDimension;
  };
  roast: string;
  radarData: {
    depth: number;
    breadth: number;
    uniqueness: number;
    emotionSensitivity: number;
    timeSpan: number;
  };
  summary: string;
  itemCount: number;
  doubanName?: string;
  bookCount?: number;
  movieCount?: number;
  musicCount?: number;
}

const DIM_LABELS: Record<string, [string, string]> = {
  ie: ["I 内向", "E 外向"],
  ns: ["N 直觉", "S 感知"],
  tf: ["T 思维", "F 情感"],
  jp: ["J 判断", "P 感知"],
};

const RADAR_LABELS: [string, string][] = [
  ["depth", "深度"],
  ["breadth", "广度"],
  ["uniqueness", "独特性"],
  ["emotionSensitivity", "情感力"],
  ["timeSpan", "时代感"],
];

function DimensionBar({
  dimKey,
  dim,
}: {
  dimKey: string;
  dim: MBTIDimension;
}) {
  const [leftLabel, rightLabel] = DIM_LABELS[dimKey] ?? ["?", "?"];
  const isLeft = dim.letter === leftLabel[0];
  const pct = dim.score;

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[9px]">
        <span className={isLeft ? "text-white font-bold" : "text-gray-500"}>
          {leftLabel}
        </span>
        <span className="text-gray-600 font-mono text-[8px]">{pct}%</span>
        <span className={!isLeft ? "text-white font-bold" : "text-gray-500"}>
          {rightLabel}
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden relative">
        {isLeft ? (
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, #667eea, #764ba2)",
            }}
          />
        ) : (
          <div
            className="absolute right-0 top-0 h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, #e94560, #f5c518)",
            }}
          />
        )}
      </div>
    </div>
  );
}

function MiniRadar({
  data,
}: {
  data: Record<string, number>;
}) {
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 15;
  const count = RADAR_LABELS.length;

  const getPoint = (i: number, val: number) => {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
    const ratio = val / 100;
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
    };
  };

  const points = RADAR_LABELS.map(([key], i) =>
    getPoint(i, (data as Record<string, number>)[key] ?? 50)
  );
  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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
        const p = getPoint(i, 115);
        return (
          <text
            key={label}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.4)"
            fontSize="7"
          >
            {label}
          </text>
        );
      })}
      <polygon
        points={polygon}
        fill="rgba(102,126,234,0.15)"
        stroke="#667eea"
        strokeWidth="1.5"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill="#667eea" />
      ))}
    </svg>
  );
}

export default function ShareCard({
  mbtiType,
  mbtiTitle,
  dimensions,
  roast,
  radarData,
  summary,
  itemCount,
  doubanName,
  bookCount,
  movieCount,
  musicCount,
}: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

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
      link.download = `书影音人格-${mbtiType}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("下载失败，请截图保存");
    }
  }, [mbtiType]);

  const handleCopyLink = useCallback(() => {
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => alert("链接已复制，快分享给朋友吧！"));
    } else {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("链接已复制，快分享给朋友吧！");
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
        {/* Decorative glow */}
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #667eea, transparent)" }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, #e94560, transparent)" }}
        />

        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="text-[10px] tracking-[0.3em] text-gray-500 uppercase mb-3">
              {doubanName ? `${doubanName} 的` : ""}书影音人格
            </div>
            <div
              className="text-5xl font-black mb-1 tracking-[0.15em]"
              style={{
                background:
                  "linear-gradient(135deg, #667eea 0%, #e94560 50%, #f5c518 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {mbtiType}
            </div>
            <div className="text-sm text-[#e94560] font-medium mb-3">
              {mbtiTitle}
            </div>
          </div>

          {/* Roast */}
          <div className="bg-white/[0.03] rounded-lg px-4 py-2.5 mb-4 border border-white/5">
            <p className="text-xs text-gray-300 text-center leading-relaxed italic">
              &ldquo;{roast}&rdquo;
            </p>
          </div>

          {/* MBTI Bars */}
          <div className="space-y-2 mb-4">
            <DimensionBar dimKey="ie" dim={dimensions.ie} />
            <DimensionBar dimKey="ns" dim={dimensions.ns} />
            <DimensionBar dimKey="tf" dim={dimensions.tf} />
            <DimensionBar dimKey="jp" dim={dimensions.jp} />
          </div>

          {/* Middle row: Radar + Stats */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0">
              <MiniRadar data={radarData} />
            </div>
            <div className="flex-1 space-y-2">
              {bookCount != null && (
                <MiniStat emoji="📚" value={bookCount} label="本书" />
              )}
              {movieCount != null && (
                <MiniStat emoji="🎬" value={movieCount} label="部电影" />
              )}
              {musicCount != null && (
                <MiniStat emoji="🎵" value={musicCount} label="首音乐" />
              )}
            </div>
          </div>

          {/* Summary */}
          <p className="text-[11px] text-gray-400 text-center leading-relaxed mb-4">
            {summary}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between text-[10px] text-gray-600 border-t border-white/5 pt-3">
            <span>基于 {itemCount} 条书影音数据</span>
            <span className="text-[#667eea]">测测你的书影音人格 →</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 max-w-sm mx-auto">
        <button
          onClick={handleDownload}
          className="flex-1 py-3 rounded-xl accent-gradient text-white font-medium text-sm hover:opacity-90 transition-opacity"
        >
          保存卡片
        </button>
        <button
          onClick={handleCopyLink}
          className="flex-1 py-3 rounded-xl card-glass text-white font-medium text-sm hover:bg-white/10 transition-colors"
        >
          复制链接
        </button>
      </div>
    </div>
  );
}

function MiniStat({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-1.5">
      <span className="text-xs">{emoji}</span>
      <span className="text-sm font-bold text-white">{value}</span>
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  );
}
