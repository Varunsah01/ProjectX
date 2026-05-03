import { NextResponse } from "next/server";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";
import { fetchExportDataSet } from "@/lib/integrations/shared";
import { generateTallyXml } from "@/lib/integrations/tally/xml";

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
    const xml = generateTallyXml(data);

    await db.auditLog.create({
      data: buildAuditLog({
        actor: user,
        action: "EXPORT",
        entity: "TallyExport",
        entityId: user.organizationId,
        after: { from, to, invoiceCount: data.invoices.length },
      }),
    });

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="tally-export-${from}-${to}.xml"`,
      },
    });
  } catch (error) {
    console.error("Tally export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 },
    );
  }
}
