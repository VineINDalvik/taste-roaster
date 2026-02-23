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
    <div style={{ display: "flex", flexDirection: "column", marginBottom: 16 }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: theme.dim,
            border: `1px solid ${theme.border}`,
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          {theme.icon}
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: theme.color }}>{theme.title}</span>
      </div>

      {/* Sentences with first highlighted */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sentences.map((sentence, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              fontSize: i === 0 ? 14 : 13,
              fontWeight: i === 0 ? 600 : 400,
              color: i === 0 ? theme.highlight : "rgba(209,213,219,0.8)",
              lineHeight: 1.75,
              ...(i === 0
                ? {
                    padding: "8px 12px",
                    background: theme.dim,
                    borderRadius: 6,
                    borderLeft: `3px solid ${theme.color}80`,
                  }
                : {}),
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

    const CHARS_PER_LINE = 22;
    const LINE_H = 24;
    const countVisualLines = (text: string) => {
      const sents = text.split(/(?<=[。！？\n])/).map((s) => s.trim()).filter((s) => s.length > 0);
      return sents.reduce((sum, s) => sum + Math.max(1, Math.ceil(s.length / CHARS_PER_LINE)), 0) + sents.length;
    };

    const roastLines = Math.max(1, Math.ceil((data.roast?.length || 0) / CHARS_PER_LINE));
    const summaryLines = countVisualLines(data.summary || "");
    const sectionLines = sections.reduce((sum, s) => sum + countVisualLines(s.text) + 4, 0);
    const estimatedHeight = Math.max(900, 420 + (roastLines + summaryLines) * LINE_H + sectionLines * LINE_H + sections.length * 60 + 120);
    const height = Math.min(estimatedHeight, 6000);

    const stats = [
      { val: data.bookCount, label: "本书", icon: "📚", color: "#fbbf24" },
      { val: data.movieCount, label: "部电影", icon: "🎬", color: "#60a5fa" },
      { val: data.musicCount, label: "首音乐", icon: "🎵", color: "#a78bfa" },
    ].filter((s) => s.val > 0);

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
          {/* Decorative glows */}
          <div style={{ display: "flex", position: "absolute", top: -60, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(102,126,234,0.04)" }} />
          <div style={{ display: "flex", position: "absolute", bottom: -40, left: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(233,69,96,0.04)" }} />
          <div style={{ display: "flex", position: "absolute", top: "40%", right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(168,85,247,0.03)" }} />

          {/* Decorative star pattern */}
          {["✦", "◆", "✧", "●", "✦"].map((s, i) => (
            <div key={i} style={{ display: "flex", position: "absolute", fontSize: 10 + i * 2, opacity: 0.04, left: `${5 + i * 22}%`, top: `${15 + (i % 3) * 30}%` }}>
              {s}
            </div>
          ))}

          {/* Main content */}
          <div style={{ display: "flex", flexDirection: "column", padding: "36px 28px 24px", position: "relative", zIndex: 1, flex: 1 }}>
            {/* Top accent */}
            <div style={{ display: "flex", position: "absolute", top: 0, left: 28, right: 28, height: 2, background: "linear-gradient(90deg, transparent, rgba(102,126,234,0.4), rgba(233,69,96,0.4), transparent)" }} />

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "center", fontSize: 12, color: "#6b7280", marginBottom: 20 }}>
              {data.doubanName ? `${data.doubanName} 的书影音品味报告` : "书影音品味报告"}
            </div>

            {/* MBTI Type with gradient */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                fontSize: 52,
                fontWeight: 900,
                letterSpacing: "0.12em",
                background: "linear-gradient(90deg, #667eea 0%, #e94560 50%, #f5c518 100%)",
                backgroundClip: "text",
                color: "transparent",
                marginBottom: 6,
              }}
            >
              {data.mbtiType}
            </div>

            {/* Title */}
            <div style={{ display: "flex", justifyContent: "center", fontSize: 16, fontWeight: 600, color: "#e94560", marginBottom: 18 }}>
              {data.mbtiTitle}
            </div>

            {/* Roast box */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", fontSize: 13, color: "#d1d5db", textAlign: "center", lineHeight: 1.6, fontStyle: "italic" }}>
                &ldquo;{data.roast}&rdquo;
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", flexDirection: "row", gap: 8, marginBottom: 20 }}>
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{
                    display: "flex",
                    flex: 1,
                    flexDirection: "column",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 10,
                    padding: "10px 6px",
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{s.icon}</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</span>
                  <span style={{ fontSize: 10, color: "#6b7280" }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div style={{ display: "flex", fontSize: 12, color: "#9ca3af", lineHeight: 1.7, marginBottom: 22 }}>
              {data.summary}
            </div>

            {/* Section divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ display: "flex", flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08))" }} />
              <span style={{ fontSize: 11, color: "#4b5563" }}>深度画像</span>
              <div style={{ display: "flex", flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.08), transparent)" }} />
            </div>

            {/* Analysis sections */}
            {sections.map((sec) => (
              <AnalysisBlock key={sec.theme.title} text={sec.text} theme={sec.theme} />
            ))}

            {/* Bottom accent divider */}
            <div
              style={{
                display: "flex",
                height: 1,
                marginTop: "auto",
                marginBottom: 14,
                background: "linear-gradient(90deg, rgba(102,126,234,0.3), rgba(233,69,96,0.2), rgba(245,197,24,0.3))",
              }}
            />

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ display: "flex", width: 4, height: 4, borderRadius: "50%", background: "#667eea" }} />
                <span style={{ color: "#4b5563" }}>豆瓣书影音 MBTI</span>
              </div>
              <span style={{ color: "#667eea", opacity: 0.7 }}>品味即人格 →</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 400,
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
