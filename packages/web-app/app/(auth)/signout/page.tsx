"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function SignOutPage() {
  useEffect(() => {
    signOut({ redirect: true, callbackUrl: "/login" });
  }, []);

  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <p className="text-sm text-slate-500">Signing out…</p>
    </div>
  );
}
