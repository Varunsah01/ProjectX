import * as React from "react";
import { DetailList, EmailLayout, Paragraph } from "./_shared";

export function WelcomeEmail({
  recipientName,
  organizationName,
  recipientType,
  dashboardUrl,
}: {
  recipientName: string;
  organizationName: string;
  recipientType: "user" | "customer";
  dashboardUrl: string;
}) {
  return (
    <EmailLayout
      preview={`Welcome to ${organizationName}`}
      heading={`Welcome to ${organizationName}`}
      preheader={`Your ${recipientType} profile is now ready.`}
      organizationName={organizationName}
      ctaLabel={recipientType === "user" ? "Open Dashboard" : "View Account"}
      ctaHref={dashboardUrl}
    >
      <Paragraph>Hi {recipientName},</Paragraph>
      <Paragraph>
        Welcome aboard. Your profile has been created and you can now access updates,
        service activity, and billing communication from our team.
      </Paragraph>
      <DetailList
        items={[
          { label: "Organization", value: organizationName },
          { label: "Profile Type", value: recipientType === "user" ? "Team Member" : "Customer" },
        ]}
      />
    </EmailLayout>
  );
}
