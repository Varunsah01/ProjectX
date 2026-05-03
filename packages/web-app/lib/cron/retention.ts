import { db } from "@/lib/db";

export interface RetentionResult {
  softDeleted: {
    jobs: number;
    tickets: number;
    invoices: number;
    contracts: number;
    assets: number;
    customers: number;
  };
  transient: {
    importJobs: number;
    otpChallenges: number;
    emailTokens: number;
    passwordTokens: number;
    webhookEvents: number;
    messageLogs: number;
  };
}

export async function runRetention(): Promise<RetentionResult> {
  const now = new Date();
  const ago = (days: number) => new Date(now.getTime() - days * 86_400_000);

  // Hard-delete soft-deleted business entities — child-first to respect FK dependencies.
  // (The soft-delete extension only filters read operations, so deleteMany sees all rows.)
  const jobs = await db.job.deleteMany({
    where: { deletedAt: { not: null, lt: ago(90) } },
  });
  const tickets = await db.ticket.deleteMany({
    where: { deletedAt: { not: null, lt: ago(90) } },
  });
  const invoices = await db.invoice.deleteMany({
    where: { deletedAt: { not: null, lt: ago(90) } },
  });
  const contracts = await db.contract.deleteMany({
    where: { deletedAt: { not: null, lt: ago(90) } },
  });
  const assets = await db.asset.deleteMany({
    where: { deletedAt: { not: null, lt: ago(90) } },
  });
  const customers = await db.customer.deleteMany({
    where: { deletedAt: { not: null, lt: ago(90) } },
  });

  // Transient table cleanup.
  const importJobs = await db.importJob.deleteMany({
    where: { createdAt: { lt: ago(30) } },
  });
  const otpChallenges = await db.otpChallenge.deleteMany({
    where: { createdAt: { lt: ago(1) } },
  });
  const emailTokens = await db.emailVerificationToken.deleteMany({
    where: { createdAt: { lt: ago(7) } },
  });
  const passwordTokens = await db.passwordResetToken.deleteMany({
    where: { createdAt: { lt: ago(7) } },
  });
  const webhookEvents = await db.webhookEvent.deleteMany({
    where: { status: "PROCESSED", receivedAt: { lt: ago(90) } },
  });
  const messageLogs = await db.messageLog.deleteMany({
    where: { sentAt: { lt: ago(365) } },
  });

  return {
    softDeleted: {
      jobs: jobs.count,
      tickets: tickets.count,
      invoices: invoices.count,
      contracts: contracts.count,
      assets: assets.count,
      customers: customers.count,
    },
    transient: {
      importJobs: importJobs.count,
      otpChallenges: otpChallenges.count,
      emailTokens: emailTokens.count,
      passwordTokens: passwordTokens.count,
      webhookEvents: webhookEvents.count,
      messageLogs: messageLogs.count,
    },
  };
}
