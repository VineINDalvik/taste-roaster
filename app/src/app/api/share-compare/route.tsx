import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getSiteQrTransparentDataUrl } from "@/lib/site-qr";

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
    const siteQr = await getSiteQrTransparentDataUrl();
    const matchColor = getMatchColor(data.comparison.matchScore);

    // --- Layout fitting (avoid bottom cut) ---
    // We intentionally over-estimate height and keep a larger max cap.
    // If content is still too long, we further shrink content limits.
    const MAX_HEIGHT = 2600;
    const CW = 24;
    const lineH = 48;
    const EXTRA_SAFETY = 360;

    let maxSims = 3;
    let maxDiffs = 3;
    let maxOverviewLen = 200;
    let maxChemLen = 200;
    let maxShared = 8;
    let maxFunLen = 5;

    const comp = data.comparison;

    const estimate = () => {
      const overviewText = truncateText(comp.overview || "", maxOverviewLen);
      const chemistryText = truncateText(comp.chemistry || "", maxChemLen);

      const sims = (comp.similarities ?? []).slice(0, maxSims).map((s) => ({
        point: truncateText(s.point || "", 40),
        detail: truncateText(s.detail || "", 80),
      }));
      const diffs = (comp.differences ?? []).slice(0, maxDiffs).map((d) => ({
        point: truncateText(d.point || "", 40),
        detail: truncateText(d.detail || "", 80),
      }));

      const shared = (comp.sharedWorks ?? []).slice(0, maxShared);
      const funItems = [
        comp.roastOneLiner,
        comp.dateScene,
        comp.dangerZone,
        comp.battleVerdict,
        comp.memeLine,
      ]
        .filter(Boolean)
        .slice(0, maxFunLen) as string[];

      // Height estimate: fixed parts + blocks
      const overviewH = Math.max(1, Math.ceil(overviewText.length / CW)) * lineH;
      const chemistryH = Math.max(1, Math.ceil(chemistryText.length / CW)) * lineH;

      let pointsH = 0;
      [...sims, ...diffs].forEach((p) => {
        const a = (p.point ?? "").length + (p.detail ?? "").length;
        // card padding + title + text lines (be conservative)
        pointsH += 96 + Math.max(1, Math.ceil(a / CW)) * lineH;
      });

      const sharedH = shared.length > 0 ? 120 : 0;
      const funH = funItems.length > 0 ? 160 + funItems.length * 64 : 0;
      const fixedH = 560; // header/vs/badge/dividers/footer + margins (conservative)

      const height = Math.min(
        Math.max(1100, fixedH + overviewH + chemistryH + pointsH + sharedH + funH + EXTRA_SAFETY),
        MAX_HEIGHT
      );

      return {
        height,
        overviewText,
        chemistryText,
        sims,
        diffs,
        shared,
        funItems,
      };
    };

    let fitted = estimate();
    // If still too tall (hit cap), shrink content gradually to prevent cut
    for (let i = 0; i < 6 && fitted.height >= MAX_HEIGHT; i++) {
      if (maxSims > 2) maxSims--;
      else if (maxDiffs > 2) maxDiffs--;
      else if (maxOverviewLen > 160) maxOverviewLen -= 20;
      else if (maxChemLen > 160) maxChemLen -= 20;
      else if (maxFunLen > 3) maxFunLen--;
      else if (maxShared > 6) maxShared--;
      fitted = estimate();
    }

    const { height, overviewText, chemistryText, sims, diffs, shared, funItems } = fitted;

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

          <div style={{ display: "flex", flexDirection: "column", padding: "48px 56px 132px", position: "relative", zIndex: 1 }}>
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
              {overviewText}
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
                      <div style={{ fontSize: 22, fontWeight: 600, color: "#86efac", marginBottom: 4 }}>{s.point}</div>
                      <div style={{ fontSize: 20, color: "rgba(209,213,219,0.85)", lineHeight: 1.5 }}>{s.detail}</div>
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
                      <div style={{ fontSize: 22, fontWeight: 600, color: "#f9a8d4", marginBottom: 4 }}>{d.point}</div>
                      <div style={{ fontSize: 20, color: "rgba(209,213,219,0.85)", lineHeight: 1.5 }}>{d.detail}</div>
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
                {chemistryText}
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
                  {funItems.includes(comp.roastOneLiner || "") && comp.roastOneLiner && (
                    <div style={{ fontSize: 20, color: "rgba(209,213,219,0.9)", fontStyle: "italic" }}>
                      {`\u201C${truncateText(comp.roastOneLiner ?? "", 50)}\u201D`}
                    </div>
                  )}
                  {funItems.includes(comp.dateScene || "") && comp.dateScene && (
                    <div style={{ fontSize: 20, color: "rgba(74,222,128,0.9)" }}>
                      {`💕 ${truncateText(comp.dateScene ?? "", 40)}`}
                    </div>
                  )}
                  {funItems.includes(comp.dangerZone || "") && comp.dangerZone && (
                    <div style={{ fontSize: 20, color: "rgba(233,69,96,0.9)" }}>
                      {`⚠️ ${truncateText(comp.dangerZone ?? "", 40)}`}
                    </div>
                  )}
                  {funItems.includes(comp.battleVerdict || "") && comp.battleVerdict && (
                    <div style={{ fontSize: 20, color: "rgba(102,126,234,0.9)" }}>
                      {`🏆 ${truncateText(comp.battleVerdict ?? "", 40)}`}
                    </div>
                  )}
                  {funItems.includes(comp.memeLine || "") && comp.memeLine && (
                    <div style={{ fontSize: 22, fontWeight: 600, color: "rgba(251,191,36,0.95)", marginTop: 4 }}>
                      {`\u201C${truncateText(comp.memeLine ?? "", 35)}\u201D`}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Shared works */}
            {shared.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 24 }}>🔗</span>
                  <span style={{ fontSize: 26, fontWeight: 700, color: "#667eea" }}>品味交集</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {shared.map((w, i) => (
                    <span key={i} style={{ padding: "6px 14px", background: "rgba(102,126,234,0.15)", borderRadius: 9999, fontSize: 18, color: "#a5b4fc" }}>
                      {truncateText(w, 12)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", height: 2, marginTop: 24, marginBottom: 20, background: "linear-gradient(90deg, rgba(102,126,234,0.3), rgba(233,69,96,0.2))" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 20, lineHeight: 1.2 }}>
              <div style={{ display: "flex", flex: 1, minWidth: 0, alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#667eea" }} />
                <span style={{ color: "#4b5563", whiteSpace: "nowrap" }}>豆瓣书影音 MBTI</span>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 96,
                  padding: "8px 8px 8px",
                  borderRadius: 18,
                  background: "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03))",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
                }}
              >
                <img src={siteQr} width={72} height={72} />
              </div>

              <div style={{ display: "flex", flex: 1, minWidth: 0, justifyContent: "flex-end" }}>
                <span style={{ color: "#667eea", opacity: 0.8, whiteSpace: "nowrap" }}>品味即人格 →</span>
              </div>
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
