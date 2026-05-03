export interface BackupFailureParams {
  branchId: string | null;
  error: string;
  durationMs: number;
}

/**
 * Fire-and-forget Slack alert when a backup verification fails.
 * Requires OPS_SLACK_WEBHOOK env var.
 */
export function notifyBackupFailure(params: BackupFailureParams): void {
  const webhookUrl = process.env.OPS_SLACK_WEBHOOK;
  if (!webhookUrl) return;

  const payload = {
    text: "⚠️ Backup Verification Failed",
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "⚠️ Backup Verification Failed" },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Branch ID:*\n${params.branchId ?? "N/A (branch not created)"}`,
          },
          {
            type: "mrkdwn",
            text: `*Duration:*\n${params.durationMs}ms`,
          },
        ],
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Error:*\n\`\`\`${params.error}\`\`\`` },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: params.branchId
              ? `Branch kept for forensics. Review in Neon console, then follow \`docs/runbooks/restore.md\`.`
              : `Branch was not created — check NEON_API_KEY / NEON_PROJECT_ID configuration.`,
          },
        ],
      },
    ],
  };

  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

/**
 * Fire-and-forget escalation alert when 3 consecutive backup verifications
 * have all failed. Pages the ops on-call channel.
 */
export function notifyBackupCritical(consecutiveFails: number): void {
  const webhookUrl = process.env.OPS_SLACK_WEBHOOK;
  if (!webhookUrl) return;

  const payload = {
    text: `🚨 CRITICAL: Backup verification has failed ${consecutiveFails}× in a row`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🚨 CRITICAL: Backup Verify Failed ${consecutiveFails}× in a Row`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `The last *${consecutiveFails}* backup verification runs have all failed.\n\n*Immediate action required* — follow \`docs/runbooks/restore.md\` to assess database recoverability.`,
        },
      },
    ],
  };

  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
