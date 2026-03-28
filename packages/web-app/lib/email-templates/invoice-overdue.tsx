import * as React from "react";
import { DetailList, EmailLayout, Paragraph, formatInr } from "./_shared";

export function InvoiceOverdueEmail({
  customerName,
  organizationName,
  invoiceNumber,
  amountDue,
  dueDate,
  overdueDays,
  invoiceUrl,
}: {
  customerName: string;
  organizationName: string;
  invoiceNumber: string;
  amountDue: number;
  dueDate: string;
  overdueDays: number;
  invoiceUrl: string;
}) {
  return (
    <EmailLayout
      preview={`Overdue notice for ${invoiceNumber}`}
      heading={`${invoiceNumber} is overdue`}
      preheader={`A balance of ${formatInr(amountDue)} is overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}.`}
      organizationName={organizationName}
      ctaLabel="Pay Outstanding Amount"
      ctaHref={invoiceUrl}
      footerNote="Please contact our team if you have already made the payment or need assistance."
    >
      <Paragraph>Hi {customerName},</Paragraph>
      <Paragraph>
        Our records show that this invoice is overdue. Please arrange payment as soon
        as possible to avoid service interruptions or escalations.
      </Paragraph>
      <DetailList
        items={[
          { label: "Invoice Number", value: invoiceNumber },
          { label: "Outstanding Amount", value: formatInr(amountDue) },
          { label: "Original Due Date", value: dueDate },
          { label: "Overdue By", value: `${overdueDays} day${overdueDays === 1 ? "" : "s"}` },
        ]}
      />
    </EmailLayout>
  );
}
