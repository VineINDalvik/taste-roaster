import Link from "next/link";

const EXAMPLE_LABELS = [
  "文艺复兴型废物",
  "赛博苦行僧",
  "算法叛逃者",
  "情感海绵体",
  "精神分裂型杂食者",
  "学院派摸鱼人",
  "浪漫主义打工人",
  "地下文艺青年",
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Hero */}
      <div className="text-center max-w-lg mx-auto space-y-6 animate-fade-in-up">
        <div className="text-sm tracking-widest text-[#e94560] font-medium">
          AI 品味鉴定
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
          毒舌
          <span className="text-gradient">品味官</span>
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          输入豆瓣 ID，AI 自动扫描你的书影音、评论、日记
          <br />
          用最犀利的方式鉴定你的品味人格
        </p>
      </div>

      {/* CTA */}
      <div className="mt-10 animate-fade-in-up animate-delay-200">
        <Link
          href="/upload"
          className="inline-block px-8 py-4 rounded-2xl accent-gradient text-white font-bold text-lg hover:opacity-90 transition-opacity pulse-glow"
        >
          输入豆瓣 ID 开始鉴定
        </Link>
      </div>

      {/* Label examples */}
      <div className="mt-12 max-w-md mx-auto animate-fade-in-up animate-delay-300">
        <p className="text-center text-xs text-gray-500 mb-4">
          过往用户被判定为...
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {EXAMPLE_LABELS.map((label) => (
            <span
              key={label}
              className="px-3 py-1.5 rounded-full text-xs card-glass text-gray-300"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mt-16 max-w-lg mx-auto animate-fade-in-up animate-delay-400">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="text-2xl">🔍</div>
            <div className="text-sm text-gray-300 font-medium">输入 ID</div>
            <div className="text-xs text-gray-500">
              豆瓣 ID 或链接
              <br />
              自动抓取全部数据
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl">🤖</div>
            <div className="text-sm text-gray-300 font-medium">AI 深度鉴定</div>
            <div className="text-xs text-gray-500">
              书影音 + 评论 + 日记
              <br />
              全方位品味扫描
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl">🎴</div>
            <div className="text-sm text-gray-300 font-medium">生成卡片</div>
            <div className="text-xs text-gray-500">
              品味标签 + 毒评
              <br />
              一键分享
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-20 text-center text-xs text-gray-600">
        <p>由 AI 驱动 · 你的品味经得起检验吗？</p>
      </div>
    </main>
  );
}
