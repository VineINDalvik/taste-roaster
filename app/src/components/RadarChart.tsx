"use client";

import { useEffect, useRef } from "react";

interface RadarChartProps {
  data: {
    depth: number;
    breadth: number;
    uniqueness: number;
    emotionSensitivity: number;
    timeSpan: number;
  };
  size?: number;
}

const LABELS = ["深度", "广度", "独特性", "情感", "时代跨度"];

export default function RadarChart({ data, size = 240 }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const values = [
    data.depth,
    data.breadth,
    data.uniqueness,
    data.emotionSensitivity,
    data.timeSpan,
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.35;
    const sides = 5;
    const angleStep = (Math.PI * 2) / sides;
    const startAngle = -Math.PI / 2;

    ctx.clearRect(0, 0, size, size);

    // Grid rings
    for (let ring = 1; ring <= 4; ring++) {
      const r = (radius * ring) / 4;
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const angle = startAngle + i * angleStep;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Axes
    for (let i = 0; i < sides; i++) {
      const angle = startAngle + i * angleStep;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Data polygon
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const idx = i % sides;
      const angle = startAngle + idx * angleStep;
      const val = values[idx] / 100;
      const x = cx + radius * val * Math.cos(angle);
      const y = cy + radius * val * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.fillStyle = "rgba(233, 69, 96, 0.25)";
    ctx.fill();
    ctx.strokeStyle = "#e94560";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Data points
    for (let i = 0; i < sides; i++) {
      const angle = startAngle + i * angleStep;
      const val = values[i] / 100;
      const x = cx + radius * val * Math.cos(angle);
      const y = cy + radius * val * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#e94560";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Labels
    ctx.font = "12px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.textAlign = "center";
    for (let i = 0; i < sides; i++) {
      const angle = startAngle + i * angleStep;
      const labelR = radius + 22;
      const x = cx + labelR * Math.cos(angle);
      const y = cy + labelR * Math.sin(angle);
      ctx.fillText(LABELS[i], x, y + 4);
    }
  }, [data, size, values]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="mx-auto"
    />
  );
}
