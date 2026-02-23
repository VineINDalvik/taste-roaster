import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const FONT_CDN = "https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/SubsetOTF/SC";
let fontRegular: ArrayBuffer | null = null;
let fontBold: ArrayBuffer | null = null;

async function loadFonts(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  if (!fontRegular) fontRegular = await fetch(`${FONT_CDN}/NotoSansSC-Regular.otf`).then((r) => r.arrayBuffer());
  if (!fontBold) fontBold = await fetch(`${FONT_CDN}/NotoSansSC-Bold.otf`).then((r) => r.arrayBuffer());
  return { regular: fontRegular!, bold: fontBold! };
}

interface ReportData {
  mbtiType: string;
  mbtiTitle: string;
  roast: string;
  summary: string;
  doubanName?: string;
  bookCount: number;
  movieCount: number;
  musicCount: number;
  bookAnalysis?: string;
  movieAnalysis?: string;
  musicAnalysis?: string;
}

const SECTION_THEMES = [
  { icon: "📚", title: "阅读画像", color: "#fbbf24", highlight: "rgba(252,211,147,0.95)", dim: "rgba(252,211,147,0.1)", border: "rgba(217,119,6,0.3)" },
  { icon: "🎬", title: "观影画像", color: "#60a5fa", highlight: "rgba(147,197,253,0.95)", dim: "rgba(147,197,253,0.08)", border: "rgba(59,130,246,0.3)" },
  { icon: "🎵", title: "音乐画像", color: "#a78bfa", highlight: "rgba(216,180,254,0.95)", dim: "rgba(216,180,254,0.1)", border: "rgba(168,85,247,0.3)" },
];

function AnalysisBlock({ text, theme }: { text: string; theme: typeof SECTION_THEMES[0] }) {
  const sentences = text.split(/(?<=[。！？\n])/).map((s) => s.trim()).filter((s) => s.length > 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
        <div style={{ display: "flex", width: 64, height: 64, borderRadius: "50%", background: theme.dim, border: `2px solid ${theme.border}`, alignItems: "center", justifyContent: "center", fontSize: 32 }}>
          {theme.icon}
        </div>
        <span style={{ fontSize: 30, fontWeight: 700, color: theme.color }}>{theme.title}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {sentences.map((sentence, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              fontSize: i === 0 ? 28 : 26,
              fontWeight: i === 0 ? 600 : 400,
              color: i === 0 ? theme.highlight : "rgba(209,213,219,0.8)",
              lineHeight: 1.75,
              ...(i === 0 ? { padding: "16px 24px", background: theme.dim, borderRadius: 12, borderLeft: `6px solid ${theme.color}80` } : {}),
            }}
          >
            {sentence}
          </div>
        ))}
      </div>
    </div>
  );
}

export async function POST(req: NextRequest) {
  try {
    const data: ReportData = await req.json();
    const fonts = await loadFonts();

    const sections = [
      { text: data.bookAnalysis, theme: SECTION_THEMES[0] },
      { text: data.movieAnalysis, theme: SECTION_THEMES[1] },
      { text: data.musicAnalysis, theme: SECTION_THEMES[2] },
    ].filter((s): s is { text: string; theme: typeof SECTION_THEMES[0] } => !!s.text);

    // Height at 2x: content width ~688px at 26px font ≈ 26 chars/line
    const CW = 26;
    const countSentH = (text: string) => {
      const sents = text.split(/(?<=[。！？\n])/).map((s) => s.trim()).filter((s) => s.length > 0);
      return sents.reduce((sum, s, i) => {
        const lines = Math.max(1, Math.ceil(s.length / CW));
        return sum + lines * 46 + (i === 0 ? 40 : 0);
      }, 0) + (sents.length - 1) * 12;
    };

    const roastH = Math.max(1, Math.ceil((data.roast?.length || 0) / CW)) * 42 + 64;
    const summaryH = Math.max(1, Math.ceil((data.summary?.length || 0) / CW)) * 40;
    const sectionH = sections.reduce((sum, s) => sum + countSentH(s.text) + 124, 0);
    const statsH = 130;
    const fixedH = 72 + 40 + 110 + 12 + 40 + 36 + 68 + 80 + 120;
    const height = Math.min(Math.max(1000, fixedH + roastH + statsH + summaryH + sectionH + 40), 12000);

    const stats = [
      { val: data.bookCount, label: "本书", icon: "📚", color: "#fbbf24" },
      { val: data.movieCount, label: "部电影", icon: "🎬", color: "#60a5fa" },
      { val: data.musicCount, label: "首音乐", icon: "🎵", color: "#a78bfa" },
    ].filter((s) => s.val > 0);

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex", flexDirection: "column", width: "100%", height: "100%",
            background: "linear-gradient(135deg, #0f0c29 0%, #1a1a2e 30%, #16213e 60%, #0f3460 100%)",
            fontFamily: "NotoSansSC", color: "#ffffff", position: "relative", overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", position: "absolute", top: -120, right: -80, width: 400, height: 400, borderRadius: "50%", background: "rgba(102,126,234,0.04)" }} />
          <div style={{ display: "flex", position: "absolute", bottom: -80, left: -60, width: 320, height: 320, borderRadius: "50%", background: "rgba(233,69,96,0.04)" }} />
          <div style={{ display: "flex", position: "absolute", top: "40%", right: -40, width: 240, height: 240, borderRadius: "50%", background: "rgba(168,85,247,0.03)" }} />

          {["✦", "◆", "✧", "●", "✦"].map((s, i) => (
            <div key={i} style={{ display: "flex", position: "absolute", fontSize: 20 + i * 4, opacity: 0.04, left: `${5 + i * 22}%`, top: `${15 + (i % 3) * 30}%` }}>
              {s}
            </div>
          ))}

          <div style={{ display: "flex", flexDirection: "column", padding: "72px 56px 48px", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", position: "absolute", top: 0, left: 56, right: 56, height: 4, background: "linear-gradient(90deg, transparent, rgba(102,126,234,0.4), rgba(233,69,96,0.4), transparent)" }} />

            <div style={{ display: "flex", justifyContent: "center", fontSize: 24, color: "#6b7280", marginBottom: 40 }}>
              {data.doubanName ? `${data.doubanName} 的书影音品味报告` : "书影音品味报告"}
            </div>

            <div style={{ display: "flex", justifyContent: "center", fontSize: 104, fontWeight: 900, letterSpacing: "0.12em", background: "linear-gradient(90deg, #667eea 0%, #e94560 50%, #f5c518 100%)", backgroundClip: "text", color: "transparent", marginBottom: 12 }}>
              {data.mbtiType}
            </div>

            <div style={{ display: "flex", justifyContent: "center", fontSize: 32, fontWeight: 600, color: "#e94560", marginBottom: 36 }}>
              {data.mbtiTitle}
            </div>

            <div style={{ display: "flex", justifyContent: "center", background: "rgba(255,255,255,0.03)", border: "2px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "24px 32px", marginBottom: 40 }}>
              <div style={{ display: "flex", fontSize: 26, color: "#d1d5db", textAlign: "center", lineHeight: 1.6, fontStyle: "italic" }}>
                &ldquo;{data.roast}&rdquo;
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "row", gap: 16, marginBottom: 40 }}>
              {stats.map((s) => (
                <div key={s.label} style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "2px solid rgba(255,255,255,0.05)", borderRadius: 20, padding: "20px 12px", gap: 4 }}>
                  <span style={{ fontSize: 28 }}>{s.icon}</span>
                  <span style={{ fontSize: 40, fontWeight: 700, color: s.color }}>{s.val}</span>
                  <span style={{ fontSize: 20, color: "#6b7280" }}>{s.label}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", fontSize: 24, color: "#9ca3af", lineHeight: 1.7, marginBottom: 44 }}>
              {data.summary}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 36 }}>
              <div style={{ display: "flex", flex: 1, height: 2, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08))" }} />
              <span style={{ fontSize: 22, color: "#4b5563" }}>深度画像</span>
              <div style={{ display: "flex", flex: 1, height: 2, background: "linear-gradient(90deg, rgba(255,255,255,0.08), transparent)" }} />
            </div>

            {sections.map((sec) => (
              <AnalysisBlock key={sec.theme.title} text={sec.text} theme={sec.theme} />
            ))}

            <div style={{ display: "flex", height: 2, marginTop: 40, marginBottom: 28, background: "linear-gradient(90deg, rgba(102,126,234,0.3), rgba(233,69,96,0.2), rgba(245,197,24,0.3))" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", width: 8, height: 8, borderRadius: "50%", background: "#667eea" }} />
                <span style={{ color: "#4b5563" }}>豆瓣书影音 MBTI</span>
              </div>
              <span style={{ color: "#667eea", opacity: 0.7 }}>品味即人格 →</span>
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
    console.error("Share report error:", msg);
    return new Response(`生成失败: ${msg}`, { status: 500 });
  }
}
