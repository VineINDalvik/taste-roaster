import { NextRequest, NextResponse } from "next/server";
import { getInvite, isKvConfigured } from "@/lib/kv";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (process.env.NEXT_PUBLIC_DEV_MOCK === "true") {
    const mockFull = {
      name: "Mock用户",
      mbtiType: "INFJ",
      mbtiTitle: "孤独的灵魂考古者",
      dimensions: {
        ie: { letter: "I", score: 72, evidence: "偏好独处型文艺消费" },
        ns: { letter: "N", score: 78, evidence: "热衷抽象哲学与科幻" },
        tf: { letter: "F", score: 65, evidence: "选片偏情感驱动" },
        jp: { letter: "J", score: 60, evidence: "系列控特征明显" },
      },
      radarData: { wenqing: 82, emo: 76, shekong: 68, kaogu: 71, shangtou: 85, chouxiang: 63 },
      summary: "一个在书影音世界里寻找灵魂共鸣的INFJ",
      roast: "你的书架比你的社交圈有趣多了",
      bookTitles: ["百年孤独", "三体", "小径分岔的花园", "1984", "挪威的森林"],
      movieTitles: ["花样年华", "穆赫兰道", "2001太空漫游", "东京物语"],
      musicTitles: ["Radiohead", "Elliott Smith", "Bon Iver"],
      bookCount: 56,
      movieCount: 56,
      musicCount: 56,
    };
    return NextResponse.json({
      name: mockFull.name,
      mbtiType: mockFull.mbtiType,
      mbtiTitle: mockFull.mbtiTitle,
      full: mockFull,
    });
  }

  try {
    if (!isKvConfigured()) {
      return NextResponse.json(
        { error: "服务端存储未配置" },
        { status: 503 }
      );
    }

    const data = await getInvite(code);
    if (!data) {
      return NextResponse.json(
        { error: "邀请已过期或不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      name: data.name,
      mbtiType: data.mbtiType,
      mbtiTitle: data.mbtiTitle,
      full: data,
    });
  } catch (error) {
    console.error("Get invite error:", error);
    return NextResponse.json(
      { error: "获取邀请信息失败" },
      { status: 500 }
    );
  }
}
