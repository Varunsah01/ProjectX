import * as React from "react";
import { DetailList, EmailLayout, Paragraph, formatInr } from "./_shared";

export function InvoiceCreatedEmail({
  customerName,
  organizationName,
  invoiceNumber,
  amount,
  dueDate,
  invoiceUrl,
}: {
  customerName: string;
  organizationName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  invoiceUrl: string;
}) {
  return (
    <EmailLayout
      preview={`Invoice ${invoiceNumber} has been issued`}
      heading={`Invoice ${invoiceNumber} is ready`}
      preheader={`A new invoice from ${organizationName} has been generated for ${formatInr(amount)}.`}
      organizationName={organizationName}
      ctaLabel="View Invoice"
      ctaHref={invoiceUrl}
    >
      <Paragraph>Hi {customerName},</Paragraph>
      <Paragraph>
        A new invoice has been created for your account. Please review the details
        below and arrange payment by the due date.
      </Paragraph>
      <DetailList
        items={[
          { label: "Invoice Number", value: invoiceNumber },
          { label: "Amount", value: formatInr(amount) },
          { label: "Due Date", value: dueDate },
        ]}
      />
    </EmailLayout>
  );
}
