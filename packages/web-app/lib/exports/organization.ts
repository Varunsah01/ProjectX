import JSZip from "jszip";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { putObject, getPresignedGetUrl } from "@/lib/storage/s3";

// Presigned URL valid for 7 days.
const EXPORT_EXPIRY_SEC = 7 * 24 * 3600;

function toJsonl(rows: unknown[]): Buffer {
  return Buffer.from(rows.map((r) => JSON.stringify(r)).join("\n"), "utf8");
}

/**
 * Exports all org-scoped data as a ZIP of JSONL files, uploads to S3,
 * and returns a 7-day presigned GET URL.
 *
 * Excluded from export: token hashes, password hashes, OTP codes, raw card data.
 * Payment gateway reference IDs are included for reconciliation.
 */
export async function exportOrganizationData(organizationId: string): Promise<string> {
  const [
    org,
    customers,
    assets,
    contracts,
    plans,
    invoices,
    tickets,
    jobs,
    auditLogs,
  ] = await Promise.all([
    db.organization.findUnique({ where: { id: organizationId } }),
    // Pass deletedAt in where to bypass soft-delete extension and include all records.
    db.customer.findMany({ where: { organizationId, deletedAt: undefined } }),
    db.asset.findMany({ where: { organizationId, deletedAt: undefined } }),
    db.contract.findMany({ where: { organizationId, deletedAt: undefined } }),
    db.plan.findMany({ where: { organizationId } }),
    db.invoice.findMany({
      where: { organizationId, deletedAt: undefined },
      include: { items: true },
    }),
    db.ticket.findMany({ where: { organizationId, deletedAt: undefined } }),
    db.job.findMany({ where: { organizationId, deletedAt: undefined } }),
    db.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const zip = new JSZip();
  zip.file("organization.jsonl", toJsonl(org ? [org] : []));
  zip.file("customers.jsonl", toJsonl(customers));
  zip.file("assets.jsonl", toJsonl(assets));
  zip.file("contracts.jsonl", toJsonl(contracts));
  zip.file("plans.jsonl", toJsonl(plans));
  zip.file("invoices.jsonl", toJsonl(invoices));
  zip.file("tickets.jsonl", toJsonl(tickets));
  zip.file("jobs.jsonl", toJsonl(jobs));
  zip.file("audit_logs.jsonl", toJsonl(auditLogs));

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  const key = `org/${organizationId}/exports/${randomUUID()}.zip`;
  await putObject(key, buffer, "application/zip");
  return getPresignedGetUrl(key, EXPORT_EXPIRY_SEC);
}
