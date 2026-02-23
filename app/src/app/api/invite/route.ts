import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { saveInvite, isKvConfigured } from "@/lib/kv";
import type { InviteData } from "@/lib/kv";

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEV_MOCK === "true") {
    return NextResponse.json({ code: "mock01" });
  }

  try {
    if (!isKvConfigured()) {
      return NextResponse.json(
        { error: "服务端存储未配置" },
        { status: 503 }
      );
    }

    const body = (await req.json()) as InviteData;

    if (!body.mbtiType || !body.name) {
      return NextResponse.json(
        { error: "缺少必要数据" },
        { status: 400 }
      );
    }

    const code = nanoid(6);
    await saveInvite(code, body);

    return NextResponse.json({ code });
  } catch (error) {
    console.error("Create invite error:", error);
    return NextResponse.json(
      { error: "创建邀请失败" },
      { status: 500 }
    );
  }
}
