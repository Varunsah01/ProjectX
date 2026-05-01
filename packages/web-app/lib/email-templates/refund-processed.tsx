import * as React from "react";
import { DetailList, EmailLayout, Paragraph, formatInr } from "./_shared";

export function RefundProcessedEmail({
  customerName,
  organizationName,
  invoiceNumber,
  refundAmount,
  reason,
  invoiceUrl,
}: {
  customerName: string;
  organizationName: string;
  invoiceNumber: string;
  refundAmount: number;
  reason: string;
  invoiceUrl: string;
}) {
  return (
    <EmailLayout
      preview={`Refund of ${formatInr(refundAmount)} processed`}
      heading="Your refund has been processed"
      preheader={`A refund from ${organizationName} has been issued against invoice ${invoiceNumber}.`}
      organizationName={organizationName}
      ctaLabel="View Invoice"
      ctaHref={invoiceUrl}
    >
      <Paragraph>Hi {customerName},</Paragraph>
      <Paragraph>
        We have processed a refund against your invoice. Funds typically reflect
        in your account within 5-7 business days, depending on your bank.
      </Paragraph>
      <DetailList
        items={[
          { label: "Invoice Number", value: invoiceNumber },
          { label: "Refund Amount", value: formatInr(refundAmount) },
          { label: "Reason", value: reason },
        ]}
      />
    </EmailLayout>
  );
}
