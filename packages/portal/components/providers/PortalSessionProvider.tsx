"use client";

import { SessionProvider } from "next-auth/react";

export function PortalSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
