"use server";

import { revalidatePath } from "next/cache";
import { requireRole, UserRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { buildAuditLog } from "@/lib/audit/log";
import { cleanOptional, parseDateInput } from "@/lib/actions/helpers";
import { actionFailure, actionSuccess, getActionError } from "@/lib/query-utils";
import type { Prisma } from "@prisma/client";
import type { ParsedImportRow, ImportStats } from "@/lib/import/types";

export async function commitImportAction(importJobId: string) {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);

    const job = await db.importJob.findFirst({
      where: {
        id: importJobId,
        organizationId: user.organizationId,
        status: "PREVIEW",
      },
    });

    if (!job) {
      return actionFailure("Import job not found or already committed");
    }

    if (job.expiresAt < new Date()) {
      await db.importJob.update({
        where: { id: job.id },
        data: { status: "EXPIRED" },
      });
      return actionFailure("Import preview has expired. Please upload the file again.");
    }

    const rows = job.parsedRows as unknown as ParsedImportRow[];
    const validRows = rows.filter((r) => r.errors.length === 0 && r.data);

    if (validRows.length === 0) {
      return actionFailure("No valid rows to import");
    }

    try {
      if (job.kind === "CUSTOMERS") {
        await commitCustomers(job.id, user, validRows);
        revalidatePath("/customers");
      } else {
        await commitAssets(job.id, user, validRows);
        revalidatePath("/assets");
      }

      revalidatePath("/import");
      return actionSuccess({ importJobId: job.id, importedCount: validRows.length });
    } catch (error) {
      await db.importJob.update({
        where: { id: job.id },
        data: { status: "FAILED" },
      });
      throw error;
    }
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to commit import"));
  }
}

async function commitCustomers(
  jobId: string,
  user: { id: string; organizationId: string },
  validRows: ParsedImportRow[],
) {
  await db.$transaction(
    async (tx) => {
      // Create all customers
      await tx.customer.createMany({
        data: validRows.map((r) => ({
          organizationId: user.organizationId,
          name: String(r.data!.name),
          phone: String(r.data!.phone),
          email: String(r.data!.email || ""),
          address: String(r.data!.address || ""),
          city: String(r.data!.city || ""),
          gstin: r.data!.gstin ? String(r.data!.gstin) : null,
          category: String(r.data!.category || "Residential"),
          status: "ACTIVE" as never,
        })),
      });

      // Query the created customers by phone to get their IDs for audit logs
      const phones = validRows.map((r) => String(r.data!.phone));
      const created = await tx.customer.findMany({
        where: { organizationId: user.organizationId, phone: { in: phones } },
        select: { id: true, name: true, phone: true, category: true },
      });
      const phoneToCustomer = new Map(created.map((c) => [c.phone, c]));

      // Per-row audit logs
      await tx.auditLog.createMany({
        data: validRows.map((r) => {
          const customer = phoneToCustomer.get(String(r.data!.phone));
          return buildAuditLog({
            actor: user,
            action: "CREATE",
            entity: "Customer",
            entityId: customer?.id ?? "unknown",
            after: {
              name: String(r.data!.name),
              phone: String(r.data!.phone),
              category: String(r.data!.category || "Residential"),
              importJobId: jobId,
            },
          });
        }),
      });

      // Update import job status
      await tx.importJob.update({
        where: { id: jobId },
        data: {
          status: "COMMITTED",
          committedAt: new Date(),
          stats: {
            totalRows: validRows.length,
            validRows: validRows.length,
            invalidRows: 0,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    },
    { timeout: 60_000 },
  );
}

async function commitAssets(
  jobId: string,
  user: { id: string; organizationId: string },
  validRows: ParsedImportRow[],
) {
  await db.$transaction(
    async (tx) => {
      const createdAssets: Array<{ id: string; name: string; serialNumber: string; category: string }> = [];

      for (let i = 0; i < validRows.length; i++) {
        const r = validRows[i];
        const data = r.data!;
        const installationDate = parseDateInput(String(data.installationDate));
        const warrantyEnd = parseDateInput(String(data.warrantyEnd));
        const serialNumber = String(data.serialNumber || "") || `AST-${Date.now()}-${i}`;
        const model = String(data.model || "") || "General";
        const statusMap: Record<string, string> = {
          active: "ACTIVE",
          inactive: "INACTIVE",
          under_repair: "UNDER_REPAIR",
        };
        const status = statusMap[String(data.status || "active")] || "ACTIVE";

        const asset = await tx.asset.create({
          data: {
            organizationId: user.organizationId,
            customerId: String(data.customerId),
            name: String(data.name),
            model,
            serialNumber,
            category: String(data.category),
            installationDate,
            warrantyEnd,
            status: status as never,
            location: cleanOptional(data.location as string | undefined),
            notes: cleanOptional(data.notes as string | undefined),
            amcStatus: "No Coverage",
            lastServiceDate: installationDate,
            nextServiceDate: installationDate,
          },
        });

        createdAssets.push({
          id: asset.id,
          name: asset.name,
          serialNumber: asset.serialNumber,
          category: asset.category,
        });
      }

      // Per-row audit logs
      await tx.auditLog.createMany({
        data: createdAssets.map((asset) =>
          buildAuditLog({
            actor: user,
            action: "CREATE",
            entity: "Asset",
            entityId: asset.id,
            after: {
              name: asset.name,
              serialNumber: asset.serialNumber,
              category: asset.category,
              importJobId: jobId,
            },
          }),
        ),
      });

      // Update import job status
      await tx.importJob.update({
        where: { id: jobId },
        data: {
          status: "COMMITTED",
          committedAt: new Date(),
          stats: {
            totalRows: validRows.length,
            validRows: validRows.length,
            invalidRows: 0,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    },
    { timeout: 60_000 },
  );
}

export async function listImportJobsAction() {
  try {
    const user = await requireRole([UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const jobs = await db.importJob.findMany({
      where: {
        organizationId: user.organizationId,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        kind: true,
        status: true,
        stats: true,
        originalFileName: true,
        createdAt: true,
        createdBy: {
          select: { name: true },
        },
      },
    });

    return actionSuccess(
      jobs.map((j) => ({
        id: j.id,
        kind: j.kind,
        status: j.status,
        stats: j.stats as unknown as ImportStats,
        originalFileName: j.originalFileName,
        createdAt: j.createdAt.toISOString(),
        createdByName: j.createdBy.name,
      })),
    );
  } catch (error) {
    return actionFailure(getActionError(error, "Failed to load import history"));
  }
}
