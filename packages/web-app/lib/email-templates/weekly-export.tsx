import * as React from "react";
import { DetailList, EmailLayout, Paragraph, formatInr } from "./_shared";

export function WeeklyExportEmail({
  organizationName,
  exportFormat,
  periodFrom,
  periodTo,
  downloadUrl,
  invoiceCount,
  totalAmount,
}: {
  organizationName: string;
  exportFormat: "tally" | "zoho";
  periodFrom: string;
  periodTo: string;
  downloadUrl: string;
  invoiceCount: number;
  totalAmount: number;
}) {
  const formatLabel = exportFormat === "tally" ? "Tally Prime XML" : "Zoho Books CSV (ZIP)";

  return (
    <EmailLayout
      preview={`Weekly accounting export for ${periodFrom} – ${periodTo}`}
      heading="Weekly Accounting Export"
      preheader={`${invoiceCount} invoices totalling ${formatInr(totalAmount)} are ready to download.`}
      organizationName={organizationName}
      ctaLabel="Download Export"
      ctaHref={downloadUrl}
      footerNote="This download link expires in 7 days."
    >
      <Paragraph>Hi,</Paragraph>
      <Paragraph>
        Your weekly accounting export for {organizationName} is ready. Import this file
        into your accounting software to keep your books up to date.
      </Paragraph>
      <DetailList
        items={[
          { label: "Period", value: `${periodFrom} – ${periodTo}` },
          { label: "Format", value: formatLabel },
          { label: "Invoices", value: String(invoiceCount) },
          { label: "Total Amount", value: formatInr(totalAmount) },
        ]}
      />
    </EmailLayout>
  );
}
