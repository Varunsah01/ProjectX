import type { NextAuthConfig } from "next-auth";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const authConfig = {
  secret: process.env.PORTAL_AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: "portal.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: IS_PRODUCTION,
        ...(IS_PRODUCTION
          ? { domain: `.${process.env.PORTAL_COOKIE_DOMAIN ?? "portal.recuring.in"}` }
          : {}),
      },
    },
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.customerId) {
        token.customerId = user.customerId;
      }
      if (user?.organizationId) {
        token.organizationId = user.organizationId;
      }
      if (user?.customerName) {
        token.customerName = user.customerName;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.customerId = (token.customerId as string) ?? "";
        session.user.organizationId = (token.organizationId as string) ?? "";
        session.user.customerName = (token.customerName as string) ?? "";
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;

export default authConfig;
