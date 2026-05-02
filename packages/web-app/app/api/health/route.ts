import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    uptime: process.uptime(),
    version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
    timestamp: new Date().toISOString(),
  });
}
