import * as React from "react";
import { DetailList, EmailLayout, Paragraph } from "./_shared";

export function ContractExpiringEmail({
  customerName,
  organizationName,
  contractNumber,
  assetName,
  expiryDate,
  contractUrl,
}: {
  customerName: string;
  organizationName: string;
  contractNumber: string;
  assetName: string;
  expiryDate: string;
  contractUrl: string;
}) {
  return (
    <EmailLayout
      preview={`Contract ${contractNumber} expires in 30 days`}
      heading={`Contract ${contractNumber} is expiring soon`}
      preheader={`Your coverage for ${assetName} is set to expire on ${expiryDate}.`}
      organizationName={organizationName}
      ctaLabel="Review Contract"
      ctaHref={contractUrl}
    >
      <Paragraph>Hi {customerName},</Paragraph>
      <Paragraph>
        This is your 30-day renewal warning. Please review the contract and plan your
        renewal to avoid any break in service coverage.
      </Paragraph>
      <DetailList
        items={[
          { label: "Contract Number", value: contractNumber },
          { label: "Covered Asset", value: assetName },
          { label: "Expiry Date", value: expiryDate },
        ]}
      />
    </EmailLayout>
  );
}
