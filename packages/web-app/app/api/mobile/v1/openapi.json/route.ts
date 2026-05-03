import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  try {
    const spec = readFileSync(
      join(process.cwd(), "public", "openapi", "mobile-v1.json"),
      "utf-8",
    );
    return new NextResponse(spec, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "OpenAPI spec not found. Run: npm run docs:openapi" }, { status: 404 });
  }
}
