import { NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getMobileSession(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      user: session.user,
      csrfToken: session.csrfToken,
    });
  } catch (error) {
    console.error("Mobile session lookup failed", error);
    return NextResponse.json(
      { error: "Unable to load session." },
      { status: 500 },
    );
  }
}
