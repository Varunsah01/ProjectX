import * as React from "react";
import { DetailList, EmailLayout, Paragraph } from "./_shared";

export function BreachNotificationEmail({
  customerName,
  organizationName,
  breachDescription,
  detectedAt,
  grievanceOfficerName,
  grievanceOfficerEmail,
}: {
  customerName: string;
  organizationName: string;
  breachDescription: string;
  detectedAt: string;
  grievanceOfficerName?: string;
  grievanceOfficerEmail?: string;
}) {
  return (
    <EmailLayout
      preview={`Data breach notification from ${organizationName}`}
      heading="Data Breach Notification"
      preheader={`We are writing to inform you about a data breach detected on ${detectedAt}.`}
      organizationName={organizationName}
      footerNote="This notice is sent in compliance with the Digital Personal Data Protection Act, 2023."
    >
      <Paragraph>Dear {customerName},</Paragraph>
      <Paragraph>
        We are writing to inform you about a personal data breach that may affect your data
        held by {organizationName}. Under the Digital Personal Data Protection Act, 2023,
        we are required to notify you of this incident.
      </Paragraph>
      <DetailList
        items={[
          { label: "Date Detected", value: detectedAt },
          { label: "Nature of Breach", value: breachDescription },
        ]}
      />
      <Paragraph>
        <strong>What we are doing:</strong> We have taken immediate steps to contain the breach,
        assess the impact, and prevent further unauthorized access. The Data Protection Board of
        India has been notified as required by law.
      </Paragraph>
      <Paragraph>
        <strong>What you can do:</strong> We recommend that you remain vigilant about any
        suspicious activity. If you notice anything unusual, please contact us immediately.
      </Paragraph>
      {grievanceOfficerName ? (
        <Paragraph>
          <strong>Grievance Officer:</strong> {grievanceOfficerName}
          {grievanceOfficerEmail ? ` (${grievanceOfficerEmail})` : ""}
        </Paragraph>
      ) : null}
      <Paragraph>
        You have the right to file a complaint with the Data Protection Board of India if you
        believe your personal data has been mishandled.
      </Paragraph>
    </EmailLayout>
  );
}
