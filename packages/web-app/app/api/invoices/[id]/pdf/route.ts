import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { InvoicePdfDocument } from "@/lib/pdf-templates/invoice-pdf";
import { sanitizeFilename } from "@/lib/pdf-templates/shared";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();

    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoice = await db.invoice.findFirst({
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
            logo: true,
          },
        },
        customer: {
          select: {
            name: true,
            address: true,
            city: true,
            gst: true,
            email: true,
            phone: true,
          },
        },
        items: {
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const pdfBuffer = await renderToBuffer(
      InvoicePdfDocument({
        data: {
          organization: invoice.organization,
          customer: invoice.customer,
          invoice: {
            invoiceNumber: invoice.invoiceNumber,
            issuedDate: invoice.issuedDate,
            dueDate: invoice.dueDate,
            amount: invoice.amount,
            paidAmount: invoice.paidAmount,
            notes: invoice.notes,
            items: invoice.items,
          },
        },
      }),
    );

    const filename = sanitizeFilename(`invoice-${invoice.invoiceNumber}.pdf`);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    console.error("Failed to generate invoice PDF", error);
    return NextResponse.json(
      { error: "Failed to generate invoice PDF" },
      { status: 500 },
    );
  }
}
