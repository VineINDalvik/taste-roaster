"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  analysis: string;
  mbtiType: string;
}

export default function MoviePortrait({ analysis, mbtiType }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const sentences = analysis
    .split(/(?<=[。！？\n])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !revealed) setRevealed(true);
      },
      { threshold: 0.2 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [revealed]);

  useEffect(() => {
    if (!revealed || visibleCount >= sentences.length) return;
    const timer = setTimeout(() => setVisibleCount((v) => v + 1), 400);
    return () => clearTimeout(timer);
  }, [revealed, visibleCount, sentences.length]);

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a14] via-[#111128] to-[#1a1a2e]" />

      {/* Film strip left */}
      <div className="absolute left-0 top-0 bottom-0 w-5 flex flex-col justify-center gap-[6px] py-4 pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`l${i}`}
            className="mx-auto w-3 h-2 rounded-[1px] bg-white/[0.04]"
          />
        ))}
      </div>

      {/* Film strip right */}
      <div className="absolute right-0 top-0 bottom-0 w-5 flex flex-col justify-center gap-[6px] py-4 pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={`r${i}`}
            className="mx-auto w-3 h-2 rounded-[1px] bg-white/[0.04]"
          />
        ))}
      </div>

      {/* Film reel icon */}
      <div className="absolute top-4 right-7 pointer-events-none">
        <div className="film-reel-spin w-8 h-8 rounded-full border border-white/[0.06] flex items-center justify-center">
          <div className="w-3 h-3 rounded-full border border-white/[0.08]" />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <div
              key={deg}
              className="absolute w-[1px] h-3 bg-white/[0.05]"
              style={{ transform: `rotate(${deg}deg) translateY(-2px)` }}
            />
          ))}
        </div>
      </div>

      {/* Cinematic light leak */}
      <div
        className="absolute -top-10 left-1/3 w-32 h-32 rounded-full opacity-[0.06] blur-3xl"
        style={{ background: "radial-gradient(circle, #f5c518, transparent)" }}
      />

      <div className="relative z-10 p-6 pl-8 pr-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-900/40 to-indigo-900/40 flex items-center justify-center backdrop-blur-sm border border-blue-500/15">
            <span className="text-lg">🎬</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-300">观影品味画像</h3>
            <p className="text-[11px] text-blue-400/40">
              {mbtiType} 的光影密码
            </p>
          </div>
        </div>

        <div className="space-y-3 min-h-[100px]">
          {sentences.map((sentence, i) => (
            <p
              key={i}
              className="leading-relaxed transition-all duration-700 ease-out"
              style={{
                opacity: i < visibleCount ? 1 : 0,
                transform: `translateX(${i < visibleCount ? 0 : 20}px)`,
                transitionDelay: `${i * 100}ms`,
                color:
                  i === 0
                    ? "rgba(147, 197, 253, 0.95)"
                    : "rgba(209, 213, 219, 0.8)",
                fontSize: i === 0 ? "15px" : "13px",
                fontWeight: i === 0 ? 500 : 400,
              }}
            >
              {sentence}
            </p>
          ))}
        </div>

        {!revealed && (
          <p className="text-xs text-blue-400/30 text-center animate-pulse">
            灯光暗下，你的银幕人生正在上映
          </p>
        )}
      </div>
    </div>
  );
}
