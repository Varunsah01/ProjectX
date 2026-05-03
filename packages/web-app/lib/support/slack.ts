export interface ImpersonationStartParams {
  supportUserName: string;
  supportUserEmail: string;
  targetUserName: string;
  targetUserEmail: string;
  targetOrgName: string;
  reason: string;
  ip: string;
  sessionId: string;
}

/**
 * Fire-and-forget Slack alert on every impersonation start.
 * Requires SUPPORT_AUDIT_CHANNEL_WEBHOOK env var.
 */
export function notifyImpersonationStart(params: ImpersonationStartParams): void {
  const webhookUrl = process.env.SUPPORT_AUDIT_CHANNEL_WEBHOOK;
  if (!webhookUrl) return;

  const payload = {
    text: `🔍 Impersonation Started`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "🔍 Support Impersonation Started" },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Support User:*\n${params.supportUserName} (${params.supportUserEmail})` },
          { type: "mrkdwn", text: `*Target User:*\n${params.targetUserName} (${params.targetUserEmail})` },
          { type: "mrkdwn", text: `*Target Org:*\n${params.targetOrgName}` },
          { type: "mrkdwn", text: `*IP Address:*\n${params.ip}` },
        ],
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Reason:*\n${params.reason}` },
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `Session ID: \`${params.sessionId}\`` },
        ],
      },
    ],
  };

  // Fire-and-forget — never throw
  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
