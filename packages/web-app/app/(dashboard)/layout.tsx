"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { SidebarProvider, useSidebar } from "@/components/layout/SidebarContext";
import { EmailVerificationBanner } from "@/components/ui/EmailVerificationBanner";
import { ImpersonationBanner } from "@/components/ui/ImpersonationBanner";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div
        className={`flex-1 transition-all duration-300 ${
          collapsed ? "lg:ml-[68px]" : "lg:ml-[240px]"
        }`}
      >
        <Header />
        <CommandPalette />
        <ImpersonationBanner />
        <EmailVerificationBanner />
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
