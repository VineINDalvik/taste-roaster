"use client";

import { useRef, useCallback } from "react";
import RadarChart from "./RadarChart";

interface ShareCardProps {
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
  itemCount: number;
  doubanName?: string;
}

export default function ShareCard({
  label,
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
      link.download = `毒舌品味官-${label}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("下载失败，请截图保存");
    }
  }, [label]);

  const handleCopyLink = useCallback(() => {
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => alert("链接已复制，快分享给朋友吧！"));
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
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-xs tracking-widest text-gray-400 mb-2">
            {doubanName ? `${doubanName} 的` : ""}毒舌品味鉴定
          </div>
          <div className="text-3xl font-bold text-gradient mb-3">{label}</div>
          <div className="text-sm text-gray-300 leading-relaxed px-2">
            &ldquo;{roast}&rdquo;
          </div>
        </div>

        {/* Radar Chart */}
        <div className="my-4">
          <RadarChart data={radarData} size={200} />
        </div>

        {/* Summary */}
        <div className="text-xs text-gray-400 text-center leading-relaxed mb-4">
          {summary}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 border-t border-white/10 pt-3">
          <span>基于 {itemCount} 条书影音记录</span>
          <span>来看看AI怎么评价你 →</span>
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
