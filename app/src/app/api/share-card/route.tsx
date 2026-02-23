import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

interface Dimension {
  letter: string;
  score: number;
}
interface CardData {
  mbtiType: string;
  mbtiTitle: string;
  roast: string;
  dimensions: { ie: Dimension; ns: Dimension; tf: Dimension; jp: Dimension };
  radarData: Record<string, number>;
  summary: string;
  doubanName?: string;
  bookCount?: number;
  movieCount?: number;
  musicCount?: number;
}

const DIMS: { key: string; left: string; right: string }[] = [
  { key: "ie", left: "I 内向", right: "E 外向" },
  { key: "ns", left: "N 直觉", right: "S 感知" },
  { key: "tf", left: "T 思维", right: "F 情感" },
  { key: "jp", left: "J 判断", right: "P 感知" },
];

const RADAR_KEYS = [
  ["wenqing", "文青浓度"],
  ["emo", "emo指数"],
  ["shekong", "社恐值"],
  ["kaogu", "考古癖"],
  ["shangtou", "上头指数"],
  ["chouxiang", "活人感"],
];

const FONT_CDN = "https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/SubsetOTF/SC";

let fontRegular: ArrayBuffer | null = null;
let fontBold: ArrayBuffer | null = null;

async function loadFonts(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  if (!fontRegular) {
    fontRegular = await fetch(`${FONT_CDN}/NotoSansSC-Regular.otf`).then((r) => r.arrayBuffer());
  }
  if (!fontBold) {
    fontBold = await fetch(`${FONT_CDN}/NotoSansSC-Bold.otf`).then((r) => r.arrayBuffer());
  }
  return { regular: fontRegular!, bold: fontBold! };
}

function radarSvgPath(data: Record<string, number>): string {
  const cx = 65,
    cy = 65,
    r = 47;
  const n = RADAR_KEYS.length;
  const pts = RADAR_KEYS.map(([key], i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const val = (data[key] ?? 50) / 100;
    return `${cx + r * val * Math.cos(angle)},${cy + r * val * Math.sin(angle)}`;
  });
  return pts.join(" ");
}

function radarGridPaths(): string[] {
  const cx = 65,
    cy = 65,
    r = 47;
  const n = RADAR_KEYS.length;
  return [0.25, 0.5, 0.75, 1].map((s) => {
    const pts = RADAR_KEYS.map(([,], i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      return `${cx + r * s * Math.cos(angle)},${cy + r * s * Math.sin(angle)}`;
    });
    return pts.join(" ");
  });
}

function radarLabelPositions(): { x: number; y: number; label: string }[] {
  const cx = 65,
    cy = 65,
    r = 47;
  const n = RADAR_KEYS.length;
  return RADAR_KEYS.map(([, label], i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + r * 1.3 * Math.cos(angle), y: cy + r * 1.3 * Math.sin(angle), label };
  });
}

export async function GET() {
  try {
    return new ImageResponse(
      (
        <div style={{ display: "flex", fontSize: 40, color: "white", background: "#1a1a2e", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
          Hello Share Card
        </div>
      ),
      { width: 400, height: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
    return new Response(`GET failed: ${msg}`, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data: CardData = await req.json();
    const fonts = await loadFonts();

    const stats = [
      { val: data.bookCount, label: "本书" },
      { val: data.movieCount, label: "部电影" },
      { val: data.musicCount, label: "首音乐" },
    ].filter((s) => s.val && s.val > 0);

    const grids = radarGridPaths();
    const dataPath = radarSvgPath(data.radarData);
    const labels = radarLabelPositions();

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #0f0c29 0%, #1a1a2e 30%, #16213e 60%, #0f3460 100%)",
            padding: "44px 36px 28px",
            fontFamily: "NotoSansSC",
            color: "#ffffff",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              fontSize: 13,
              color: "#6b7280",
              marginBottom: 20,
            }}
          >
            {data.doubanName ? `${data.doubanName} 的书影音 MBTI` : "书影音 MBTI"}
          </div>

          {/* MBTI Type */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              fontSize: 56,
              fontWeight: 900,
              letterSpacing: "0.12em",
              background: "linear-gradient(90deg, #667eea 0%, #e94560 50%, #f5c518 100%)",
              backgroundClip: "text",
              color: "transparent",
              marginBottom: 4,
            }}
          >
            {data.mbtiType}
          </div>

          {/* Title */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              fontSize: 17,
              fontWeight: 600,
              color: "#e94560",
              marginBottom: 20,
            }}
          >
            {data.mbtiTitle}
          </div>

          {/* Roast box */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 10,
              padding: "14px 20px",
              marginBottom: 22,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 14,
                color: "#d1d5db",
                textAlign: "center",
                lineHeight: 1.6,
                fontStyle: "italic",
              }}
            >
              &ldquo;{data.roast}&rdquo;
            </div>
          </div>

          {/* Dimension bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {DIMS.map((d) => {
              const dim = data.dimensions[d.key as keyof typeof data.dimensions];
              const isLeft = dim.letter === d.left[0];
              return (
                <div key={d.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: isLeft ? 700 : 400, color: isLeft ? "#fff" : "#6b7280" }}>
                      {d.left}
                    </span>
                    <span style={{ fontSize: 11, color: "#4b5563" }}>{dim.score}%</span>
                    <span style={{ fontSize: 13, fontWeight: !isLeft ? 700 : 400, color: !isLeft ? "#fff" : "#6b7280" }}>
                      {d.right}
                    </span>
                  </div>
                  <div style={{ display: "flex", position: "relative", height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)" }}>
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        [isLeft ? "left" : "right"]: 0,
                        width: `${dim.score}%`,
                        height: 8,
                        borderRadius: 4,
                        background: isLeft
                          ? "linear-gradient(90deg, #667eea, #764ba2)"
                          : "linear-gradient(90deg, #e94560, #f5c518)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ display: "flex", height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 16 }} />

          {/* Radar + Stats row */}
          <div style={{ display: "flex", flexDirection: "row", marginBottom: 16 }}>
            {/* Radar chart as SVG */}
            <div style={{ display: "flex", width: 130, height: 130 }}>
              <svg width="130" height="130" viewBox="0 0 130 130">
                {grids.map((g, i) => (
                  <polygon key={i} points={g} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
                ))}
                <polygon points={dataPath} fill="rgba(102,126,234,0.15)" stroke="#667eea" strokeWidth="1.5" />
                {labels.map((l, i) => (
                  <text key={i} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="central" fill="rgba(255,255,255,0.4)" fontSize="8" fontFamily="NotoSansSC">
                    {l.label}
                  </text>
                ))}
              </svg>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, marginLeft: 16, gap: 8, justifyContent: "center" }}>
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{s.val}</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div
            style={{
              display: "flex",
              fontSize: 13,
              color: "#9ca3af",
              textAlign: "center",
              lineHeight: 1.6,
              marginBottom: 20,
              justifyContent: "center",
            }}
          >
            {data.summary}
          </div>

          {/* Footer */}
          <div style={{ display: "flex", height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 16 }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "#4b5563" }}>豆瓣书影音 MBTI</span>
            <span style={{ color: "#667eea" }}>测测你的书影音 MBTI →</span>
          </div>
        </div>
      ),
      {
        width: 400,
        height: 800,
        fonts: [
          { name: "NotoSansSC", data: fonts.regular, weight: 400 as const, style: "normal" as const },
          { name: "NotoSansSC", data: fonts.bold, weight: 700 as const, style: "normal" as const },
        ],
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Share card generation error:", msg, e);
    return new Response(`生成失败: ${msg}`, { status: 500 });
  }
}
