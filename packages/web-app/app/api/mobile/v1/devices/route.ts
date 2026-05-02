import { NextResponse } from "next/server";
import { DevicePlatform } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getMobileSession, validateMobileCsrf } from "@/lib/mobile/auth";
import { parseJsonBody } from "@/lib/security/api";

export const dynamic = "force-dynamic";

const registerDeviceSchema = z.object({
  token: z.string().trim().min(1, "Push token is required"),
  platform: z.enum(["android", "ios", "web"]),
});

export async function POST(request: Request) {
  try {
    const session = await getMobileSession(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!validateMobileCsrf(request, session)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    const body = await parseJsonBody(request, registerDeviceSchema);

    await db.deviceToken.upsert({
      where: { token: body.token },
      create: {
        userId: session.user.id,
        token: body.token,
        platform: body.platform.toUpperCase() as DevicePlatform,
        lastSeenAt: new Date(),
      },
      update: {
        userId: session.user.id,
        platform: body.platform.toUpperCase() as DevicePlatform,
        lastSeenAt: new Date(),
        revokedAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request." },
        { status: 400 },
      );
    }

    console.error("Device token registration failed", error);
    return NextResponse.json(
      { error: "Unable to register device." },
      { status: 500 },
    );
  }
}
