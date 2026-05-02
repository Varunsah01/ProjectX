import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { parseImportFile, ASSET_HEADER_ALIASES } from "@/lib/import/parse";
import { validateImportRows, importAssetRowSchema } from "@/lib/import/validate";
import { isStorageConfigured, putObject } from "@/lib/storage/s3";
import type { Prisma } from "@prisma/client";
import type { ImportPreviewResult, ImportStats, ParsedImportRow } from "@/lib/import/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 5000;
const PREVIEW_TTL_HOURS = 24;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["ADMIN", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return NextResponse.json({ error: "Only CSV and XLSX files are supported" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 5 MB limit" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawRows = parseImportFile(buffer, file.name);

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "File contains no data rows" }, { status: 400 });
    }
    if (rawRows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `File has ${rawRows.length} rows, maximum is ${MAX_ROWS}` },
        { status: 400 },
      );
    }

    // Validate rows against schema
    const parsedRows = validateImportRows(rawRows, importAssetRowSchema, ASSET_HEADER_ALIASES);

    // Resolve customerPhone → customerId
    const phonesToResolve = new Set<string>();
    for (const row of parsedRows) {
      if (row.data?.customerPhone) {
        phonesToResolve.add(String(row.data.customerPhone));
      }
    }

    const phoneToCustomerId = new Map<string, string>();
    if (phonesToResolve.size > 0) {
      const customers = await db.customer.findMany({
        where: {
          organizationId: user.organizationId,
          phone: { in: Array.from(phonesToResolve) },
        },
        select: { id: true, phone: true },
      });
      for (const c of customers) {
        phoneToCustomerId.set(c.phone, c.id);
      }
    }

    for (const row of parsedRows) {
      if (!row.data?.customerPhone) continue;
      const phone = String(row.data.customerPhone);
      const customerId = phoneToCustomerId.get(phone);
      if (customerId) {
        row.data.customerId = customerId;
      } else if (row.errors.length === 0) {
        // Only add this error if the row didn't already fail validation
        row.errors.push({
          row: row.rowNumber,
          field: "customerPhone",
          message: `Customer not found for phone: ${phone}`,
        });
      }
    }

    // Check for duplicate serial numbers within the file
    const serialSeen = new Map<string, number>();
    for (const row of parsedRows) {
      if (!row.data) continue;
      const serial = String(row.data.serialNumber || "");
      if (!serial) continue;
      const prev = serialSeen.get(serial);
      if (prev !== undefined) {
        row.errors.push({
          row: row.rowNumber,
          field: "serialNumber",
          message: `Duplicate serial number in file (same as row ${prev})`,
        });
      } else {
        serialSeen.set(serial, row.rowNumber);
      }
    }

    // Check for serial numbers that already exist in DB
    const validSerials = parsedRows
      .filter((r) => r.errors.length === 0 && r.data?.serialNumber)
      .map((r) => String(r.data!.serialNumber));

    if (validSerials.length > 0) {
      const existingAssets = await db.asset.findMany({
        where: {
          organizationId: user.organizationId,
          serialNumber: { in: validSerials },
        },
        select: { serialNumber: true },
      });
      const existingSet = new Set(existingAssets.map((a) => a.serialNumber));

      for (const row of parsedRows) {
        if (row.errors.length > 0 || !row.data?.serialNumber) continue;
        if (existingSet.has(String(row.data.serialNumber))) {
          row.errors.push({
            row: row.rowNumber,
            field: "serialNumber",
            message: "Asset with this serial number already exists",
          });
        }
      }
    }

    const stats: ImportStats = {
      totalRows: parsedRows.length,
      validRows: parsedRows.filter((r) => r.errors.length === 0).length,
      invalidRows: parsedRows.filter((r) => r.errors.length > 0).length,
    };

    // Upload original file to S3 (optional)
    let uploadedFileKey: string | null = null;
    if (isStorageConfigured()) {
      const ext = file.name.split(".").pop() || "csv";
      uploadedFileKey = `org/${user.organizationId}/imports/${randomUUID()}.${ext}`;
      await putObject(uploadedFileKey, buffer, file.type || "application/octet-stream");
    }

    // Create ImportJob
    const importJob = await db.importJob.create({
      data: {
        organizationId: user.organizationId,
        kind: "ASSETS",
        status: "PREVIEW",
        uploadedFileKey,
        originalFileName: file.name,
        parsedRows: parsedRows as unknown as Prisma.InputJsonValue,
        stats: stats as unknown as Prisma.InputJsonValue,
        createdById: user.id,
        expiresAt: new Date(Date.now() + PREVIEW_TTL_HOURS * 60 * 60 * 1000),
      },
    });

    const result: ImportPreviewResult = {
      importJobId: importJob.id,
      stats,
      rows: parsedRows,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Asset import preview failed", error);
    return NextResponse.json({ error: "Import preview failed" }, { status: 500 });
  }
}
