"use client";

import { useRef, useCallback, useState } from "react";

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
    wenqing: number;
    emo: number;
    shekong: number;
    kaogu: number;
    shangtou: number;
    chouxiang: number;
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
  ["wenqing", "文青浓度"],
  ["emo", "emo指数"],
  ["shekong", "社恐值"],
  ["kaogu", "考古癖"],
  ["shangtou", "上头指数"],
  ["chouxiang", "活人感"],
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

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-[11px] ${isLeft ? "text-white font-bold" : "text-gray-600"}`}
        >
          {leftLabel}
        </span>
        <span className="text-[10px] text-gray-600">{dim.score}%</span>
        <span
          className={`text-[11px] ${!isLeft ? "text-white font-bold" : "text-gray-600"}`}
        >
          {rightLabel}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.08] relative overflow-hidden">
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            width: `${dim.score}%`,
            [isLeft ? "left" : "right"]: 0,
            background: isLeft
              ? "linear-gradient(90deg, #667eea, #764ba2)"
              : "linear-gradient(90deg, #e94560, #f5c518)",
          }}
        />
      </div>
    </div>
  );
}

function MiniRadar({ data }: { data: Record<string, number> }) {
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 18;
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
            dominantBaseline="central"
            fill="rgba(255,255,255,0.4)"
            fontSize="8"
          >
            {label}
          </text>
        );
      })}
      <polygon
        points={polygon}
        fill="rgba(102, 126, 234, 0.15)"
        stroke="#667eea"
        strokeWidth="1.5"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#667eea" />
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
  doubanName,
  bookCount,
  movieCount,
  musicCount,
}: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleSaveCard = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/share-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mbtiType,
          mbtiTitle,
          roast,
          dimensions: {
            ie: { letter: dimensions.ie.letter, score: dimensions.ie.score },
            ns: { letter: dimensions.ns.letter, score: dimensions.ns.score },
            tf: { letter: dimensions.tf.letter, score: dimensions.tf.score },
            jp: { letter: dimensions.jp.letter, score: dimensions.jp.score },
          },
          radarData,
          summary,
          doubanName,
          bookCount,
          movieCount,
          musicCount,
        }),
      });

      if (!res.ok) throw new Error("API error");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const isMobile = /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent);
      if (isMobile) {
        setPreviewSrc(url);
      } else {
        const link = document.createElement("a");
        link.download = `书影音MBTI-${mbtiType}.png`;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch {
      alert("生成失败，请直接截图保存");
    } finally {
      setGenerating(false);
    }
  }, [mbtiType, mbtiTitle, roast, dimensions, radarData, summary, doubanName, bookCount, movieCount, musicCount]);

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
      {previewSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => { setPreviewSrc(null); URL.revokeObjectURL(previewSrc); }}
        >
          <p className="text-white text-sm mb-3 animate-pulse">
            👆 长按图片保存到相册
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="分享卡片"
            className="max-w-full max-h-[80vh] rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="mt-4 px-6 py-2 rounded-xl bg-white/10 text-white text-sm"
            onClick={() => { setPreviewSrc(null); URL.revokeObjectURL(previewSrc); }}
          >
            关闭
          </button>
        </div>
      )}

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
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #667eea, transparent)" }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, #e94560, transparent)" }}
        />

        <div className="relative z-10 p-7 pb-5">
          <div className="text-center mb-5">
            <div className="text-[11px] tracking-[0.25em] text-gray-500 uppercase mb-3">
              {doubanName ? `${doubanName} 的` : ""}书影音 MBTI
            </div>
            <div
              className="text-[56px] font-black mb-2 tracking-[0.12em] leading-none"
              style={{
                background:
                  "linear-gradient(135deg, #667eea 0%, #e94560 50%, #f5c518 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {mbtiType}
            </div>
            <div className="text-base text-[#e94560] font-semibold">
              {mbtiTitle}
            </div>
          </div>

          <div className="bg-white/[0.03] rounded-xl px-5 py-3 mb-5 border border-white/5">
            <p className="text-[13px] text-gray-300 text-center leading-[1.7] italic">
              &ldquo;{roast}&rdquo;
            </p>
          </div>

          <div className="space-y-3 mb-5">
            <DimensionBar dimKey="ie" dim={dimensions.ie} />
            <DimensionBar dimKey="ns" dim={dimensions.ns} />
            <DimensionBar dimKey="tf" dim={dimensions.tf} />
            <DimensionBar dimKey="jp" dim={dimensions.jp} />
          </div>

          <div className="border-t border-white/5 my-4" />

          <div className="flex items-center gap-4 mb-5">
            <div className="flex-shrink-0">
              <MiniRadar data={radarData} />
            </div>
            <div className="flex-1 space-y-2.5">
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

          <p className="text-[13px] text-gray-400 text-center leading-[1.8] mb-5">
            {summary}
          </p>

          <div className="flex items-center justify-between text-[11px] text-gray-600 border-t border-white/5 pt-3">
            <span>豆瓣书影音 MBTI</span>
            <span className="text-[#667eea]">测测你的书影音 MBTI →</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 max-w-sm mx-auto">
        <button
          onClick={handleSaveCard}
          disabled={generating}
          className="flex-1 py-3 rounded-xl accent-gradient text-white font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {generating ? "生成中..." : "保存卡片"}
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
    <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-3 py-2">
      <span className="text-sm">{emoji}</span>
      <span className="text-base font-bold text-white">{value}</span>
      <span className="text-[11px] text-gray-500">{label}</span>
    </div>
  );
}
