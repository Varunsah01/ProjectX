import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import BackupVerificationsPageClient from "./page-client";

export default async function BackupVerificationsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  const [data, total] = await Promise.all([
    db.backupVerification.findMany({
      orderBy: { runAt: "desc" },
      take: 50,
    }),
    db.backupVerification.count(),
  ]);

  const initialData = {
    data,
    total,
    page: 1,
    pageSize: 50,
    totalPages: Math.max(1, Math.ceil(total / 50)),
  };

  return <BackupVerificationsPageClient initialData={initialData} />;
}
