import { NextResponse } from "next/server";
import { clearMobileSession, getMobileSessionToken } from "@/lib/mobile/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await clearMobileSession(getMobileSessionToken(request));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Mobile logout failed", error);
    return NextResponse.json(
      { error: "Unable to sign out right now." },
      { status: 500 },
    );
  }
}
