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

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}>
      <div style={{ display: "flex", height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 18 }} />
      <div style={{ display: "flex", fontSize: 16, fontWeight: 700, color: "#e94560", marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", fontSize: 14, color: "#d1d5db", lineHeight: 1.8 }}>
        {content}
      </div>
    </div>
  );
}

export async function POST(req: NextRequest) {
  try {
    const data: ReportData = await req.json();
    const fonts = await loadFonts();

    const sections = [
      { title: "阅读画像", text: data.bookAnalysis },
      { title: "观影画像", text: data.movieAnalysis },
      { title: "音乐画像", text: data.musicAnalysis },
    ].filter((s): s is { title: string; text: string } => !!s.text);

    // Content area 336px; 14px CJK ≈ 24 chars/line; lineHeight 1.8 ≈ 25px/line
    const CHARS_PER_LINE = 24;
    const LINE_H = 25;
    const countVisualLines = (text: string) =>
      text.split(/\n/).reduce((sum, p) => sum + Math.max(1, Math.ceil(p.length / CHARS_PER_LINE)), 0);

    const roastLines = countVisualLines(data.roast || "");
    const summaryLines = countVisualLines(data.summary || "");
    const sectionLines = sections.reduce((sum, s) => sum + countVisualLines(s.text) + 3, 0);
    // header(70) + type(80) + title(30) + roast box + stats(80) + summary + sections + footer(60)
    const estimatedHeight = Math.max(800, 300 + (roastLines + summaryLines + sectionLines) * LINE_H + sections.length * 50 + 200);
    const height = Math.min(estimatedHeight, 6000);

    const stats = [
      { val: data.bookCount, label: "本书" },
      { val: data.movieCount, label: "部电影" },
      { val: data.musicCount, label: "首音乐" },
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
            padding: "44px 32px 28px",
            fontFamily: "NotoSansSC",
            color: "#ffffff",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "center", fontSize: 13, color: "#8b95a5", marginBottom: 20 }}>
            {data.doubanName ? `${data.doubanName} 的书影音 MBTI` : "书影音 MBTI"}
          </div>

          {/* MBTI Type */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              fontSize: 48,
              fontWeight: 900,
              letterSpacing: "0.1em",
              background: "linear-gradient(90deg, #667eea 0%, #e94560 100%)",
              backgroundClip: "text",
              color: "transparent",
              marginBottom: 8,
            }}
          >
            {data.mbtiType}
          </div>

          {/* Title */}
          <div style={{ display: "flex", justifyContent: "center", fontSize: 17, fontWeight: 600, color: "#e94560", marginBottom: 20 }}>
            {data.mbtiTitle}
          </div>

          {/* Roast */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 10,
              padding: "12px 18px",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", fontSize: 14, color: "#d1d5db", textAlign: "center", lineHeight: 1.6, fontStyle: "italic" }}>
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
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 8,
                  padding: "10px 8px",
                }}
              >
                <span style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{s.val}</span>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div style={{ display: "flex", fontSize: 13, color: "#9ca3af", lineHeight: 1.7, marginBottom: 20 }}>
            {data.summary}
          </div>

          {/* Analysis sections */}
          {sections.map((sec) => (
            <Section key={sec.title} title={sec.title} content={sec.text} />
          ))}

          {/* Footer */}
          <div style={{ display: "flex", height: 1, background: "rgba(255,255,255,0.06)", marginTop: "auto", marginBottom: 16 }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "#4b5563" }}>豆瓣书影音 MBTI</span>
            <span style={{ color: "#667eea" }}>品味即人格 →</span>
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
