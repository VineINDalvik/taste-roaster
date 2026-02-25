"use client";

import { FREE_LIMIT } from "@/lib/compare-limit";

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
            每人 {FREE_LIMIT} 次免费额度，你已使用
          </p>
        </div>

        <p className="text-sm text-gray-500 text-center">
          觉得有意思？在结果页底部可赞赏支持作者 ☕
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl card-glass text-gray-300 text-sm hover:bg-white/10 transition-colors"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
