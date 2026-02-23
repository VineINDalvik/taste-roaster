"use client";

import { PRICE_CNY, FREE_LIMIT } from "@/lib/compare-limit";

interface PaymentGateProps {
  usedCount: number;
  onClose: () => void;
  onBypass?: () => void;
}

export default function PaymentGate({
  usedCount,
  onClose,
}: PaymentGateProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 space-y-5 animate-fade-in-up"
        style={{
          background:
            "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div className="text-center space-y-2">
          <div className="text-3xl">🔒</div>
          <h3 className="text-lg font-bold text-white">对比次数已用完</h3>
          <p className="text-sm text-gray-400">
            你已经免费对比了 {usedCount} 次（每人 {FREE_LIMIT} 次免费额度）
          </p>
        </div>

        <div
          className="rounded-xl p-4 text-center space-y-3"
          style={{
            background: "rgba(233, 69, 96, 0.08)",
            border: "1px solid rgba(233, 69, 96, 0.2)",
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-black text-[#e94560]">
              ¥{PRICE_CNY}
            </span>
            <span className="text-xs text-gray-400">/次</span>
          </div>
          <p className="text-xs text-gray-300">
            解锁更多双人品味对比
          </p>
        </div>

        <div className="space-y-3">
          <div className="text-center space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/tip-qrcode.jpg"
              alt="支付二维码"
              className="w-36 h-36 mx-auto rounded-xl"
            />
            <p className="text-[10px] text-gray-500">
              微信扫码支付 · 支付后刷新页面即可使用
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl card-glass text-gray-300 text-sm hover:bg-white/10 transition-colors"
          >
            下次再说
          </button>
        </div>

        <p className="text-[10px] text-gray-600 text-center">
          赞赏任意金额后联系作者解锁 · 也可以分享给朋友攒人品
        </p>
      </div>
    </div>
  );
}
