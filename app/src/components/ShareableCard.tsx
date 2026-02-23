"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  filename?: string;
  className?: string;
}

export default function ShareableCard({
  children,
  filename = "品味画像",
  className = "",
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    const el = cardRef.current;
    if (!el || generating) return;

    setGenerating(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(el, {
        scale: 3,
        backgroundColor: "#1a1a2e",
        useCORS: true,
      });

      const isMobile = /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent);
      if (isMobile) {
        setPreviewSrc(canvas.toDataURL("image/png"));
      } else {
        const link = document.createElement("a");
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    } catch {
      alert("生成失败，请直接截图保存");
    } finally {
      setGenerating(false);
    }
  }, [generating, filename]);

  return (
    <>
      <div ref={cardRef} className={`relative group ${className}`}>
        {children}
        <button
          onClick={handleShare}
          disabled={generating}
          className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-xs text-white/60 hover:text-white hover:bg-black/60 transition-all opacity-60 md:opacity-0 md:group-hover:opacity-100"
          style={{ opacity: generating ? 1 : undefined }}
          title="保存为图片"
        >
          {generating ? (
            <span className="animate-spin text-[10px]">⏳</span>
          ) : (
            "📤"
          )}
        </button>
      </div>

      {previewSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewSrc(null)}
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
            onClick={() => setPreviewSrc(null)}
          >
            关闭
          </button>
        </div>
      )}
    </>
  );
}
