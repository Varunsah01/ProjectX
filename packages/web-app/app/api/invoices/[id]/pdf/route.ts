import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { InvoicePdfDocument } from "@/lib/pdf-templates/invoice-pdf";
import { sanitizeFilename } from "@/lib/pdf-templates/shared";
import { getPresignedGetUrl, isStorageConfigured } from "@/lib/storage/s3";

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
            gstin: true,
            pan: true,
            legalName: true,
            email: true,
            phone: true,
            logo: true,
            signatureUrl: true,
            bankName: true,
            bankAccountNumber: true,
            bankIfsc: true,
            bankBranch: true,
            upiId: true,
            invoiceTerms: true,
          },
        },
        customer: {
          select: {
            name: true,
            address: true,
            city: true,
            gstin: true,
            billingState: true,
            shippingState: true,
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

    // Resolve presigned GET URLs for images
    let logoUrl: string | null = null;
    let signatureUrl: string | null = null;

    if (isStorageConfigured()) {
      if (invoice.organization.logo) {
        logoUrl = await getPresignedGetUrl(invoice.organization.logo).catch(
          () => null,
        );
      }
      if (invoice.organization.signatureUrl) {
        signatureUrl = await getPresignedGetUrl(
          invoice.organization.signatureUrl,
        ).catch(() => null);
      }
    }

    const pdfBuffer = await renderToBuffer(
      InvoicePdfDocument({
        data: {
          organization: {
            ...invoice.organization,
            logoUrl,
            signatureUrl,
          },
          customer: invoice.customer,
          invoice: {
            invoiceNumber: invoice.invoiceNumber,
            issuedDate: invoice.issuedDate,
            dueDate: invoice.dueDate,
            amount: invoice.amount,
            paidAmount: invoice.paidAmount,
            placeOfSupply: invoice.placeOfSupply,
            isInterState: invoice.isInterState,
            subtotalAmount: invoice.subtotalAmount,
            cgstAmount: invoice.cgstAmount,
            sgstAmount: invoice.sgstAmount,
            igstAmount: invoice.igstAmount,
            totalTaxAmount: invoice.totalTaxAmount,
            notes: invoice.notes,
            items: invoice.items.map((item) => ({
              ...item,
              gstRatePercent:
                item.gstRatePercent != null
                  ? Number(item.gstRatePercent)
                  : null,
            })),
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
