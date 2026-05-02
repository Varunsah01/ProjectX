import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CUSTOMER_TEMPLATE = [
  "Name,Phone,Email,Address,City,GSTIN,Category",
  "John Doe,9876543210,john@example.com,123 Main St,Mumbai,,Residential",
  "Acme Corp,9123456789,billing@acme.com,456 Park Ave,Delhi,29ABCDE1234F1Z5,Commercial",
].join("\r\n");

const ASSET_TEMPLATE = [
  "Customer Phone,Asset Name,Model,Serial Number,Category,Installation Date,Warranty End,Location,Notes",
  "9876543210,Split AC 1.5T,Daikin FTKF50,SN-001,AC,2024-01-15,2025-01-15,Living Room,",
  "9123456789,Water Purifier,Kent Grand Plus,SN-002,RO,2024-03-01,2025-03-01,Kitchen,Annual maintenance included",
].join("\r\n");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");

  if (kind !== "customers" && kind !== "assets") {
    return NextResponse.json(
      { error: "kind must be 'customers' or 'assets'" },
      { status: 400 },
    );
  }

  const csv = kind === "customers" ? CUSTOMER_TEMPLATE : ASSET_TEMPLATE;
  const filename = kind === "customers" ? "customer_import_template.csv" : "asset_import_template.csv";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
