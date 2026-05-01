"use server";

import { revalidatePath } from "next/cache";
import { LeadStatus } from "@prisma/client";
import { leadUpdateStatusSchema } from "@project-x/shared/schemas/leads";
import { db } from "@/lib/db";
import { logger } from "@/lib/log";

export async function updateLeadStatusAction(input: {
  leadId: string;
  status: LeadStatus;
}) {
  const parsed = leadUpdateStatusSchema.safeParse({ status: input.status });

  if (!parsed.success) {
    return { success: false as const, error: "Invalid status." };
  }

  try {
    await db.lead.update({
      where: { id: input.leadId },
      data: { status: parsed.data.status as LeadStatus },
    });
  } catch (error) {
    logger.error(
      { event: "leads.update-status.error", leadId: input.leadId, err: error },
      "lead status update failed",
    );
    return { success: false as const, error: "Unable to update lead." };
  }

  revalidatePath("/leads");
  return { success: true as const };
}

export async function markLeadContactedAction(leadId: string) {
  return updateLeadStatusAction({ leadId, status: LeadStatus.CONTACTED });
}
