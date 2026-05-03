import * as React from "react";
import JSZip from "jszip";
import { db } from "@/lib/db";
import { logger } from "@/lib/log";
import { sendEmail } from "@/lib/email";
import { renderEmailTemplate } from "@/lib/render-email-template";
import { putObject, getPresignedGetUrl } from "@/lib/storage/s3";
import { fetchExportDataSet, paiseToRupees, toZohoDate } from "@/lib/integrations/shared";
import { generateTallyXml } from "@/lib/integrations/tally/xml";
import { generateZohoCsvs } from "@/lib/integrations/zoho/csv";
import { WeeklyExportEmail } from "@/lib/email-templates/weekly-export";

const EXPORT_EXPIRY_SEC = 7 * 24 * 3600; // 7 days

/**
 * Returns the Monday 00:00 and Sunday 23:59 of the previous ISO week.
 */
function getPreviousWeekRange(): { from: Date; to: Date } {
  const now = new Date();
  // Get current day (0=Sun, 1=Mon, ..., 6=Sat)
  const day = now.getDay();
  // Days since last Monday: if today is Mon(1) → 7, Tue(2) → 8, ..., Sun(0) → 7
  const daysSinceLastMonday = day === 0 ? 7 : day;
  // Previous week Monday = today - daysSinceLastMonday - 6
  const prevMonday = new Date(now);
  prevMonday.setDate(now.getDate() - daysSinceLastMonday - 6);
  prevMonday.setHours(0, 0, 0, 0);

  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevMonday.getDate() + 6);
  prevSunday.setHours(23, 59, 59, 999);

  return { from: prevMonday, to: prevSunday };
}

/**
 * Check whether `lastExportSentAt` falls within the current ISO week
 * (Monday-to-Sunday boundary). If so, skip.
 */
function isWithinCurrentWeek(lastSent: Date | null): boolean {
  if (!lastSent) return false;
  const now = new Date();
  const day = now.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  return lastSent >= monday;
}

export interface WeeklyExportResult {
  sentCount: number;
  skippedCount: number;
  orgIds: string[];
}

/**
 * For each organization with `accountantEmail` and `exportFormat` configured,
 * generate the weekly export, upload to S3, and email the download link.
 * Skips orgs already sent this week via `lastExportSentAt`.
 */
export async function sendWeeklyExports(): Promise<WeeklyExportResult> {
  const orgs = await db.organization.findMany({
    where: {
      accountantEmail: { not: null },
      exportFormat: { not: null },
    },
    select: {
      id: true,
      name: true,
      accountantEmail: true,
      exportFormat: true,
      lastExportSentAt: true,
    },
  });

  let sentCount = 0;
  let skippedCount = 0;
  const sentOrgIds: string[] = [];

  const { from, to } = getPreviousWeekRange();
  const fromStr = toZohoDate(from);
  const toStr = toZohoDate(to);

  for (const org of orgs) {
    if (isWithinCurrentWeek(org.lastExportSentAt)) {
      skippedCount++;
      continue;
    }

    try {
      const data = await fetchExportDataSet(org.id, from, to);

      let buffer: Buffer;
      let contentType: string;
      let ext: string;

      if (org.exportFormat === "tally") {
        const xml = generateTallyXml(data);
        buffer = Buffer.from(xml, "utf-8");
        contentType = "application/xml";
        ext = "xml";
      } else {
        const csvBundle = generateZohoCsvs(data);
        const zip = new JSZip();
        for (const [filename, content] of Object.entries(csvBundle)) {
          zip.file(filename, content);
        }
        buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
        contentType = "application/zip";
        ext = "zip";
      }

      const key = `org/${org.id}/exports/weekly/${org.exportFormat}-${fromStr}-${toStr}.${ext}`;
      await putObject(key, buffer, contentType);
      const downloadUrl = await getPresignedGetUrl(key, EXPORT_EXPIRY_SEC);

      // Calculate total amount
      const totalAmount = data.invoices.reduce((sum, inv) => sum + inv.amount, 0);

      const html = await renderEmailTemplate(
        React.createElement(WeeklyExportEmail, {
          organizationName: org.name,
          exportFormat: org.exportFormat as "tally" | "zoho",
          periodFrom: fromStr,
          periodTo: toStr,
          downloadUrl,
          invoiceCount: data.invoices.length,
          totalAmount,
        }),
      );

      await sendEmail(
        org.accountantEmail!,
        `Weekly ${org.exportFormat === "tally" ? "Tally" : "Zoho"} Export – ${fromStr} to ${toStr}`,
        html,
      );

      await db.organization.update({
        where: { id: org.id },
        data: { lastExportSentAt: new Date() },
      });

      sentCount++;
      sentOrgIds.push(org.id);

      logger.info(
        {
          event: "weekly-export.sent",
          orgId: org.id,
          format: org.exportFormat,
          invoiceCount: data.invoices.length,
        },
        `weekly export sent to ${org.accountantEmail}`,
      );
    } catch (error) {
      logger.error(
        { event: "weekly-export.error", orgId: org.id, err: error },
        `failed to send weekly export for org ${org.id}`,
      );
    }
  }

  return { sentCount, skippedCount, orgIds: sentOrgIds };
}
