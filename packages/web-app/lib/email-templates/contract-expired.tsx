import * as React from "react";
import { DetailList, EmailLayout, Paragraph } from "./_shared";

export function ContractExpiredEmail({
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
      preview={`Contract ${contractNumber} has expired`}
      heading={`Contract ${contractNumber} has expired`}
      preheader={`Coverage for ${assetName} ended on ${expiryDate}.`}
      organizationName={organizationName}
      ctaLabel="Renew Contract"
      ctaHref={contractUrl}
    >
      <Paragraph>Hi {customerName},</Paragraph>
      <Paragraph>
        Your contract has expired. If you want to continue service coverage, please
        renew it at the earliest opportunity.
      </Paragraph>
      <DetailList
        items={[
          { label: "Contract Number", value: contractNumber },
          { label: "Covered Asset", value: assetName },
          { label: "Expired On", value: expiryDate },
        ]}
      />
    </EmailLayout>
  );
}
