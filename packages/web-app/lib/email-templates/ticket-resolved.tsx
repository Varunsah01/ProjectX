import * as React from "react";
import { DetailList, EmailLayout, Paragraph } from "./_shared";

export function TicketResolvedEmail({
  customerName,
  organizationName,
  ticketNumber,
  subject,
  resolutionNote,
  ticketUrl,
}: {
  customerName: string;
  organizationName: string;
  ticketNumber: string;
  subject: string;
  resolutionNote?: string;
  ticketUrl: string;
}) {
  return (
    <EmailLayout
      preview={`Complaint ${ticketNumber} has been resolved`}
      heading={`Complaint ${ticketNumber} resolved`}
      preheader={`Your complaint regarding "${subject}" has been marked as resolved.`}
      organizationName={organizationName}
      ctaLabel="Review Resolution"
      ctaHref={ticketUrl}
    >
      <Paragraph>Hi {customerName},</Paragraph>
      <Paragraph>
        Your complaint has been resolved. If anything still needs attention, please get
        back to us and we will reopen it.
      </Paragraph>
      <DetailList
        items={[
          { label: "Ticket Number", value: ticketNumber },
          { label: "Subject", value: subject },
          { label: "Resolution Note", value: resolutionNote || "Resolved by service team" },
        ]}
      />
    </EmailLayout>
  );
}
