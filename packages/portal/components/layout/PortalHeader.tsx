"use client";

import { LogOut, Menu, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/cn";

interface PortalHeaderProps {
  orgName: string;
  orgLogo?: string | null;
}

export function PortalHeader({ orgName, orgLogo }: PortalHeaderProps) {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left: Logo + Org name */}
        <div className="flex items-center gap-3">
          {orgLogo ? (
            <img
              src={orgLogo}
              alt={orgName}
              className="h-8 w-8 rounded-lg object-contain"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <span className="text-sm font-bold text-white">
                {orgName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-sm font-semibold text-slate-900 truncate max-w-[150px] sm:max-w-none">
            {orgName}
          </span>
        </div>

        {/* Right: User info + Logout */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:block text-sm text-slate-600 truncate max-w-[200px]">
            {session?.user?.customerName}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
