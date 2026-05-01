import * as React from "react";
import { EmailLayout, Paragraph } from "./_shared";

export function EmailVerificationEmail({
  recipientName,
  verificationUrl,
}: {
  recipientName: string;
  verificationUrl: string;
}) {
  return (
    <EmailLayout
      preview="Verify your email address"
      heading="Verify your email"
      preheader="Confirm your email address to complete your account setup."
      ctaLabel="Verify Email"
      ctaHref={verificationUrl}
      footerNote="If you did not create an account, you can safely ignore this email."
    >
      <Paragraph>Hi {recipientName},</Paragraph>
      <Paragraph>
        Please verify your email address by clicking the button below. This link
        will expire in 1 hour.
      </Paragraph>
    </EmailLayout>
  );
}
