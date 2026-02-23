import { NextRequest, NextResponse } from "next/server";

/**
 * Legacy premium route - no longer used.
 * All free content is now generated in /api/analyze.
 * Deep content is generated via /api/share-unlock.
 */
export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error:
        "此接口已废弃。免费内容现在在分析时一起生成，深度内容请使用分享解锁。",
    },
    { status: 410 }
  );
}
