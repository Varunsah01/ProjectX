import * as React from "react";
import { DetailList, EmailLayout, Paragraph } from "./_shared";

export function ContractRenewalReminderEmail({
  customerName,
  organizationName,
  contractNumber,
  assetName,
  expiryDate,
  contractUrl,
  daysRemaining,
}: {
  customerName: string;
  organizationName: string;
  contractNumber: string;
  assetName: string;
  expiryDate: string;
  contractUrl: string;
  daysRemaining: number;
}) {
  const urgency =
    daysRemaining <= 1
      ? "tomorrow"
      : `in ${daysRemaining} days`;

  return (
    <EmailLayout
      preview={`Contract ${contractNumber} expires ${urgency}`}
      heading={`Contract ${contractNumber} expiring ${urgency}`}
      preheader={`Your coverage for ${assetName} expires on ${expiryDate}.`}
      organizationName={organizationName}
      ctaLabel="Review Contract"
      ctaHref={contractUrl}
    >
      <Paragraph>Hi {customerName},</Paragraph>
      <Paragraph>
        This is your {daysRemaining}-day renewal reminder. Please review and renew
        your contract to avoid any break in service coverage.
      </Paragraph>
      <DetailList
        items={[
          { label: "Contract Number", value: contractNumber },
          { label: "Covered Asset", value: assetName },
          { label: "Expiry Date", value: expiryDate },
          { label: "Days Remaining", value: String(daysRemaining) },
        ]}
      />
    </EmailLayout>
  );
}
