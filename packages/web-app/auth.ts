import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcrypt";
import authConfig from "./auth.config";
import { db } from "@/lib/db";

const TOKEN_VERSION_CHECK_INTERVAL_MS = 60_000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db) as Adapter,
  trustHost: true,
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      const token = authConfig.callbacks.jwt(params);

      if (
        token.tokenVersion === undefined ||
        token.sub === undefined
      ) {
        return token;
      }

      const lastCheck = (token.tokenVersionCheckedAt as number | undefined) ?? 0;
      if (Date.now() - lastCheck < TOKEN_VERSION_CHECK_INTERVAL_MS) {
        return token;
      }

      const dbUser = await db.user.findUnique({
        where: { id: token.sub },
        select: { tokenVersion: true, status: true },
      });

      if (
        !dbUser ||
        dbUser.status === "INACTIVE" ||
        dbUser.status === "REMOVED"
      ) {
        return {};
      }

      if (dbUser.tokenVersion !== token.tokenVersion) {
        return {};
      }

      token.tokenVersionCheckedAt = Date.now();
      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";

        if (!email || !password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            role: true,
            organizationId: true,
            status: true,
            image: true,
            avatar: true,
            tokenVersion: true,
          },
        });

        if (!user || user.status === "INACTIVE") {
          return null;
        }

        const passwordMatches = await compare(password, user.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          image: user.image ?? user.avatar ?? null,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
});
