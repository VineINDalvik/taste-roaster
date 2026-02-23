"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  analysis: string;
  mbtiType: string;
}

export default function MusicPortrait({ analysis, mbtiType }: Props) {
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
    const timer = setTimeout(() => setVisibleCount((v) => v + 1), 350);
    return () => clearTimeout(timer);
  }, [revealed, visibleCount, sentences.length]);

  const notes = ["♪", "♫", "♩", "♬", "♭"];

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0533] via-[#0d1b3e] to-[#1a1a2e]" />

      {/* Equalizer bars */}
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-[3px] px-6 pb-3 opacity-[0.08]">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="w-[6px] rounded-t-sm bg-purple-400 music-eq-bar"
            style={{
              height: `${12 + Math.random() * 40}px`,
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </div>

      {/* Floating notes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {notes.map((note, i) => (
          <span
            key={i}
            className="absolute text-purple-400/10 music-float-note"
            style={{
              left: `${10 + i * 20}%`,
              bottom: "-20px",
              animationDelay: `${i * 1.8}s`,
              fontSize: `${14 + i * 3}px`,
            }}
          >
            {note}
          </span>
        ))}
      </div>

      <div className="relative z-10 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center backdrop-blur-sm border border-purple-500/20">
            <span className="text-lg">🎵</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-purple-300">
              音乐情绪画像
            </h3>
            <p className="text-[11px] text-purple-400/50">
              {mbtiType} 的声波密码
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
                transform: `translateY(${i < visibleCount ? 0 : 16}px)`,
                transitionDelay: `${i * 80}ms`,
                color: i === 0 ? "rgba(216, 180, 254, 0.95)" : "rgba(209, 213, 219, 0.8)",
                fontSize: i === 0 ? "15px" : "13px",
                fontWeight: i === 0 ? 500 : 400,
              }}
            >
              {sentence}
            </p>
          ))}
        </div>

        {!revealed && (
          <p className="text-xs text-purple-400/30 text-center animate-pulse">
            滑动查看你的音乐灵魂
          </p>
        )}
      </div>
    </div>
  );
}
