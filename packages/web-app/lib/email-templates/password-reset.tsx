import * as React from "react";
import { EmailLayout, Paragraph } from "./_shared";

export function PasswordResetEmail({
  recipientName,
  resetUrl,
}: {
  recipientName: string;
  resetUrl: string;
}) {
  return (
    <EmailLayout
      preview="Reset your password"
      heading="Reset your password"
      preheader="You requested a password reset. Click the button below to choose a new password."
      ctaLabel="Reset Password"
      ctaHref={resetUrl}
      footerNote="If you did not request this, you can safely ignore this email. The link expires in 1 hour."
    >
      <Paragraph>Hi {recipientName},</Paragraph>
      <Paragraph>
        We received a request to reset your password. Click the button below to
        set a new one. This link will expire in 1 hour.
      </Paragraph>
    </EmailLayout>
  );
}
