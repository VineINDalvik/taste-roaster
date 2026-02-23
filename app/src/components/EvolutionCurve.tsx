"use client";

import { useState, useEffect, useRef } from "react";

interface MonthData {
  month: string;
  books: string[];
  movies: string[];
  music: string[];
  mood: string;
  moodScore?: number;
  tasteShift: string;
  roast: string;
}

interface Props {
  months: MonthData[];
  trend?: string;
  prediction?: string;
}

function moodScoreFallback(mood: string, index: number): number {
  if (!mood) return 50 + Math.round(Math.sin(index * 1.2) * 15);
  let hash = 0;
  for (let i = 0; i < mood.length; i++) {
    hash = (hash * 31 + mood.charCodeAt(i)) & 0xff;
  }
  return 25 + Math.round((hash / 255) * 50);
}

function getEnergyLabel(score: number): string {
  if (score >= 80) return "狂热";
  if (score >= 60) return "活跃";
  if (score >= 40) return "平稳";
  if (score >= 20) return "内省";
  return "沉静";
}

function getEnergyColor(score: number): string {
  if (score >= 80) return "#f5c518";
  if (score >= 60) return "#e94560";
  if (score >= 40) return "#667eea";
  if (score >= 20) return "#764ba2";
  return "#4a5568";
}

export default function EvolutionCurve({ months, trend, prediction }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDrawn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (months.length === 0) return null;

  const W = 360;
  const H = 180;
  const PAD_X = 35;
  const PAD_Y = 25;
  const PAD_BOTTOM = 30;
  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y - PAD_BOTTOM;

  const points = months.map((m, i) => {
    const score = m.moodScore ?? moodScoreFallback(m.mood, i);
    const x = months.length === 1
      ? W / 2
      : PAD_X + (i / (months.length - 1)) * chartW;
    const y = PAD_Y + chartH - (score / 100) * chartH;
    return { x, y, score };
  });

  const buildPath = () => {
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    return points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const tension = 0.3;
      const dx = p.x - prev.x;
      const cp1x = prev.x + dx * tension;
      const cp2x = p.x - dx * tension;
      return `${acc} C ${cp1x} ${prev.y}, ${cp2x} ${p.y}, ${p.x} ${p.y}`;
    }, "");
  };

  const pathD = buildPath();
  const lastPt = points[points.length - 1];
  const firstPt = points[0];
  const areaD = points.length > 1
    ? `${pathD} L ${lastPt.x} ${H - PAD_BOTTOM} L ${firstPt.x} ${H - PAD_BOTTOM} Z`
    : "";

  const active = activeIndex !== null ? months[activeIndex] : null;
  const activeScore = activeIndex !== null ? points[activeIndex].score : null;

  return (
    <div className="card-glass rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#e94560] flex items-center gap-2">
          📈 品味进化曲线
        </h3>
        {activeScore !== null && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium transition-all"
            style={{
              color: getEnergyColor(activeScore),
              background: `${getEnergyColor(activeScore)}15`,
            }}
          >
            {getEnergyLabel(activeScore)} {activeScore}
          </span>
        )}
      </div>

      <div className="relative -mx-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ maxHeight: 220 }}
        >
          <defs>
            <linearGradient id="evo-curve-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#764ba2" />
              <stop offset="40%" stopColor="#667eea" />
              <stop offset="70%" stopColor="#e94560" />
              <stop offset="100%" stopColor="#f5c518" />
            </linearGradient>
            <linearGradient id="evo-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e94560" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#e94560" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 50, 100].map((v) => {
            const y = PAD_Y + chartH - (v / 100) * chartH;
            return (
              <g key={v}>
                <line
                  x1={PAD_X}
                  y1={y}
                  x2={W - PAD_X}
                  y2={y}
                  stroke="rgba(255,255,255,0.04)"
                  strokeDasharray="3 6"
                />
                <text
                  x={PAD_X - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="rgba(255,255,255,0.15)"
                  fontSize="8"
                >
                  {v === 0 ? "沉静" : v === 50 ? "平稳" : "狂热"}
                </text>
              </g>
            );
          })}

          {areaD && (
            <path
              d={areaD}
              fill="url(#evo-area-grad)"
              className={`transition-opacity duration-1000 ${drawn ? "opacity-100" : "opacity-0"}`}
            />
          )}

          <path
            d={pathD}
            fill="none"
            stroke="url(#evo-curve-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1000"
            strokeDashoffset={drawn ? 0 : 1000}
            style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
          />

          {points.map((p, i) => {
            const isActive = activeIndex === i;
            const color = getEnergyColor(p.score);
            return (
              <g
                key={i}
                onClick={() => setActiveIndex(isActive ? null : i)}
                className="cursor-pointer"
              >
                {isActive && (
                  <line
                    x1={p.x}
                    y1={PAD_Y}
                    x2={p.x}
                    y2={H - PAD_BOTTOM}
                    stroke={`${color}30`}
                    strokeDasharray="3 3"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isActive ? 8 : 5}
                  fill={isActive ? color : "#1a1a2e"}
                  stroke={color}
                  strokeWidth="2"
                  style={{ transition: "all 0.2s ease" }}
                />
                {isActive && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={12}
                    fill="none"
                    stroke={color}
                    strokeWidth="1"
                    opacity="0.3"
                  />
                )}
                <text
                  x={p.x}
                  y={H - PAD_BOTTOM + 14}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.3)"
                  fontSize="9"
                  fontFamily="inherit"
                >
                  {months[i].month.slice(5)}月
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {active ? (
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-2 animate-fade-in-up">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{active.month}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                color: getEnergyColor(activeScore!),
                background: `${getEnergyColor(activeScore!)}15`,
              }}
            >
              {active.mood}
            </span>
          </div>
          {active.books.length > 0 && (
            <p className="text-xs text-gray-400">📖 {active.books.join("、")}</p>
          )}
          {active.movies.length > 0 && (
            <p className="text-xs text-gray-400">🎬 {active.movies.join("、")}</p>
          )}
          {active.music.length > 0 && (
            <p className="text-xs text-gray-400">🎵 {active.music.join("、")}</p>
          )}
          {active.tasteShift && (
            <p className="text-xs text-gray-500 italic">{active.tasteShift}</p>
          )}
          {active.roast && (
            <p className="text-xs text-[#e94560]/80">💬 {active.roast}</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-500 text-center">
          点击曲线上的圆点，查看月度品味详情
        </p>
      )}

      {(trend || prediction) && (
        <div className="pt-3 border-t border-white/10 space-y-2">
          {trend && (
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {trend}
            </p>
          )}
          {prediction && (
            <p className="text-sm leading-relaxed">
              <span className="text-[#f5c518]">🔮</span>{" "}
              <span className="text-[#f5c518]/80">{prediction}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
