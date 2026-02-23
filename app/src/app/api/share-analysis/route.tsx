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
  icon: string;
  title: string;
  content: string;
  mbtiType: string;
  doubanName?: string;
}

const THEMES: Record<string, {
  bg: string;
  iconBg: string;
  iconBorder: string;
  titleColor: string;
  subtitle: string;
  highlightColor: string;
  accentDim: string;
  decoColor: string;
  decoIcons: string[];
}> = {
  "📚": {
    bg: "linear-gradient(135deg, #2d1810 0%, #1a1207 40%, #1a1a2e 100%)",
    iconBg: "linear-gradient(135deg, rgba(217,119,6,0.3), rgba(120,53,15,0.3))",
    iconBorder: "rgba(217,119,6,0.2)",
    titleColor: "#fbbf24",
    subtitle: "的书架密码",
    highlightColor: "rgba(252,211,147,0.95)",
    accentDim: "rgba(252,211,147,0.15)",
    decoColor: "rgba(217,119,6,0.06)",
    decoIcons: ["📖", "📝", "✦", "📄", "🔖"],
  },
  "🎬": {
    bg: "linear-gradient(135deg, #0a0a14 0%, #111128 40%, #1a1a2e 100%)",
    iconBg: "linear-gradient(135deg, rgba(30,64,175,0.4), rgba(49,46,129,0.4))",
    iconBorder: "rgba(59,130,246,0.15)",
    titleColor: "#60a5fa",
    subtitle: "的光影密码",
    highlightColor: "rgba(147,197,253,0.95)",
    accentDim: "rgba(147,197,253,0.12)",
    decoColor: "rgba(59,130,246,0.06)",
    decoIcons: ["🎞️", "🎥", "✦", "🎭", "🍿"],
  },
  "🎵": {
    bg: "linear-gradient(135deg, #1a0533 0%, #0d1b3e 40%, #1a1a2e 100%)",
    iconBg: "linear-gradient(135deg, rgba(168,85,247,0.3), rgba(59,130,246,0.3))",
    iconBorder: "rgba(168,85,247,0.2)",
    titleColor: "#a78bfa",
    subtitle: "的声波密码",
    highlightColor: "rgba(216,180,254,0.95)",
    accentDim: "rgba(216,180,254,0.12)",
    decoColor: "rgba(168,85,247,0.08)",
    decoIcons: ["♪", "♫", "♩", "♬", "♭"],
  },
};

const DEFAULT_THEME = {
  bg: "linear-gradient(135deg, #0f0c29 0%, #1a1a2e 30%, #16213e 60%, #0f3460 100%)",
  iconBg: "linear-gradient(135deg, rgba(233,69,96,0.25), rgba(118,75,162,0.25))",
  iconBorder: "rgba(233,69,96,0.2)",
  titleColor: "#e94560",
  subtitle: "",
  highlightColor: "rgba(233,69,96,0.85)",
  accentDim: "rgba(233,69,96,0.1)",
  decoColor: "rgba(233,69,96,0.05)",
  decoIcons: ["✦", "◆", "●", "◇", "✧"],
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

    // Tight height calc: header(68) + badge(~40 if present) + content + footer(60) + padding(60)
    const CW = 22; // chars per line at 13-15px in 344px content width
    const LH = 24; // line height per visual line
    const firstSentExtra = 26; // padding + border for highlight block
    const contentH = sentences.reduce((sum, s, i) => {
      const lines = Math.max(1, Math.ceil(s.length / CW));
      return sum + lines * LH + (i === 0 ? firstSentExtra : 0);
    }, 0) + (sentences.length - 1) * 10; // gap between sentences
    const fixedH = 68 + (data.doubanName ? 40 : 0) + 60 + 60;
    const height = Math.min(Math.max(360, fixedH + contentH), 4000);

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
            <div
              key={i}
              style={{
                display: "flex",
                position: "absolute",
                fontSize: 16 + i * 4,
                opacity: 0.06,
                left: `${6 + i * 18}%`,
                top: `${60 + (i % 3) * 12}%`,
              }}
            >
              {ico}
            </div>
          ))}

          {/* Ambient glow */}
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: -40,
              right: -30,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: theme.decoColor,
              filter: "blur(40px)",
            }}
          />
          <div
            style={{
              display: "flex",
              position: "absolute",
              bottom: -50,
              left: -20,
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: theme.decoColor,
              filter: "blur(40px)",
            }}
          />

          {/* Main content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "36px 28px 24px",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Subtle top accent line */}
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: 0,
                left: 28,
                right: 28,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${theme.titleColor}40, transparent)`,
              }}
            />

            {/* Header with icon badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div
                style={{
                  display: "flex",
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: theme.iconBg,
                  border: `1px solid ${theme.iconBorder}`,
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                }}
              >
                {data.icon}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: theme.titleColor }}>
                  {data.title}
                </span>
                {theme.subtitle && (
                  <span style={{ fontSize: 11, color: `${theme.titleColor}66` }}>
                    {data.mbtiType} {theme.subtitle}
                  </span>
                )}
              </div>
            </div>

            {/* User badge */}
            {data.doubanName && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 20,
                  padding: "6px 12px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 20,
                  alignSelf: "flex-start",
                }}
              >
                <span style={{ fontSize: 11, color: "#6b7280" }}>
                  {data.doubanName} · {data.mbtiType}
                </span>
              </div>
            )}

            {/* Sentences with first-sentence highlight */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sentences.map((sentence, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    fontSize: i === 0 ? 15 : 13,
                    fontWeight: i === 0 ? 600 : 400,
                    color: i === 0 ? theme.highlightColor : "rgba(209,213,219,0.8)",
                    lineHeight: 1.8,
                    ...(i === 0
                      ? {
                          padding: "10px 14px",
                          background: theme.accentDim,
                          borderRadius: 8,
                          borderLeft: `3px solid ${theme.titleColor}80`,
                        }
                      : {}),
                  }}
                >
                  {sentence}
                </div>
              ))}
            </div>

            {/* Accent divider */}
            <div
              style={{
                display: "flex",
                height: 1,
                marginTop: 24,
                marginBottom: 14,
                background: `linear-gradient(90deg, ${theme.titleColor}30, rgba(255,255,255,0.04), ${theme.titleColor}30)`,
              }}
            />

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    display: "flex",
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: theme.titleColor,
                  }}
                />
                <span style={{ color: "#4b5563" }}>豆瓣书影音 MBTI</span>
              </div>
              <span style={{ color: theme.titleColor, opacity: 0.7, fontSize: 11 }}>品味即人格 →</span>
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
    console.error("Share analysis error:", msg);
    return new Response(`生成失败: ${msg}`, { status: 500 });
  }
}
