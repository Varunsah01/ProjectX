import * as React from "react";
import { DetailList, EmailLayout, Paragraph } from "./_shared";

export function OrgInvitationEmail({
  recipientEmail,
  organizationName,
  role,
  invitedByName,
  acceptUrl,
}: {
  recipientEmail: string;
  organizationName: string;
  role: string;
  invitedByName: string;
  acceptUrl: string;
}) {
  return (
    <EmailLayout
      preview={`You've been invited to join ${organizationName}`}
      heading={`You're invited to ${organizationName}`}
      preheader={`${invitedByName} has invited you to join their organization.`}
      organizationName={organizationName}
      ctaLabel="Accept Invitation"
      ctaHref={acceptUrl}
    >
      <Paragraph>Hi,</Paragraph>
      <Paragraph>
        {invitedByName} has invited you to join <strong>{organizationName}</strong> as
        a team member. Click the button below to accept the invitation.
      </Paragraph>
      <DetailList
        items={[
          { label: "Organization", value: organizationName },
          { label: "Role", value: role },
          { label: "Email", value: recipientEmail },
        ]}
      />
      <Paragraph>
        This invitation link expires in 7 days. If you did not expect this
        invitation, you can safely ignore this email.
      </Paragraph>
    </EmailLayout>
  );
}
