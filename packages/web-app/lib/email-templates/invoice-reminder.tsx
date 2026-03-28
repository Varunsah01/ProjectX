import * as React from "react";
import { DetailList, EmailLayout, Paragraph, formatInr } from "./_shared";

export function InvoiceReminderEmail({
  customerName,
  organizationName,
  invoiceNumber,
  amountDue,
  dueDate,
  invoiceUrl,
}: {
  customerName: string;
  organizationName: string;
  invoiceNumber: string;
  amountDue: number;
  dueDate: string;
  invoiceUrl: string;
}) {
  return (
    <EmailLayout
      preview={`Reminder: ${invoiceNumber} is due soon`}
      heading={`Friendly reminder for ${invoiceNumber}`}
      preheader={`Your upcoming payment of ${formatInr(amountDue)} is due on ${dueDate}.`}
      organizationName={organizationName}
      ctaLabel="Pay Invoice"
      ctaHref={invoiceUrl}
    >
      <Paragraph>Hi {customerName},</Paragraph>
      <Paragraph>
        This is a reminder that your invoice is coming due shortly. Paying before the
        due date avoids follow-up notices and keeps your account current.
      </Paragraph>
      <DetailList
        items={[
          { label: "Invoice Number", value: invoiceNumber },
          { label: "Amount Due", value: formatInr(amountDue) },
          { label: "Due Date", value: dueDate },
        ]}
      />
    </EmailLayout>
  );
}
