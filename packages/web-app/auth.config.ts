import type { NextAuthConfig } from "next-auth";

const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user?.role) {
        token.role = user.role;
      }

      if (user?.organizationId) {
        token.organizationId = user.organizationId;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id;
        session.user.role =
          (token.role as typeof session.user.role) ?? session.user.role;
        session.user.organizationId =
          (token.organizationId as string | undefined) ??
          session.user.organizationId;
      }

      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;

export default authConfig;
