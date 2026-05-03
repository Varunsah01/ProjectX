import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LookupPageClient } from "./page-client";

export default async function LookupPage() {
  const session = await auth();

  if (session?.user?.activeRole !== "SUPPORT") {
    redirect("/");
  }

  return <LookupPageClient />;
}
