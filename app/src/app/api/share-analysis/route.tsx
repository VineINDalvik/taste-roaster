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

interface CardData {
  title: string;
  content: string;
  mbtiType: string;
  doubanName?: string;
}

export async function POST(req: NextRequest) {
  try {
    const data: CardData = await req.json();
    const fonts = await loadFonts();

    // Content area is 400 - 32*2 = 336px; at 14px CJK font ≈ 24 chars/line; lineHeight 1.8 ≈ 25px/line
    const CHARS_PER_LINE = 24;
    const LINE_H = 25;
    const paragraphs = data.content.split(/\n/);
    const visualLines = paragraphs.reduce((sum, p) => sum + Math.max(1, Math.ceil(p.length / CHARS_PER_LINE)), 0);
    // header(40) + name(30) + title(42) + content + footer(60) + padding
    const estimatedHeight = Math.max(400, 120 + visualLines * LINE_H + 100);
    const height = Math.min(estimatedHeight, 4000);

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #0f0c29 0%, #1a1a2e 30%, #16213e 60%, #0f3460 100%)",
            padding: "40px 32px 28px",
            fontFamily: "NotoSansSC",
            color: "#ffffff",
          }}
        >
          {/* Header */}
          {data.doubanName && (
            <div style={{ display: "flex", justifyContent: "center", fontSize: 13, color: "#8b95a5", marginBottom: 16 }}>
              {data.doubanName} · {data.mbtiType}
            </div>
          )}

          {/* Title */}
          <div style={{ display: "flex", fontSize: 18, fontWeight: 700, color: "#e94560", marginBottom: 24 }}>
            {data.title}
          </div>

          {/* Content */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", flexWrap: "wrap", fontSize: 14, color: "#d1d5db", lineHeight: 1.8 }}>
              {data.content}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", height: 1, background: "rgba(255,255,255,0.06)", marginTop: 20, marginBottom: 16 }} />
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
    console.error("Share analysis error:", msg);
    return new Response(`生成失败: ${msg}`, { status: 500 });
  }
}
