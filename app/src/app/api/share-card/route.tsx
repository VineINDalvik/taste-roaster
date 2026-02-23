import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

interface Dimension { letter: string; score: number; }
interface CardData {
  mbtiType: string; mbtiTitle: string; roast: string;
  dimensions: { ie: Dimension; ns: Dimension; tf: Dimension; jp: Dimension };
  radarData: Record<string, number>;
  summary: string; doubanName?: string;
  bookCount?: number; movieCount?: number; musicCount?: number;
}

const DIMS: { key: string; left: string; right: string }[] = [
  { key: "ie", left: "I 内向", right: "E 外向" },
  { key: "ns", left: "N 直觉", right: "S 感知" },
  { key: "tf", left: "T 思维", right: "F 情感" },
  { key: "jp", left: "J 判断", right: "P 感知" },
];

const RADAR_KEYS: [string, string][] = [
  ["wenqing", "文青浓度"], ["emo", "emo指数"], ["shekong", "社恐值"],
  ["kaogu", "考古癖"], ["shangtou", "上头指数"], ["chouxiang", "活人感"],
];

const FONT_CDN = "https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/SubsetOTF/SC";
let fontRegular: ArrayBuffer | null = null;
let fontBold: ArrayBuffer | null = null;

async function loadFonts(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  if (!fontRegular) fontRegular = await fetch(`${FONT_CDN}/NotoSansSC-Regular.otf`).then((r) => r.arrayBuffer());
  if (!fontBold) fontBold = await fetch(`${FONT_CDN}/NotoSansSC-Bold.otf`).then((r) => r.arrayBuffer());
  return { regular: fontRegular!, bold: fontBold! };
}

// Radar chart at 2x: center at (130,130), radius 88
const RCX = 130, RCY = 130, RR = 88;

function radarPoints(data: Record<string, number>): string {
  const n = RADAR_KEYS.length;
  return RADAR_KEYS.map(([key], i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const val = (data[key] ?? 50) / 100;
    return `${RCX + RR * val * Math.cos(angle)},${RCY + RR * val * Math.sin(angle)}`;
  }).join(" ");
}

function gridPolygon(scale: number): string {
  const n = RADAR_KEYS.length;
  return RADAR_KEYS.map(([,], i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return `${RCX + RR * scale * Math.cos(angle)},${RCY + RR * scale * Math.sin(angle)}`;
  }).join(" ");
}

function labelPos(): { x: number; y: number; label: string }[] {
  const n = RADAR_KEYS.length;
  return RADAR_KEYS.map(([, label], i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: RCX + RR * 1.35 * Math.cos(angle), y: RCY + RR * 1.35 * Math.sin(angle), label };
  });
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

    const dataPath = radarPoints(data.radarData);
    const labels = labelPos();

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex", flexDirection: "column", width: "100%", height: "100%",
            background: "linear-gradient(135deg, #0f0c29 0%, #1a1a2e 30%, #16213e 60%, #0f3460 100%)",
            padding: "88px 72px 56px", fontFamily: "NotoSansSC", color: "#ffffff",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "center", fontSize: 26, color: "#6b7280", marginBottom: 40 }}>
            {data.doubanName ? `${data.doubanName} 的书影音 MBTI` : "书影音 MBTI"}
          </div>

          {/* MBTI Type */}
          <div style={{ display: "flex", justifyContent: "center", fontSize: 112, fontWeight: 900, letterSpacing: "0.12em", background: "linear-gradient(90deg, #667eea 0%, #e94560 50%, #f5c518 100%)", backgroundClip: "text", color: "transparent", marginBottom: 8 }}>
            {data.mbtiType}
          </div>

          {/* Title */}
          <div style={{ display: "flex", justifyContent: "center", fontSize: 34, fontWeight: 600, color: "#e94560", marginBottom: 40 }}>
            {data.mbtiTitle}
          </div>

          {/* Roast */}
          <div style={{ display: "flex", justifyContent: "center", background: "rgba(255,255,255,0.03)", border: "2px solid rgba(255,255,255,0.05)", borderRadius: 20, padding: "28px 40px", marginBottom: 44 }}>
            <div style={{ display: "flex", fontSize: 28, color: "#d1d5db", textAlign: "center", lineHeight: 1.6, fontStyle: "italic" }}>
              &ldquo;{data.roast}&rdquo;
            </div>
          </div>

          {/* Dimension bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
            {DIMS.map((d) => {
              const dim = data.dimensions[d.key as keyof typeof data.dimensions];
              const isLeft = dim.letter === d.left[0];
              return (
                <div key={d.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 26, fontWeight: isLeft ? 700 : 400, color: isLeft ? "#fff" : "#6b7280" }}>{d.left}</span>
                    <span style={{ fontSize: 22, color: "#4b5563" }}>{dim.score}%</span>
                    <span style={{ fontSize: 26, fontWeight: !isLeft ? 700 : 400, color: !isLeft ? "#fff" : "#6b7280" }}>{d.right}</span>
                  </div>
                  <div style={{ display: "flex", position: "relative", height: 16, borderRadius: 8, background: "rgba(255,255,255,0.08)" }}>
                    <div style={{ position: "absolute", top: 0, [isLeft ? "left" : "right"]: 0, width: `${dim.score}%`, height: 16, borderRadius: 8, background: isLeft ? "linear-gradient(90deg, #667eea, #764ba2)" : "linear-gradient(90deg, #e94560, #f5c518)" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ display: "flex", height: 2, background: "rgba(255,255,255,0.06)", marginBottom: 32 }} />

          {/* Radar + Stats row */}
          <div style={{ display: "flex", flexDirection: "row", marginBottom: 32 }}>
            <div style={{ display: "flex", position: "relative", width: 260, height: 260 }}>
              <svg width="260" height="260" viewBox="0 0 260 260">
                {[0.25, 0.5, 0.75, 1].map((s) => (
                  <polygon key={s} points={gridPolygon(s)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                ))}
                <polygon points={dataPath} fill="rgba(102,126,234,0.15)" stroke="#667eea" strokeWidth="3" />
              </svg>
              {labels.map((l) => (
                <div key={l.label} style={{ display: "flex", position: "absolute", left: l.x - 40, top: l.y - 12, width: 80, fontSize: 14, color: "rgba(255,255,255,0.4)", justifyContent: "center", textAlign: "center" }}>
                  {l.label}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, marginLeft: 32, gap: 16, justifyContent: "center" }}>
              {stats.map((s) => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "20px 28px", gap: 12 }}>
                  <span style={{ fontSize: 32, fontWeight: 700, color: "#fff" }}>{s.val}</span>
                  <span style={{ fontSize: 24, color: "#6b7280" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={{ display: "flex", fontSize: 26, color: "#9ca3af", textAlign: "center", lineHeight: 1.6, marginBottom: 40, justifyContent: "center" }}>
            {data.summary}
          </div>

          {/* Footer */}
          <div style={{ display: "flex", height: 2, background: "rgba(255,255,255,0.06)", marginBottom: 32 }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24 }}>
            <span style={{ color: "#4b5563" }}>豆瓣书影音 MBTI</span>
            <span style={{ color: "#667eea" }}>测测你的书影音 MBTI →</span>
          </div>
        </div>
      ),
      {
        width: 800,
        height: 1600,
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
