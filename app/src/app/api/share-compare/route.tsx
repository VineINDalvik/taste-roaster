import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const FONT_CDNS = [
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/SubsetOTF/SC",
  "https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/SubsetOTF/SC",
];
let fontRegular: ArrayBuffer | null = null;
let fontBold: ArrayBuffer | null = null;

async function fetchWithTimeout(url: string, ms = 15000): Promise<ArrayBuffer> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`font ${r.status}`);
    return r.arrayBuffer();
  } finally {
    clearTimeout(t);
  }
}

async function loadFonts(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  const load = async (name: string): Promise<ArrayBuffer> => {
    for (const base of FONT_CDNS) {
      try {
        return await fetchWithTimeout(`${base}/${name}`);
      } catch {
        continue;
      }
    }
    throw new Error(`字体加载失败: ${name}`);
  };
  if (!fontRegular) fontRegular = await load("NotoSansSC-Regular.otf");
  if (!fontBold) fontBold = await load("NotoSansSC-Bold.otf");
  return { regular: fontRegular!, bold: fontBold! };
}

interface PersonData {
  name: string;
  mbtiType: string;
  mbtiTitle: string;
  dimensions: Record<string, { letter: string; score: number }>;
  radarData: Record<string, number>;
  bookCount: number;
  movieCount: number;
  musicCount: number;
}

interface ComparisonData {
  matchScore: number;
  matchTitle: string;
  overview: string;
  similarities: { point: string; detail: string }[];
  differences: { point: string; detail: string }[];
  chemistry: string;
  sharedWorks?: string[];
  roastOneLiner?: string;
  dateScene?: string;
  dangerZone?: string;
  memeLine?: string;
  battleVerdict?: string;
}

interface ShareCompareData {
  personA: PersonData;
  personB: PersonData;
  comparison: ComparisonData;
}

function getMatchColor(score: number) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#667eea";
  if (score >= 40) return "#f5c518";
  return "#e94560";
}

function truncateText(text: string, maxLen: number) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

export async function POST(req: NextRequest) {
  try {
    const data: ShareCompareData = await req.json();
    if (!data?.personA || !data?.personB || !data?.comparison) {
      return new Response("缺少对比数据", { status: 400 });
    }
    const fonts = await loadFonts();
    const matchColor = getMatchColor(data.comparison.matchScore);

    const CW = 26;
    const lineH = 42;
    const overviewH = Math.max(1, Math.ceil((data.comparison.overview?.length || 0) / CW)) * lineH;
    const chemistryH = Math.max(1, Math.ceil((data.comparison.chemistry?.length || 0) / CW)) * lineH;

    let pointsH = 0;
    const sims = data.comparison.similarities?.slice(0, 3) ?? [];
    const diffs = data.comparison.differences?.slice(0, 3) ?? [];
    [...sims, ...diffs].forEach((p) => {
      const a = (p?.point ?? "").length + (p?.detail ?? "").length;
      pointsH += 24 + Math.max(1, Math.ceil(a / CW)) * lineH;
    });

    const sharedH = (data.comparison.sharedWorks?.length ?? 0) > 0 ? 80 : 0;
    const comp = data.comparison;
    const funItems = [comp.roastOneLiner, comp.dateScene, comp.dangerZone, comp.battleVerdict, comp.memeLine].filter(Boolean);
    const funH = funItems.length * 56;
    const fixedH = 72 + 120 + 80 + 60 + 100;
    const height = Math.min(Math.max(900, fixedH + overviewH + chemistryH + pointsH + sharedH + funH), 2400);

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #0f0c29 0%, #1a1a2e 30%, #16213e 60%, #0f3460 100%)",
            fontFamily: "NotoSansSC",
            color: "#ffffff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: -120, right: -80, width: 400, height: 400, borderRadius: "50%", background: "rgba(102,126,234,0.04)" }} />
          <div style={{ position: "absolute", bottom: -80, left: -60, width: 320, height: 320, borderRadius: "50%", background: "rgba(233,69,96,0.04)" }} />

          <div style={{ display: "flex", flexDirection: "column", padding: "48px 56px 64px", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", position: "absolute", top: 0, left: 56, right: 56, height: 4, background: "linear-gradient(90deg, transparent, rgba(102,126,234,0.4), rgba(233,69,96,0.4), transparent)" }} />

            <div style={{ fontSize: 22, color: "#6b7280", marginBottom: 32, textAlign: "center" }}>
              品味双人对比
            </div>

            {/* VS layout */}
            <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", marginBottom: 28 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: "#667eea" }}>{data.personA.mbtiType}</span>
                <span style={{ fontSize: 22, color: "#9ca3af", marginTop: 8 }}>{data.personA.name}</span>
                <span style={{ fontSize: 18, color: "#6b7280", marginTop: 4 }}>{data.personA.mbtiTitle}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: 48, fontWeight: 900, color: matchColor }}>{data.comparison.matchScore}</span>
                <span style={{ fontSize: 18, color: "#6b7280", marginTop: 4 }}>match</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: "#e94560" }}>{data.personB.mbtiType}</span>
                <span style={{ fontSize: 22, color: "#9ca3af", marginTop: 8 }}>{data.personB.name}</span>
                <span style={{ fontSize: 18, color: "#6b7280", marginTop: 4 }}>{data.personB.mbtiTitle}</span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <span
                style={{
                  padding: "10px 24px",
                  borderRadius: 9999,
                  fontSize: 24,
                  fontWeight: 600,
                  color: matchColor,
                  background: `${matchColor}15`,
                  border: `2px solid ${matchColor}40`,
                }}
              >
                {data.comparison.matchTitle}
              </span>
            </div>

            <div style={{ fontSize: 24, color: "#d1d5db", lineHeight: 1.7, marginBottom: 36 }}>
              {truncateText(data.comparison.overview || "", 200)}
            </div>

            <div style={{ display: "flex", height: 2, marginBottom: 24, background: "linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06))" }} />

            {/* Similarities */}
            {sims.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: 24 }}>✅</span>
                  <span style={{ fontSize: 26, fontWeight: 700, color: "#22c55e" }}>相同点</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {sims.map((s, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", padding: "12px 16px", background: "rgba(34,197,94,0.08)", borderRadius: 12, borderLeft: "4px solid rgba(34,197,94,0.5)" }}>
                      <div style={{ fontSize: 22, fontWeight: 600, color: "#86efac", marginBottom: 4 }}>{truncateText(s.point, 40)}</div>
                      <div style={{ fontSize: 20, color: "rgba(209,213,219,0.85)", lineHeight: 1.5 }}>{truncateText(s.detail, 80)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Differences */}
            {diffs.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: 24 }}>⚡</span>
                  <span style={{ fontSize: 26, fontWeight: 700, color: "#e94560" }}>不同点</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {diffs.map((d, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", padding: "12px 16px", background: "rgba(233,69,96,0.08)", borderRadius: 12, borderLeft: "4px solid rgba(233,69,96,0.5)" }}>
                      <div style={{ fontSize: 22, fontWeight: 600, color: "#f9a8d4", marginBottom: 4 }}>{truncateText(d.point, 40)}</div>
                      <div style={{ fontSize: 20, color: "rgba(209,213,219,0.85)", lineHeight: 1.5 }}>{truncateText(d.detail, 80)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chemistry */}
            <div style={{ display: "flex", flexDirection: "column", marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 24 }}>⚗️</span>
                <span style={{ fontSize: 26, fontWeight: 700, color: "#f5c518" }}>化学反应</span>
              </div>
              <div style={{ fontSize: 22, color: "#d1d5db", lineHeight: 1.7 }}>
                {truncateText(data.comparison.chemistry || "", 200)}
              </div>
            </div>

            {/* 趣味彩蛋 */}
            {funItems.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", marginBottom: 28, padding: "16px 20px", background: "rgba(167,139,250,0.08)", borderRadius: 16, border: "1px solid rgba(167,139,250,0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: 24 }}>🎯</span>
                  <span style={{ fontSize: 26, fontWeight: 700, color: "#a78bfa" }}>趣味彩蛋</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {data.comparison.roastOneLiner && (
                    <div style={{ fontSize: 20, color: "rgba(209,213,219,0.9)", fontStyle: "italic" }}>
                      {`\u201C${truncateText(data.comparison.roastOneLiner, 50)}\u201D`}
                    </div>
                  )}
                  {data.comparison.dateScene && (
                    <div style={{ fontSize: 20, color: "rgba(74,222,128,0.9)" }}>
                      {`💕 ${truncateText(data.comparison.dateScene, 40)}`}
                    </div>
                  )}
                  {data.comparison.dangerZone && (
                    <div style={{ fontSize: 20, color: "rgba(233,69,96,0.9)" }}>
                      {`⚠️ ${truncateText(data.comparison.dangerZone, 40)}`}
                    </div>
                  )}
                  {data.comparison.battleVerdict && (
                    <div style={{ fontSize: 20, color: "rgba(102,126,234,0.9)" }}>
                      {`🏆 ${truncateText(data.comparison.battleVerdict, 40)}`}
                    </div>
                  )}
                  {data.comparison.memeLine && (
                    <div style={{ fontSize: 22, fontWeight: 600, color: "rgba(251,191,36,0.95)", marginTop: 4 }}>
                      {`\u201C${truncateText(data.comparison.memeLine, 35)}\u201D`}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Shared works */}
            {data.comparison.sharedWorks && data.comparison.sharedWorks.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 24 }}>🔗</span>
                  <span style={{ fontSize: 26, fontWeight: 700, color: "#667eea" }}>品味交集</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {data.comparison.sharedWorks.slice(0, 8).map((w, i) => (
                    <span key={i} style={{ padding: "6px 14px", background: "rgba(102,126,234,0.15)", borderRadius: 9999, fontSize: 18, color: "#a5b4fc" }}>
                      {truncateText(w, 12)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", height: 2, marginTop: 24, marginBottom: 20, background: "linear-gradient(90deg, rgba(102,126,234,0.3), rgba(233,69,96,0.2))" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#667eea" }} />
                <span style={{ color: "#4b5563" }}>豆瓣书影音 MBTI</span>
              </div>
              <span style={{ color: "#667eea", opacity: 0.8 }}>品味即人格 →</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 800,
        height,
        fonts: [
          { name: "NotoSansSC", data: fonts.regular, weight: 400 as const, style: "normal" as const },
          { name: "NotoSansSC", data: fonts.bold, weight: 700 as const, style: "normal" as const },
        ],
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Share compare error:", msg);
    return new Response(`生成失败: ${msg}`, { status: 500 });
  }
}
