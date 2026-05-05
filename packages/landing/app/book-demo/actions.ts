"use server";

// ─── Disposable email check ───────────────────────────────────────────────────

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "temp-mail.org", "throwam.com",
  "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
  "guerrillamail.info", "guerrillamail.biz", "guerrillamail.de",
  "guerrillamail.net", "guerrillamail.org", "spam4.me", "trashmail.com",
  "trashmail.me", "trashmail.net", "maildrop.cc", "dispostable.com",
  "fakeinbox.com", "tempr.email", "discard.email", "spamgourmet.com",
]);

function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return DISPOSABLE_DOMAINS.has(domain);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionState =
  | { status: "idle" }
  | { status: "success"; firstName: string; email: string; industry: string; companySize: string }
  | { status: "error"; fieldErrors: Partial<Record<string, string>>; formError?: string };

// ─── Action ───────────────────────────────────────────────────────────────────

export async function submitDemoRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fullName = (formData.get("fullName") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const company = (formData.get("company") as string | null)?.trim() ?? "";
  const role = (formData.get("role") as string | null)?.trim() ?? "";
  const companySize = (formData.get("companySize") as string | null)?.trim() ?? "";
  const industry = (formData.get("industry") as string | null)?.trim() ?? "";
  const preferredContact = (formData.get("preferredContact") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";

  // ── Validation ─────────────────────────────────────────────────────────────
  const fieldErrors: Partial<Record<string, string>> = {};

  if (fullName.length < 2) fieldErrors.fullName = "Please enter your full name.";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = "Please enter a valid work email address.";
  } else if (isDisposableEmail(email)) {
    fieldErrors.email = "Please use a work email address.";
  }

  if (!company) fieldErrors.company = "Please enter your business name.";
  if (!industry) fieldErrors.industry = "Please select your industry.";
  if (!preferredContact) fieldErrors.preferredContact = "Please select your preferred contact method.";

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors };
  }

  // ── Persist ────────────────────────────────────────────────────────────────
  const token = process.env.LANDING_LEAD_TOKEN?.trim();
  const baseUrl =
    process.env.WEB_APP_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (token && baseUrl) {
    try {
      await fetch(`${baseUrl.replace(/\/$/, "")}/api/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: fullName,
          email,
          company,
          role: role || undefined,
          companySize: companySize || undefined,
          industry: industry || undefined,
          preferredContact: preferredContact || undefined,
          message: message || undefined,
          source: "book-demo",
        }),
      });
    } catch {
      // Best-effort persistence; success state is returned regardless
    }
  }

  return {
    status: "success",
    firstName: fullName.split(" ")[0] ?? fullName,
    email,
    industry,
    companySize,
  };
}
