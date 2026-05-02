import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { parseImportFile, CUSTOMER_HEADER_ALIASES } from "@/lib/import/parse";
import { validateImportRows, importCustomerRowSchema } from "@/lib/import/validate";
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

    // Validate rows
    const parsedRows = validateImportRows(rawRows, importCustomerRowSchema, CUSTOMER_HEADER_ALIASES);

    // Check for duplicate phones within the file
    const phoneSeen = new Map<string, number>();
    for (const row of parsedRows) {
      if (!row.data) continue;
      const phone = String(row.data.phone || "");
      if (!phone) continue;
      const prev = phoneSeen.get(phone);
      if (prev !== undefined) {
        row.errors.push({ row: row.rowNumber, field: "phone", message: `Duplicate phone in file (same as row ${prev})` });
      } else {
        phoneSeen.set(phone, row.rowNumber);
      }
    }

    // Check for phones that already exist in the org
    const validPhones = parsedRows
      .filter((r) => r.errors.length === 0 && r.data?.phone)
      .map((r) => String(r.data!.phone));

    if (validPhones.length > 0) {
      const existing = await db.customer.findMany({
        where: { organizationId: user.organizationId, phone: { in: validPhones } },
        select: { phone: true },
      });
      const existingSet = new Set(existing.map((c) => c.phone));

      for (const row of parsedRows) {
        if (row.errors.length > 0 || !row.data?.phone) continue;
        if (existingSet.has(String(row.data.phone))) {
          row.errors.push({ row: row.rowNumber, field: "phone", message: "Customer with this phone already exists" });
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
        kind: "CUSTOMERS",
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
    console.error("Customer import preview failed", error);
    return NextResponse.json({ error: "Import preview failed" }, { status: 500 });
  }
}
