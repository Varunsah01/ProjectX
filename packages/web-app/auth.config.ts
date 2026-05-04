import type { NextAuthConfig } from "next-auth";

const authConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user, trigger, session }) {
      // Ensure every session has a CSRF seed (auto-assigns on first encounter)
      if (!token.csrfSeed) {
        token.csrfSeed = crypto.randomUUID();
      }

      // Initial sign-in: populate from the user object returned by authorize()
      if (user?.activeOrgId) {
        token.activeOrgId = user.activeOrgId;
      }

      if (user?.activeRole) {
        token.activeRole = user.activeRole;
      }

      if (user?.memberships) {
        token.memberships = user.memberships;
      }

      if (user?.tokenVersion !== undefined) {
        token.tokenVersion = user.tokenVersion;
        token.tokenVersionCheckedAt = Date.now();
      }

      if (user?.isEmailVerified !== undefined) {
        token.isEmailVerified = !!user.isEmailVerified;
      }

      // Org switch: triggered by client calling useSession().update()
      if (trigger === "update" && session?.activeOrgId) {
        token.activeOrgId = session.activeOrgId as string;
        token.activeRole = session.activeRole as typeof token.activeRole;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id;
        session.user.csrfSeed = (token.csrfSeed as string) ?? "";
        session.user.activeRole =
          (token.activeRole as typeof session.user.activeRole) ??
          session.user.activeRole;
        session.user.activeOrgId =
          (token.activeOrgId as string | undefined) ??
          session.user.activeOrgId;
        session.user.isEmailVerified =
          (token.isEmailVerified as boolean | undefined) ?? false;
        session.user.memberships =
          (token.memberships as typeof session.user.memberships | undefined) ??
          session.user.memberships ??
          [];
      }

      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;

export default authConfig;
