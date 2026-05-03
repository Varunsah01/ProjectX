import JSZip from "jszip";
import { NextResponse } from "next/server";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";
import { fetchExportDataSet } from "@/lib/integrations/shared";
import { generateZohoCsvs } from "@/lib/integrations/zoho/csv";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireRole([UserRole.ADMIN]);

    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "Both 'from' and 'to' query params are required (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    const fromDate = new Date(`${from}T00:00:00`);
    const toDate = new Date(`${to}T00:00:00`);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const data = await fetchExportDataSet(user.organizationId, fromDate, toDate);
    const csvBundle = generateZohoCsvs(data);

    const zip = new JSZip();
    for (const [filename, content] of Object.entries(csvBundle)) {
      zip.file(filename, content);
    }
    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "EXPORT",
        entity: "ZohoExport",
        entityId: user.organizationId,
        after: { from, to, invoiceCount: data.invoices.length },
      }),
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="zoho-export-${from}-${to}.zip"`,
      },
    });
  } catch (error) {
    console.error("Zoho export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 },
    );
  }
}
