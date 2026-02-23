import { NextRequest, NextResponse } from "next/server";
import { getCompare, isKvConfigured } from "@/lib/kv";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (process.env.NEXT_PUBLIC_DEV_MOCK === "true") {
    return NextResponse.json({ error: "Mock 模式不支持远程加载" }, { status: 404 });
  }

  if (!isKvConfigured()) {
    return NextResponse.json(
      { error: "服务端存储未配置" },
      { status: 503 }
    );
  }

  try {
    const data = await getCompare(id);
    if (!data) {
      return NextResponse.json(
        { error: "对比报告不存在或已过期" },
        { status: 404 }
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Get compare error:", error);
    return NextResponse.json(
      { error: "获取对比报告失败" },
      { status: 500 }
    );
  }
}
