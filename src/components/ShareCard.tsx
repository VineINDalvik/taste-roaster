"use client";

import { useRef, useCallback } from "react";
import RadarChart from "./RadarChart";

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
}

const DIMENSION_LABELS: Record<string, [string, string]> = {
  ie: ["I 内向", "E 外向"],
  ns: ["N 直觉", "S 感知"],
  tf: ["T 思维", "F 情感"],
  jp: ["J 判断", "P 感知"],
};

function DimensionBar({
  dimKey,
  dim,
}: {
  dimKey: string;
  dim: MBTIDimension;
}) {
  const [leftLabel, rightLabel] = DIMENSION_LABELS[dimKey] ?? ["?", "?"];
  const isLeft = dim.letter === leftLabel[0];
  const pct = dim.score;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className={isLeft ? "text-white font-bold" : "text-gray-500"}>
          {leftLabel}
        </span>
        <span className={!isLeft ? "text-white font-bold" : "text-gray-500"}>
          {rightLabel}
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden relative">
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
      <div className="text-center">
        <span className="text-[10px] text-gray-400 font-mono">{pct}%</span>
      </div>
    </div>
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
}: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    const card = cardRef.current;
    if (!card) return;

    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(card, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `文化MBTI-${mbtiType}.png`;
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
        className="relative overflow-hidden rounded-2xl p-6 mx-auto max-w-sm"
        style={{
          background:
            "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-xs tracking-widest text-gray-400 mb-2">
            {doubanName ? `${doubanName} 的` : ""}文化 MBTI
          </div>
          <div className="text-5xl font-black text-gradient mb-1 tracking-wider">
            {mbtiType}
          </div>
          <div className="text-sm text-[#e94560] font-medium mb-3">
            {mbtiTitle}
          </div>
          <div className="text-xs text-gray-300 leading-relaxed px-2">
            &ldquo;{roast}&rdquo;
          </div>
        </div>

        {/* MBTI Dimension Bars */}
        <div className="space-y-2 my-4 px-2">
          <DimensionBar dimKey="ie" dim={dimensions.ie} />
          <DimensionBar dimKey="ns" dim={dimensions.ns} />
          <DimensionBar dimKey="tf" dim={dimensions.tf} />
          <DimensionBar dimKey="jp" dim={dimensions.jp} />
        </div>

        {/* Radar Chart */}
        <div className="my-4">
          <RadarChart data={radarData} size={180} />
        </div>

        {/* Summary */}
        <div className="text-xs text-gray-400 text-center leading-relaxed mb-3">
          {summary}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 border-t border-white/10 pt-3">
          <span>基于 {itemCount} 条书影音记录</span>
          <span>测测你的文化 MBTI →</span>
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
