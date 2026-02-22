import Link from "next/link";

const MBTI_EXAMPLES = [
  { type: "INTJ", desc: "理性主义审美建筑师" },
  { type: "ENFP", desc: "浪漫主义杂食探险家" },
  { type: "INFJ", desc: "孤独的灵魂考古者" },
  { type: "ISTP", desc: "冷感解构主义技术控" },
  { type: "ENFJ", desc: "共情型文化布道者" },
  { type: "INTP", desc: "赛博苦行僧" },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Hero */}
      <div className="text-center max-w-lg mx-auto space-y-6 animate-fade-in-up">
        <div className="text-sm tracking-widest text-[#667eea] font-medium">
          文化 MBTI 鉴定
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
          你的品味
          <span className="text-gradient">是什么人格</span>
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          输入豆瓣 ID，AI 从你的书影音中
          <br />
          推导你的 MBTI 类型——你是谁，一目了然
        </p>
      </div>

      {/* CTA */}
      <div className="mt-10 animate-fade-in-up animate-delay-200">
        <Link
          href="/upload"
          className="inline-block px-8 py-4 rounded-2xl accent-gradient text-white font-bold text-lg hover:opacity-90 transition-opacity pulse-glow"
        >
          测测我的文化 MBTI
        </Link>
      </div>

      {/* MBTI examples */}
      <div className="mt-12 max-w-md mx-auto animate-fade-in-up animate-delay-300">
        <p className="text-center text-xs text-gray-500 mb-4">
          过往用户的文化 MBTI...
        </p>
        <div className="grid grid-cols-2 gap-2">
          {MBTI_EXAMPLES.map((ex) => (
            <div
              key={ex.type}
              className="flex items-center gap-2 px-3 py-2 rounded-xl card-glass"
            >
              <span className="text-sm font-black text-[#667eea]">
                {ex.type}
              </span>
              <span className="text-xs text-gray-400 truncate">
                {ex.desc}
              </span>
            </div>
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
              智能采样数据
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl">🧬</div>
            <div className="text-sm text-gray-300 font-medium">
              AI 推导 MBTI
            </div>
            <div className="text-xs text-gray-500">
              四维度逐一分析
              <br />
              用作品作为证据
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-2xl">🎴</div>
            <div className="text-sm text-gray-300 font-medium">生成报告</div>
            <div className="text-xs text-gray-500">
              MBTI 卡片 + 深度解读
              <br />
              一键分享
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-20 text-center text-xs text-gray-600">
        <p>由 AI 驱动 · 你的品味暴露了你是谁</p>
      </div>
    </main>
  );
}
