import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

// ─── Types ────────────────────────────────────────────────────────────────────

type DemoRequestBody = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  industry: string;
  scale: string;
  currentTools?: string;
  message?: string;
};

// ─── Validation ───────────────────────────────────────────────────────────────

function isValidBody(body: unknown): body is DemoRequestBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.fullName === "string" && b.fullName.trim().length >= 2 &&
    typeof b.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim()) &&
    typeof b.phone === "string" && b.phone.replace(/\D/g, "").length >= 10 &&
    typeof b.company === "string" && b.company.trim().length > 0 &&
    typeof b.industry === "string" && b.industry.trim().length > 0 &&
    typeof b.scale === "string" && b.scale.trim().length > 0
  );
}

// ─── Email templates ──────────────────────────────────────────────────────────

function notifyHtml(d: DemoRequestBody) {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 12px;color:#64748b;font-size:13px;white-space:nowrap">${label}</td><td style="padding:6px 12px;font-size:13px;color:#0f172a">${value}</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
    <div style="background:#0f766e;padding:24px 28px">
      <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:.08em;color:#99f6e4;text-transform:uppercase">New lead</p>
      <h1 style="margin:4px 0 0;font-size:20px;color:#fff">Demo Request</h1>
    </div>
    <div style="padding:24px 28px">
      <table style="width:100%;border-collapse:collapse">
        ${row("Name", d.fullName)}
        ${row("Email", `<a href="mailto:${d.email}" style="color:#0f766e">${d.email}</a>`)}
        ${row("Phone", d.phone)}
        ${row("Company", d.company)}
        ${row("Industry", d.industry)}
        ${row("Scale", d.scale)}
        ${d.currentTools ? row("Current tools", d.currentTools) : ""}
        ${d.message ? row("Message", d.message.replace(/\n/g, "<br>")) : ""}
      </table>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #f1f5f9;background:#f8fafc">
      <p style="margin:0;font-size:12px;color:#94a3b8">Submitted via recuring.in/book-demo</p>
    </div>
  </div>
</body>
</html>`;
}

function confirmationHtml(firstName: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:32px 16px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
    <div style="background:#0f766e;padding:24px 28px">
      <h1 style="margin:0;font-size:20px;color:#fff">We received your request</h1>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 16px;font-size:15px;color:#0f172a">Hi ${firstName},</p>
      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6">
        Thanks for reaching out. We have received your demo request and will review your details shortly.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6">
        We will get back to you within <strong>1 business day</strong> to confirm a time that works for you.
      </p>
      <p style="margin:0;font-size:14px;color:#475569">— The Recuring Team</p>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #f1f5f9;background:#f8fafc">
      <p style="margin:0;font-size:12px;color:#94a3b8">
        If you did not submit this request, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

function buildLeadMessage(body: DemoRequestBody) {
  const sections = [
    body.message?.trim(),
    body.industry ? `Industry: ${body.industry}` : null,
    body.scale ? `Scale: ${body.scale}` : null,
    body.currentTools ? `Current tools: ${body.currentTools}` : null,
  ].filter((value): value is string => Boolean(value && value.length > 0));
  return sections.join("\n\n") || undefined;
}

async function persistLeadToWebApp(body: DemoRequestBody) {
  const token = process.env.LANDING_LEAD_TOKEN?.trim();
  const baseUrl =
    process.env.WEB_APP_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!token || !baseUrl) {
    return { ok: false as const, status: 0, reason: "not_configured" as const };
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: body.fullName.trim(),
        email: body.email.trim(),
        phone: body.phone.trim(),
        company: body.company.trim(),
        message: buildLeadMessage(body),
        source: "book-demo",
      }),
    });

    if (!response.ok) {
      return { ok: false as const, status: response.status, reason: "non_ok" as const };
    }

    return { ok: true as const, status: response.status };
  } catch (error) {
    console.error("[demo-request] Lead persistence request failed:", error);
    return { ok: false as const, status: 0, reason: "network" as const };
  }
}

async function sendFallbackEmails(body: DemoRequestBody) {
  const notifyEmail =
    process.env.DEMO_NOTIFY_EMAIL || process.env.SMTP_USER || "";
  const firstName = body.fullName.trim().split(" ")[0];

  const [notifyResult, confirmResult] = await Promise.allSettled([
    notifyEmail
      ? sendEmail(notifyEmail, `New demo request from ${body.company}`, notifyHtml(body))
      : Promise.resolve({ skipped: true }),
    sendEmail(
      body.email,
      "We received your demo request — Recuring",
      confirmationHtml(firstName),
    ),
  ]);

  if (notifyResult.status === "rejected") {
    console.error("[demo-request] Failed to send notify email:", notifyResult.reason);
  }
  if (confirmResult.status === "rejected") {
    console.error("[demo-request] Failed to send confirmation email:", confirmResult.reason);
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  const persistResult = await persistLeadToWebApp(body);

  if (persistResult.ok) {
    // Lead is durably stored. Try the confirmation email best-effort, but
    // don't block — and don't fall back into the legacy double-send path.
    const firstName = body.fullName.trim().split(" ")[0];
    try {
      await sendEmail(
        body.email,
        "We received your demo request — Recuring",
        confirmationHtml(firstName),
      );
    } catch (error) {
      console.error("[demo-request] Confirmation email failed:", error);
    }
    return NextResponse.json({ ok: true });
  }

  // Persistence failed (4xx/5xx, network, or not configured). Never reject
  // the lead — fall back to the original SMTP-only behaviour so we still
  // surface it to the team via email.
  console.warn(
    "[demo-request] Falling back to SMTP-only path:",
    persistResult.reason,
    persistResult.status,
  );
  await sendFallbackEmails(body);

  return NextResponse.json({ ok: true });
}
