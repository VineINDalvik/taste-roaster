"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  analysis: string;
  mbtiType: string;
}

export default function BookPortrait({ analysis, mbtiType }: Props) {
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
      <div className="absolute inset-0 bg-gradient-to-br from-[#2d1810] via-[#1a1207] to-[#1a1a2e]" />

      {/* Book pages decoration */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[40px] pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="book-page-flip absolute bottom-0 left-1/2 origin-bottom"
            style={{
              width: "100%",
              height: `${24 + i * 3}px`,
              transform: `translateX(-50%) rotateX(${65 - i * 8}deg)`,
              background: `linear-gradient(180deg, rgba(${210 - i * 15},${190 - i * 15},${160 - i * 15},${0.06 + i * 0.02}) 0%, transparent 100%)`,
              borderRadius: "2px 2px 0 0",
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* Floating book elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {["📖", "📝", "✦", "📄", "🔖"].map((icon, i) => (
          <span
            key={i}
            className="absolute text-amber-400/[0.06] book-float"
            style={{
              left: `${8 + i * 20}%`,
              bottom: "-16px",
              animationDelay: `${i * 2.2}s`,
              fontSize: `${12 + i * 2}px`,
            }}
          >
            {icon}
          </span>
        ))}
      </div>

      <div className="relative z-10 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600/30 to-amber-900/30 flex items-center justify-center backdrop-blur-sm border border-amber-600/20">
            <span className="text-lg">📚</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-300">阅读情绪画像</h3>
            <p className="text-[11px] text-amber-400/40">
              {mbtiType} 的书架密码
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
                transform: `translateY(${i < visibleCount ? 0 : 16}px) ${i < visibleCount ? "" : "rotateX(20deg)"}`,
                transitionDelay: `${i * 80}ms`,
                color:
                  i === 0
                    ? "rgba(252, 211, 147, 0.95)"
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
          <p className="text-xs text-amber-400/30 text-center animate-pulse">
            翻开你的灵魂书架
          </p>
        )}
      </div>
    </div>
  );
}
