import type { DataPrincipalType, DsrType } from "@prisma/client";
import JSZip from "jszip";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { putObject, getPresignedGetUrl } from "@/lib/storage/s3";

const EXPORT_EXPIRY_SEC = 7 * 24 * 3600; // 7 days
const RETENTION_YEARS = 8; // IT Act financial record retention

function toJsonl(rows: unknown[]): Buffer {
  return Buffer.from(rows.map((r) => JSON.stringify(r)).join("\n"), "utf8");
}

export async function createDsrRequest(
  organizationId: string,
  dataPrincipalId: string,
  dataPrincipalType: DataPrincipalType,
  type: DsrType,
  details: Record<string, unknown> = {}
) {
  return db.dsrRequest.create({
    data: {
      organizationId,
      dataPrincipalId,
      dataPrincipalType,
      type,
      details,
    },
  });
}

export async function processDsrRequest(
  requestId: string,
  userId: string,
  status: "APPROVED" | "REJECTED" | "COMPLETED",
  responseNotes?: string
) {
  return db.dsrRequest.update({
    where: { id: requestId },
    data: {
      status,
      processedById: userId,
      processedAt: new Date(),
      responseNotes: responseNotes ?? undefined,
    },
  });
}

/**
 * Exports all data tied to a specific data principal as a ZIP file,
 * uploads to S3, and returns a presigned download URL.
 */
export async function exportPrincipalData(
  organizationId: string,
  dataPrincipalId: string,
  dataPrincipalType: DataPrincipalType
): Promise<string> {
  const zip = new JSZip();

  if (dataPrincipalType === "CUSTOMER") {
    const [customer, assets, contracts, invoices, tickets, jobs, notes, consents, messageLogs] =
      await Promise.all([
        db.customer.findFirst({
          where: { id: dataPrincipalId, organizationId, deletedAt: undefined },
        }),
        db.asset.findMany({
          where: { customerId: dataPrincipalId, organizationId, deletedAt: undefined },
        }),
        db.contract.findMany({
          where: { customerId: dataPrincipalId, organizationId, deletedAt: undefined },
        }),
        db.invoice.findMany({
          where: { customerId: dataPrincipalId, organizationId, deletedAt: undefined },
          include: { items: true },
        }),
        db.ticket.findMany({
          where: { customerId: dataPrincipalId, organizationId, deletedAt: undefined },
        }),
        db.job.findMany({
          where: { customerId: dataPrincipalId, organizationId, deletedAt: undefined },
        }),
        db.customerNote.findMany({
          where: { customerId: dataPrincipalId, organizationId },
        }),
        db.consent.findMany({
          where: { dataPrincipalId, dataPrincipalType: "CUSTOMER", organizationId },
        }),
        db.messageLog.findMany({
          where: { customerId: dataPrincipalId, organizationId },
        }),
      ]);

    if (customer) zip.file("customer.jsonl", toJsonl([customer]));
    if (assets.length) zip.file("assets.jsonl", toJsonl(assets));
    if (contracts.length) zip.file("contracts.jsonl", toJsonl(contracts));
    if (invoices.length) zip.file("invoices.jsonl", toJsonl(invoices));
    if (tickets.length) zip.file("tickets.jsonl", toJsonl(tickets));
    if (jobs.length) zip.file("jobs.jsonl", toJsonl(jobs));
    if (notes.length) zip.file("customer_notes.jsonl", toJsonl(notes));
    if (consents.length) zip.file("consents.jsonl", toJsonl(consents));
    if (messageLogs.length) zip.file("message_logs.jsonl", toJsonl(messageLogs));
  } else {
    // USER principal — export user record, audit logs, consents
    const [user, auditLogs, consents] = await Promise.all([
      db.user.findFirst({
        where: { id: dataPrincipalId, organizationId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          territory: true,
          specialization: true,
          skills: true,
          createdAt: true,
        },
      }),
      db.auditLog.findMany({
        where: { userId: dataPrincipalId, organizationId },
        orderBy: { createdAt: "asc" },
      }),
      db.consent.findMany({
        where: { dataPrincipalId, dataPrincipalType: "USER", organizationId },
      }),
    ]);

    if (user) zip.file("user.jsonl", toJsonl([user]));
    if (auditLogs.length) zip.file("audit_logs.jsonl", toJsonl(auditLogs));
    if (consents.length) zip.file("consents.jsonl", toJsonl(consents));
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const key = `org/${organizationId}/dsr-exports/${randomUUID()}.zip`;
  await putObject(key, buffer, "application/zip");

  return getPresignedGetUrl(key, EXPORT_EXPIRY_SEC);
}

export interface RetentionBlockedRecord {
  entity: string;
  id: string;
  reason: string;
  retentionUntil: Date;
}

export interface ErasureEligibility {
  eligible: boolean;
  blockedRecords: RetentionBlockedRecord[];
}

/**
 * Checks whether a data principal's data can be erased.
 * Financial records (invoices) within the 8-year IT Act retention window
 * block erasure with a documented reason.
 */
export async function checkErasureEligibility(
  organizationId: string,
  dataPrincipalId: string,
  dataPrincipalType: DataPrincipalType
): Promise<ErasureEligibility> {
  const blockedRecords: RetentionBlockedRecord[] = [];
  const retentionCutoff = new Date();
  retentionCutoff.setFullYear(retentionCutoff.getFullYear() - RETENTION_YEARS);

  if (dataPrincipalType === "CUSTOMER") {
    // Find invoices within the retention window
    const invoices = await db.invoice.findMany({
      where: {
        customerId: dataPrincipalId,
        organizationId,
        issuedDate: { gte: retentionCutoff },
        deletedAt: undefined,
      },
      select: { id: true, invoiceNumber: true, issuedDate: true },
    });

    for (const inv of invoices) {
      const retentionUntil = new Date(inv.issuedDate);
      retentionUntil.setFullYear(retentionUntil.getFullYear() + RETENTION_YEARS);

      blockedRecords.push({
        entity: "Invoice",
        id: inv.invoiceNumber,
        reason: `Financial record within ${RETENTION_YEARS}-year retention period per IT Act. Issued ${inv.issuedDate.toISOString().split("T")[0]}.`,
        retentionUntil,
      });
    }
  }

  return {
    eligible: blockedRecords.length === 0,
    blockedRecords,
  };
}

/**
 * Performs soft-delete of a customer's data.
 * Only called after checkErasureEligibility returns eligible=true.
 */
export async function executeSoftErasure(
  organizationId: string,
  dataPrincipalId: string,
  dataPrincipalType: DataPrincipalType
) {
  const now = new Date();

  if (dataPrincipalType === "CUSTOMER") {
    await db.$transaction([
      db.job.updateMany({
        where: { customerId: dataPrincipalId, organizationId, deletedAt: null },
        data: { deletedAt: now },
      }),
      db.ticket.updateMany({
        where: { customerId: dataPrincipalId, organizationId, deletedAt: null },
        data: { deletedAt: now },
      }),
      db.invoice.updateMany({
        where: { customerId: dataPrincipalId, organizationId, deletedAt: null },
        data: { deletedAt: now },
      }),
      db.contract.updateMany({
        where: { customerId: dataPrincipalId, organizationId, deletedAt: null },
        data: { deletedAt: now },
      }),
      db.asset.updateMany({
        where: { customerId: dataPrincipalId, organizationId, deletedAt: null },
        data: { deletedAt: now },
      }),
      db.customer.updateMany({
        where: { id: dataPrincipalId, organizationId, deletedAt: null },
        data: { deletedAt: now },
      }),
    ]);
  }
  // USER erasure would require deactivation — handled through existing user management
}
