"use client";

import { createContext, useContext } from "react";

interface AuthBranding {
  orgName: string | null;
  orgLogo: string | null;
}

const AuthBrandingContext = createContext<AuthBranding>({
  orgName: null,
  orgLogo: null,
});

export function useAuthBranding() {
  return useContext(AuthBrandingContext);
}

export function AuthBrandingProvider({
  orgName,
  orgLogo,
  children,
}: AuthBranding & { children: React.ReactNode }) {
  return (
    <AuthBrandingContext.Provider value={{ orgName, orgLogo }}>
      {children}
    </AuthBrandingContext.Provider>
  );
}
