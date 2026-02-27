import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { SITE_HOST } from "@/lib/site";

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

// 2x retina: all pixel values are doubled for crisp text on mobile
const D = 2;

interface CardData {
  icon: string;
  title: string;
  content: string;
  mbtiType: string;
  doubanName?: string;
}

const THEMES: Record<string, {
  bg: string; iconBg: string; iconBorder: string; titleColor: string;
  subtitle: string; highlightColor: string; accentDim: string;
  decoColor: string; decoIcons: string[];
}> = {
  "📚": {
    bg: "linear-gradient(135deg, #2d1810 0%, #1a1207 40%, #1a1a2e 100%)",
    iconBg: "linear-gradient(135deg, rgba(217,119,6,0.3), rgba(120,53,15,0.3))",
    iconBorder: "rgba(217,119,6,0.2)", titleColor: "#fbbf24", subtitle: "的书架密码",
    highlightColor: "rgba(252,211,147,0.95)", accentDim: "rgba(252,211,147,0.15)",
    decoColor: "rgba(217,119,6,0.06)", decoIcons: ["📖", "📝", "✦", "📄", "🔖"],
  },
  "🎬": {
    bg: "linear-gradient(135deg, #0a0a14 0%, #111128 40%, #1a1a2e 100%)",
    iconBg: "linear-gradient(135deg, rgba(30,64,175,0.4), rgba(49,46,129,0.4))",
    iconBorder: "rgba(59,130,246,0.15)", titleColor: "#60a5fa", subtitle: "的光影密码",
    highlightColor: "rgba(147,197,253,0.95)", accentDim: "rgba(147,197,253,0.12)",
    decoColor: "rgba(59,130,246,0.06)", decoIcons: ["🎞️", "🎥", "✦", "🎭", "🍿"],
  },
  "🎵": {
    bg: "linear-gradient(135deg, #1a0533 0%, #0d1b3e 40%, #1a1a2e 100%)",
    iconBg: "linear-gradient(135deg, rgba(168,85,247,0.3), rgba(59,130,246,0.3))",
    iconBorder: "rgba(168,85,247,0.2)", titleColor: "#a78bfa", subtitle: "的声波密码",
    highlightColor: "rgba(216,180,254,0.95)", accentDim: "rgba(216,180,254,0.12)",
    decoColor: "rgba(168,85,247,0.08)", decoIcons: ["♪", "♫", "♩", "♬", "♭"],
  },
};

const DEFAULT_THEME = {
  bg: "linear-gradient(135deg, #0f0c29 0%, #1a1a2e 30%, #16213e 60%, #0f3460 100%)",
  iconBg: "linear-gradient(135deg, rgba(233,69,96,0.25), rgba(118,75,162,0.25))",
  iconBorder: "rgba(233,69,96,0.2)", titleColor: "#e94560", subtitle: "",
  highlightColor: "rgba(233,69,96,0.85)", accentDim: "rgba(233,69,96,0.1)",
  decoColor: "rgba(233,69,96,0.05)", decoIcons: ["✦", "◆", "●", "◇", "✧"],
};

export async function POST(req: NextRequest) {
  try {
    const data: CardData = await req.json();
    const fonts = await loadFonts();
    const theme = THEMES[data.icon] || DEFAULT_THEME;

    const sentences = data.content
      .split(/(?<=[。！？\n])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Height calc at 2x: content width ~688px at 26px font ≈ 26 chars/line
    const CW = 26;
    const LH = 48 * D / D; // visual line height at 2x
    const contentH = sentences.reduce((sum, s, i) => {
      const lines = Math.max(1, Math.ceil(s.length / CW));
      return sum + lines * 48 + (i === 0 ? 52 : 0);
    }, 0) + (sentences.length - 1) * 20;
    const fixedH = 136 + (data.doubanName ? 80 : 0) + 120 + 120;
    const height = Math.min(Math.max(720, fixedH + contentH), 8000);

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            background: theme.bg,
            fontFamily: "NotoSansSC",
            color: "#ffffff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative floating icons */}
          {theme.decoIcons.map((ico, i) => (
            <div key={i} style={{ display: "flex", position: "absolute", fontSize: 32 + i * 8, opacity: 0.06, left: `${6 + i * 18}%`, top: `${60 + (i % 3) * 12}%` }}>
              {ico}
            </div>
          ))}

          {/* Ambient glow */}
          <div style={{ display: "flex", position: "absolute", top: -80, right: -60, width: 320, height: 320, borderRadius: "50%", background: theme.decoColor }} />
          <div style={{ display: "flex", position: "absolute", bottom: -100, left: -40, width: 240, height: 240, borderRadius: "50%", background: theme.decoColor }} />

          {/* Main content */}
          <div style={{ display: "flex", flexDirection: "column", padding: `${72}px ${56}px ${72}px`, position: "relative", zIndex: 1 }}>
            {/* Top accent line */}
            <div style={{ display: "flex", position: "absolute", top: 0, left: 56, right: 56, height: 4, background: `linear-gradient(90deg, transparent, ${theme.titleColor}40, transparent)` }} />

            {/* Header with icon badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 48 }}>
              <div style={{ display: "flex", width: 88, height: 88, borderRadius: "50%", background: theme.iconBg, border: `2px solid ${theme.iconBorder}`, alignItems: "center", justifyContent: "center", fontSize: 44 }}>
                {data.icon}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 32, fontWeight: 700, color: theme.titleColor }}>{data.title}</span>
                {theme.subtitle && (
                  <span style={{ fontSize: 22, color: `${theme.titleColor}66` }}>{data.mbtiType} {theme.subtitle}</span>
                )}
              </div>
            </div>

            {/* User badge */}
            {data.doubanName && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40, padding: "12px 24px", background: "rgba(255,255,255,0.03)", border: "2px solid rgba(255,255,255,0.06)", borderRadius: 40, alignSelf: "flex-start" }}>
                <span style={{ fontSize: 22, color: "#6b7280" }}>{data.doubanName} · {data.mbtiType}</span>
              </div>
            )}

            {/* Sentences with first-sentence highlight */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {sentences.map((sentence, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    fontSize: i === 0 ? 30 : 26,
                    fontWeight: i === 0 ? 600 : 400,
                    color: i === 0 ? theme.highlightColor : "rgba(209,213,219,0.8)",
                    lineHeight: 1.8,
                    ...(i === 0
                      ? { padding: "20px 28px", background: theme.accentDim, borderRadius: 16, borderLeft: `6px solid ${theme.titleColor}80` }
                      : {}),
                  }}
                >
                  {sentence}
                </div>
              ))}
            </div>

            {/* Accent divider */}
            <div style={{ display: "flex", height: 2, marginTop: 48, marginBottom: 28, background: `linear-gradient(90deg, ${theme.titleColor}30, rgba(255,255,255,0.04), ${theme.titleColor}30)` }} />

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, fontSize: 22 }}>
              <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", width: 8, height: 8, borderRadius: "50%", background: theme.titleColor }} />
                <span style={{ color: "#4b5563" }}>豆瓣书影音 MBTI</span>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 16px",
                  borderRadius: 9999,
                  background: "linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 16,
                  letterSpacing: "0.04em",
                }}
              >
                {SITE_HOST}
              </div>

              <div style={{ display: "flex", flex: 1, justifyContent: "flex-end" }}>
                <span style={{ color: theme.titleColor, opacity: 0.7, fontSize: 22 }}>品味即人格 →</span>
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
    console.error("Share analysis error:", msg);
    return new Response(`生成失败: ${msg}`, { status: 500 });
  }
}
