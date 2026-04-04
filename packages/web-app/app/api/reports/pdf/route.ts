import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getReportsDataForOrganization } from "@/lib/queries/reports";
import { ReportPdfDocument } from "@/lib/pdf-templates/report-pdf";

export const runtime = "nodejs";

function formatDateLabel(from: string, to: string): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  const fromStr = `${months[fromMonth - 1]} ${fromDay}`;
  const toStr = `${months[toMonth - 1]} ${toDay}, ${toYear}`;
  if (fromYear !== toYear) return `${fromStr}, ${fromYear} – ${toStr}`;
  return `${fromStr} – ${toStr}`;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");

    if (!fromStr || !toStr) {
      return NextResponse.json(
        { error: "from and to query params are required" },
        { status: 400 },
      );
    }

    const from = new Date(fromStr);
    const to = new Date(toStr + "T23:59:59");

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const [reports, org] = await Promise.all([
      getReportsDataForOrganization(user.organizationId, from, to),
      db.organization.findUnique({
        where: { id: user.organizationId },
        select: { name: true },
      }),
    ]);

    const orgName = org?.name ?? "Organization";
    const dateRange = formatDateLabel(fromStr, toStr);

    const pdfBuffer = await renderToBuffer(
      ReportPdfDocument({ data: { reports, orgName, dateRange } }),
    );

    const filename = `report-${fromStr}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    console.error("Failed to generate report PDF", error);
    return NextResponse.json(
      { error: "Failed to generate report PDF" },
      { status: 500 },
    );
  }
}
