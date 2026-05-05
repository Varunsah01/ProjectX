import { NextResponse } from "next/server";
import { z } from "zod";
import { leadCreateSchema } from "@project-x/shared/schemas/leads";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorizeRequest(request: Request) {
  const expected = process.env.LANDING_LEAD_TOKEN?.trim();

  if (!expected) {
    return { ok: false, status: 503, message: "Lead intake is not configured." };
  }

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : "";

  if (!presented || presented !== expected) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  return { ok: true as const };
}

function buildNotifyHtml(lead: {
  name: string;
  email: string;
  phone?: string | null;
  company: string;
  role?: string | null;
  companySize?: string | null;
  industry?: string | null;
  preferredContact?: string | null;
  source: string;
  message?: string | null;
}) {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 12px;color:#64748b;font-size:13px;white-space:nowrap">${label}</td><td style="padding:6px 12px;font-size:13px;color:#0f172a">${value}</td></tr>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
    <div style="background:#0f766e;padding:24px 28px">
      <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:.08em;color:#99f6e4;text-transform:uppercase">New lead</p>
      <h1 style="margin:4px 0 0;font-size:20px;color:#fff">${lead.source}</h1>
    </div>
    <div style="padding:24px 28px">
      <table style="width:100%;border-collapse:collapse">
        ${row("Name", lead.name)}
        ${row("Email", `<a href="mailto:${lead.email}" style="color:#0f766e">${lead.email}</a>`)}
        ${lead.phone ? row("Phone", lead.phone) : ""}
        ${row("Company", lead.company)}
        ${lead.role ? row("Role", lead.role) : ""}
        ${lead.companySize ? row("Company size", lead.companySize) : ""}
        ${lead.industry ? row("Industry", lead.industry) : ""}
        ${lead.preferredContact ? row("Preferred contact", lead.preferredContact) : ""}
        ${lead.message ? row("Message", lead.message.replace(/\n/g, "<br>")) : ""}
      </table>
    </div>
  </div>
</body></html>`;
}

export async function POST(request: Request) {
  const auth = authorizeRequest(request);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let body;
  try {
    body = leadCreateSchema.parse(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid lead payload." },
        { status: 400 },
      );
    }
    throw error;
  }

  let leadId: string;
  try {
    const lead = await db.lead.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone ?? null,
        company: body.company,
        role: body.role ?? null,
        companySize: body.companySize ?? null,
        industry: body.industry ?? null,
        preferredContact: body.preferredContact ?? null,
        message: body.message ?? null,
        source: body.source,
      },
      select: { id: true },
    });
    leadId = lead.id;
    logger.info(
      { event: "leads.create", leadId, source: body.source },
      "lead persisted",
    );
  } catch (error) {
    logger.error({ event: "leads.create.error", err: error }, "lead persist failed");
    return NextResponse.json({ error: "Unable to record lead." }, { status: 500 });
  }

  const notifyEmail =
    process.env.DEMO_NOTIFY_EMAIL?.trim() || process.env.SMTP_USER?.trim() || "";

  if (notifyEmail) {
    try {
      await sendEmail(
        notifyEmail,
        `New ${body.source} lead from ${body.company}`,
        buildNotifyHtml({
          name: body.name,
          email: body.email,
          phone: body.phone ?? null,
          company: body.company,
          role: body.role ?? null,
          companySize: body.companySize ?? null,
          industry: body.industry ?? null,
          preferredContact: body.preferredContact ?? null,
          source: body.source,
          message: body.message ?? null,
        }),
      );
    } catch (error) {
      logger.error(
        { event: "leads.notify.error", leadId, err: error },
        "lead notify email failed (lead is still persisted)",
      );
    }
  }

  return NextResponse.json({ ok: true, id: leadId });
}
