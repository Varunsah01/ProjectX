import * as React from "react";
import { DetailList, EmailLayout, Paragraph } from "./_shared";

export function JobCompletedEmail({
  customerName,
  organizationName,
  jobNumber,
  assetName,
  completedAt,
  summary,
  jobUrl,
}: {
  customerName: string;
  organizationName: string;
  jobNumber: string;
  assetName: string;
  completedAt: string;
  summary?: string;
  jobUrl: string;
}) {
  return (
    <EmailLayout
      preview={`Job ${jobNumber} has been completed`}
      heading={`Service job ${jobNumber} completed`}
      preheader={`The scheduled work for ${assetName} was completed on ${completedAt}.`}
      organizationName={organizationName}
      ctaLabel="Review Job"
      ctaHref={jobUrl}
    >
      <Paragraph>Hi {customerName},</Paragraph>
      <Paragraph>
        The service job has been completed successfully. You can review the summary and
        any notes from the technician using the link below.
      </Paragraph>
      <DetailList
        items={[
          { label: "Job Number", value: jobNumber },
          { label: "Asset", value: assetName },
          { label: "Completed At", value: completedAt },
          { label: "Summary", value: summary || "Service completed" },
        ]}
      />
    </EmailLayout>
  );
}
