import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import RecycleBinClient from "./page-client";

export const metadata = { title: "Recycle Bin" };

export default async function RecycleBinPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const activeRole = session.user.activeRole as UserRole;
  if (activeRole !== UserRole.ADMIN && activeRole !== UserRole.MANAGER) {
    redirect("/");
  }

  const orgId = session.user.activeOrgId as string;

  const [customers, assets, contracts, invoices, tickets, jobs] =
    await Promise.all([
      db.customer.findMany({
        where: { organizationId: orgId, deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
      db.asset.findMany({
        where: { organizationId: orgId, deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
      db.contract.findMany({
        where: { organizationId: orgId, deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
      db.invoice.findMany({
        where: { organizationId: orgId, deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
      db.ticket.findMany({
        where: { organizationId: orgId, deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
      db.job.findMany({
        where: { organizationId: orgId, deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
    ]);

  return (
    <RecycleBinClient
      customers={customers}
      assets={assets}
      contracts={contracts}
      invoices={invoices}
      tickets={tickets}
      jobs={jobs}
    />
  );
}
