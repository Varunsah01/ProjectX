"use client";

import { PortalHeader } from "./PortalHeader";
import { PortalNav } from "./PortalNav";

interface PortalShellProps {
  orgName: string;
  orgLogo?: string | null;
  children: React.ReactNode;
}

export function PortalShell({ orgName, orgLogo, children }: PortalShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader orgName={orgName} orgLogo={orgLogo} />
      <PortalNav />

      {/* Main content: offset for sidebar on desktop, bottom padding for tab bar on mobile */}
      <main className="md:ml-[200px] pb-20 md:pb-6 pt-4 px-4 sm:px-6">
        {children}
      </main>
    </div>
  );
}
