import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { generateRecurringInvoices } from "@/lib/cron/recurring-invoices";

export const runtime = "nodejs";

function authorizeCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "CRON_SECRET is not configured" },
        { status: 500 },
      ),
    };
  }

  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");

  if (
    authorization === `Bearer ${cronSecret}` ||
    headerSecret === cronSecret
  ) {
    return { ok: true as const };
  }

  return {
    ok: false,
    response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}

async function handleGenerateInvoices(request: Request) {
  const authorization = authorizeCronRequest(request);

  if (!authorization.ok) {
    return authorization.response;
  }

  try {
    const result = await generateRecurringInvoices();

    revalidatePath("/");
    revalidatePath("/contracts");
    revalidatePath("/invoices");
    revalidatePath("/collections");

    for (const contractId of result.contractIds) {
      revalidatePath(`/contracts/${contractId}`);
    }

    for (const invoiceId of result.invoiceIds) {
      revalidatePath(`/invoices/${invoiceId}`);
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      contractCount: result.contractIds.length,
    });
  } catch (error) {
    console.error("Recurring invoice generation failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate recurring invoices",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleGenerateInvoices(request);
}

export async function POST(request: Request) {
  return handleGenerateInvoices(request);
}

