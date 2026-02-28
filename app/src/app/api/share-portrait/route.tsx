import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { fixMbtiInText } from "@/lib/mbti-utils";
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

type Kind = "book" | "movie" | "music";

const THEMES: Record<
  Kind,
  { icon: string; title: string; color: string; highlight: string; dim: string; border: string }
> = {
  book: {
    icon: "📚",
    title: "阅读画像",
    color: "#fbbf24",
    highlight: "rgba(252,211,147,0.95)",
    dim: "rgba(252,211,147,0.1)",
    border: "rgba(217,119,6,0.3)",
  },
  movie: {
    icon: "🎬",
    title: "观影画像",
    color: "#60a5fa",
    highlight: "rgba(147,197,253,0.95)",
    dim: "rgba(147,197,253,0.08)",
    border: "rgba(59,130,246,0.3)",
  },
  music: {
    icon: "🎵",
    title: "音乐画像",
    color: "#a78bfa",
    highlight: "rgba(216,180,254,0.95)",
    dim: "rgba(216,180,254,0.1)",
    border: "rgba(168,85,247,0.3)",
  },
};

function splitSentences(text: string) {
  return text
    .split(/(?<=[。！？\n])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 12);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      kind: Kind;
      mbtiType: string;
      analysis: string;
      doubanName?: string;
    };

    const kind = body?.kind;
    const mbtiType = (body?.mbtiType || "").toUpperCase();
    const theme = kind ? THEMES[kind] : undefined;
    if (!theme) return new Response("缺少 kind", { status: 400 });
    if (!mbtiType) return new Response("缺少 mbtiType", { status: 400 });
    if (!body?.analysis) return new Response("缺少 analysis", { status: 400 });

    const fonts = await loadFonts();
    const siteQr = await getSiteQrTransparentDataUrl();
    const text = fixMbtiInText(body.analysis, mbtiType);
    const sents = splitSentences(text);

    // Height estimate
    const CW = 24;
    const lineH = 44;
    const textH =
      sents.reduce((sum, s, i) => {
        const lines = Math.max(1, Math.ceil(s.length / CW));
        return sum + lines * lineH + (i === 0 ? 24 : 0);
      }, 0) +
      Math.max(0, sents.length - 1) * 10;
    const height = Math.min(Math.max(980, 640 + textH), 2000);

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background:
              "linear-gradient(135deg, #0f0c29 0%, #1a1a2e 30%, #16213e 60%, #0f3460 100%)",
            fontFamily: "NotoSansSC",
            color: "#ffffff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: -120,
              right: -80,
              width: 360,
              height: 360,
              borderRadius: "50%",
              background: "rgba(102,126,234,0.04)",
            }}
          />
          <div
            style={{
              display: "flex",
              position: "absolute",
              bottom: -80,
              left: -60,
              width: 320,
              height: 320,
              borderRadius: "50%",
              background: "rgba(233,69,96,0.04)",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "64px 56px 92px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                fontSize: 22,
                color: "#6b7280",
                marginBottom: 26,
              }}
            >
              {body.doubanName ? `${body.doubanName} 的${theme.title}` : theme.title}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
              <div
                style={{
                  display: "flex",
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  background: theme.dim,
                  border: `2px solid ${theme.border}`,
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 34,
                }}
              >
                {theme.icon}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 32, fontWeight: 800, color: theme.color }}>
                  {mbtiType}
                </div>
                <div style={{ display: "flex", fontSize: 20, color: "#6b7280", marginTop: 6 }}>
                  {theme.title}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                background: "rgba(255,255,255,0.03)",
                border: "2px solid rgba(255,255,255,0.06)",
                borderRadius: 20,
                padding: "28px 28px",
              }}
            >
              {sents.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    fontSize: i === 0 ? 28 : 26,
                    fontWeight: i === 0 ? 700 : 400,
                    color: i === 0 ? theme.highlight : "rgba(209,213,219,0.82)",
                    lineHeight: 1.75,
                    ...(i === 0
                      ? {
                          padding: "14px 18px",
                          background: theme.dim,
                          borderRadius: 14,
                          borderLeft: `6px solid ${theme.color}80`,
                        }
                      : {}),
                  }}
                >
                  {s}
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                height: 2,
                marginTop: 38,
                marginBottom: 22,
                background: "linear-gradient(90deg, rgba(102,126,234,0.28), rgba(233,69,96,0.18))",
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 20, lineHeight: 1.2 }}>
              <div style={{ display: "flex", flex: 1, minWidth: 0, alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", width: 8, height: 8, borderRadius: "50%", background: "#667eea" }} />
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
                <span style={{ color: "#667eea", opacity: 0.7, whiteSpace: "nowrap" }}>品味即人格 →</span>
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
    console.error("Share portrait error:", msg);
    return new Response(`生成失败: ${msg}`, { status: 500 });
  }
}

