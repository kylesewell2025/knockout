import { NextRequest, NextResponse } from "next/server";

import { syncRollingWindow } from "@/lib/mma/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const querySecret = request.nextUrl.searchParams.get("secret");

  const isAuthorized =
    !configuredSecret ||
    authHeader === `Bearer ${configuredSecret}` ||
    querySecret === configuredSecret;

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const results = await syncRollingWindow();

    return NextResponse.json({
      ok: true,
      results,
    });
  } catch (error) {
    console.error("UFC sync failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Sync failed",
      },
      { status: 500 }
    );
  }
}