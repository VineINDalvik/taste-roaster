"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface Props {
  reportId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  report: any;
  onClose: () => void;
}

export default function InviteModal({ reportId, report, onClose }: Props) {
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateLink = useCallback(async () => {
    if (generating || !report) return;
    setGenerating(true);
    setError(null);

    try {
      const myBookCount =
        report.realCounts?.books ||
        report.bookCount ||
        report.input?.books?.length ||
        0;
      const myMovieCount =
        report.realCounts?.movies ||
        report.movieCount ||
        report.input?.movies?.length ||
        0;
      const myMusicCount =
        report.realCounts?.music ||
        report.musicCount ||
        report.input?.music?.length ||
        0;

      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:
            report.doubanName || report.input?.doubanId || "神秘用户",
          doubanId: report.input?.doubanId,
          mbtiType: report.mbti.type,
          mbtiTitle: report.mbti.title,
          dimensions: report.mbti.dimensions,
          radarData: report.radarData,
          summary: report.summary,
          roast: report.roast,
          bookTitles: (report.input?.books ?? [])
            .slice(0, 30)
            .map((b: { title: string }) => b.title),
          movieTitles: (report.input?.movies ?? [])
            .slice(0, 30)
            .map((m: { title: string }) => m.title),
          musicTitles: (report.input?.music ?? [])
            .slice(0, 30)
            .map((m: { title: string }) => m.title),
          bookCount: myBookCount,
          movieCount: myMovieCount,
          musicCount: myMusicCount,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "生成邀请链接失败");
      }

      const { code } = await res.json();
      const link = `${window.location.origin}/invite/${code}`;
      setInviteLink(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  }, [generating, report]);

  const handleCopy = useCallback(async () => {
    if (!inviteLink) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteLink);
      } else {
        const ta = document.createElement("textarea");
        ta.value = inviteLink;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback handled above
    }
  }, [inviteLink]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm card-glass rounded-2xl p-6 space-y-5 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="text-3xl mb-2">👥</div>
          <h2 className="text-lg font-bold text-white">邀请 TA 来对比</h2>
          <p className="text-xs text-gray-400 mt-1">
            选择一种方式发起品味对比
          </p>
        </div>

        {/* Option 1: Same device */}
        <Link
          href={`/compare?from=${reportId}`}
          className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#667eea]/40 hover:bg-white/[0.06] transition-all group"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#667eea]/10 flex items-center justify-center text-lg">
            📱
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white group-hover:text-[#667eea] transition-colors">
              当面对比
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              直接输入对方的豆瓣 ID，当场揭晓结果
            </p>
          </div>
          <span className="text-gray-600 group-hover:text-[#667eea] transition-colors">
            →
          </span>
        </Link>

        {/* Option 2: Generate invite link */}
        {!inviteLink ? (
          <button
            onClick={handleGenerateLink}
            disabled={generating}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#e94560]/40 hover:bg-white/[0.06] transition-all group disabled:opacity-50"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#e94560]/10 flex items-center justify-center text-lg">
              🔗
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-white group-hover:text-[#e94560] transition-colors">
                {generating ? "生成中..." : "生成邀请链接"}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                发给 TA，TA 打开就能直接对比（7天有效）
              </p>
            </div>
            <span className="text-gray-600 group-hover:text-[#e94560] transition-colors">
              {generating ? "⏳" : "→"}
            </span>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-[#e94560]/30">
              <p className="text-xs text-gray-400 mb-2">邀请链接已生成</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  className="flex-1 text-xs text-white bg-transparent outline-none truncate"
                />
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: copied
                      ? "rgba(34, 197, 94, 0.2)"
                      : "rgba(233, 69, 96, 0.15)",
                    color: copied ? "#22c55e" : "#e94560",
                  }}
                >
                  {copied ? "已复制 ✓" : "复制"}
                </button>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 text-center">
              链接 7 天内有效 · 对方打开后输入豆瓣 ID 即可对比
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-sm text-gray-400 hover:text-white transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
}
