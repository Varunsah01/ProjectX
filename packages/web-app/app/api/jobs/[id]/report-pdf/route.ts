import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { ServiceReportPdfDocument } from "@/lib/pdf-templates/service-report-pdf";
import { sanitizeFilename } from "@/lib/pdf-templates/shared";

export const runtime = "nodejs";

function extractPartsReplaced(...values: Array<string | null | undefined>) {
  const text = values.filter(Boolean).join("\n");
  const match = text.match(/parts?(?:\s+replaced)?\s*:\s*(.+)/i);

  if (!match?.[1]) {
    return [];
  }

  return match[1]
    .split(/,|;|\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();

    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job = await db.job.findFirst({
      where: {
        id: params.id,
        organizationId: user.organizationId,
      },
      include: {
        organization: {
          select: {
            name: true,
            address: true,
            city: true,
            gst: true,
            email: true,
            phone: true,
          },
        },
        customer: {
          select: {
            name: true,
            address: true,
            city: true,
            email: true,
            phone: true,
          },
        },
        asset: {
          select: {
            name: true,
            model: true,
            serialNumber: true,
            category: true,
            location: true,
          },
        },
        technician: {
          select: {
            name: true,
            email: true,
            phone: true,
            territory: true,
            specialization: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Service report PDF is available only for completed jobs" },
        { status: 400 },
      );
    }

    const pdfBuffer = await renderToBuffer(
      ServiceReportPdfDocument({
        data: {
          organization: job.organization,
          customer: job.customer,
          asset: job.asset,
          technician: job.technician,
          job: {
            jobNumber: job.jobNumber,
            type: job.type.replaceAll("_", " "),
            scheduledDate: job.scheduledDate,
            completedAt: job.completedAt,
            serviceReport: job.serviceReport,
            notes: job.notes,
          },
          partsReplaced: extractPartsReplaced(job.serviceReport, job.notes),
        },
      }),
    );

    const filename = sanitizeFilename(`service-report-${job.jobNumber}.pdf`);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    console.error("Failed to generate service report PDF", error);
    return NextResponse.json(
      { error: "Failed to generate service report PDF" },
      { status: 500 },
    );
  }
}
