import * as React from "react";
import { DetailList, EmailLayout, Paragraph } from "./_shared";

export function TicketCreatedEmail({
  customerName,
  organizationName,
  ticketNumber,
  subject,
  priority,
  ticketUrl,
}: {
  customerName: string;
  organizationName: string;
  ticketNumber: string;
  subject: string;
  priority: string;
  ticketUrl: string;
}) {
  return (
    <EmailLayout
      preview={`Complaint ${ticketNumber} has been logged`}
      heading={`We have logged your complaint`}
      preheader={`Your complaint ${ticketNumber} has been created and is now being tracked.`}
      organizationName={organizationName}
      ctaLabel="Track Complaint"
      ctaHref={ticketUrl}
    >
      <Paragraph>Hi {customerName},</Paragraph>
      <Paragraph>
        We have received your complaint and our team will take it forward. You can use
        the ticket number below for any follow-up.
      </Paragraph>
      <DetailList
        items={[
          { label: "Ticket Number", value: ticketNumber },
          { label: "Subject", value: subject },
          { label: "Priority", value: priority },
        ]}
      />
    </EmailLayout>
  );
}
