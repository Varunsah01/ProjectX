import * as React from "react";
import { DetailList, EmailLayout, Paragraph } from "./_shared";

export function JobScheduledEmail({
  technicianName,
  organizationName,
  jobNumber,
  customerName,
  assetName,
  scheduledDate,
  jobUrl,
}: {
  technicianName: string;
  organizationName: string;
  jobNumber: string;
  customerName: string;
  assetName: string;
  scheduledDate: string;
  jobUrl: string;
}) {
  return (
    <EmailLayout
      preview={`New job assignment ${jobNumber}`}
      heading={`You have been assigned ${jobNumber}`}
      preheader={`A new service job has been scheduled for ${scheduledDate}.`}
      organizationName={organizationName}
      ctaLabel="Open Job"
      ctaHref={jobUrl}
    >
      <Paragraph>Hi {technicianName},</Paragraph>
      <Paragraph>
        A new job has been assigned to you. Review the schedule and customer details
        before you head out.
      </Paragraph>
      <DetailList
        items={[
          { label: "Job Number", value: jobNumber },
          { label: "Customer", value: customerName },
          { label: "Asset", value: assetName },
          { label: "Scheduled Date", value: scheduledDate },
        ]}
      />
    </EmailLayout>
  );
}
