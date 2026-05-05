import NextAuth from "next-auth";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcrypt";
import authConfig from "./auth.config";
import { db } from "@/lib/db";

const TOKEN_VERSION_CHECK_INTERVAL_MS = 60_000;

// PrismaAdapter doesn't know about our extra required columns (passwordHash,
// status, organizationId). Override createUser so OAuth sign-ups don't fail.
const base = PrismaAdapter(db) as Adapter;
const patchedAdapter: Adapter = {
  ...base,
  async createUser(data: Omit<AdapterUser, "id">) {
    return db.user.create({
      data: {
        name:           data.name ?? "",
        email:          data.email.trim().toLowerCase(),
        emailVerified:  data.emailVerified ?? null,
        image:          data.image ?? null,
        passwordHash:   null,   // no password for OAuth users
        status:         "ACTIVE",
        organizationId: null,   // joined via /onboarding/create-org
      },
    });
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: patchedAdapter,
  trustHost: true,
  callbacks: {
    ...authConfig.callbacks,

    // Block Google sign-in when the email already belongs to a credentials-only
    // user. Auth.js would auto-link it; we intentionally prevent that.
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      const email = (user.email ?? "").trim().toLowerCase();
      const existing = await db.user.findUnique({
        where: { email },
        select: {
          id: true,
          accounts: {
            where:  { provider: "google" },
            select: { provider: true },
          },
        },
      });

      if (existing && existing.accounts.length === 0) {
        // Credentials-only user — surface a polite conflict message on /login
        return `/login?error=OAuthAccountNotLinked&hint=${encodeURIComponent(email)}`;
      }

      return true;
    },

    async jwt(params) {
      const { token, user, account, trigger, session } = params;

      // ── Google initial sign-in ──────────────────────────────────────────
      // The AdapterUser returned here doesn't carry activeOrgId / memberships
      // / tokenVersion, so we populate them from the DB.
      if (account?.provider === "google" && user?.id) {
        const userId = user.id;

        const memberships = await db.orgMembership.findMany({
          where:   { userId },
          include: { organization: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        });

        if (memberships.length > 0) {
          const first = memberships[0];
          token.activeOrgId = first.organizationId;
          token.activeRole  = first.role;
          token.memberships = memberships.map((m) => ({
            organizationId: m.organizationId,
            role:           m.role,
            orgName:        m.organization.name,
          }));
        }
        // If no memberships: activeOrgId stays undefined → middleware redirects
        // to /onboarding/create-org.

        const dbUser = await db.user.findUnique({
          where:  { id: userId },
          select: { tokenVersion: true },
        });
        token.tokenVersion          = dbUser?.tokenVersion ?? 0;
        token.tokenVersionCheckedAt = Date.now();
        token.isEmailVerified       = true; // Google already verified the email

        // Run the base callback so csrfSeed and org-switch logic still applies
        return authConfig.callbacks.jwt(params);
      }

      // ── Run the base (authConfig) JWT callback first ────────────────────
      const baseToken = authConfig.callbacks.jwt(params);

      if (
        baseToken.tokenVersion === undefined ||
        baseToken.sub === undefined
      ) {
        return baseToken;
      }

      // ── Periodic token-version + membership check (credentials users) ──
      const lastCheck = (baseToken.tokenVersionCheckedAt as number | undefined) ?? 0;
      if (Date.now() - lastCheck < TOKEN_VERSION_CHECK_INTERVAL_MS) {
        return baseToken;
      }

      const dbUser = await db.user.findUnique({
        where:  { id: baseToken.sub },
        select: { tokenVersion: true, status: true, emailVerified: true },
      });

      if (
        !dbUser ||
        dbUser.status === "INACTIVE" ||
        dbUser.status === "REMOVED"
      ) {
        return {};
      }

      if (dbUser.tokenVersion !== baseToken.tokenVersion) {
        return {};
      }

      if (baseToken.activeOrgId) {
        const membership = await db.orgMembership.findUnique({
          where: {
            userId_organizationId: {
              userId:         baseToken.sub,
              organizationId: baseToken.activeOrgId as string,
            },
          },
          select: { role: true },
        });

        if (!membership) {
          return {};
        }

        baseToken.activeRole = membership.role;
      }

      baseToken.tokenVersionCheckedAt = Date.now();
      baseToken.isEmailVerified = !!dbUser.emailVerified;
      return baseToken;
    },
  },
  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
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

        if (!email || !password) return null;

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id:           true,
            name:         true,
            email:        true,
            passwordHash: true,
            status:       true,
            image:        true,
            avatar:       true,
            tokenVersion: true,
            emailVerified: true,
          },
        });

        // Reject if not found, inactive, or has no password (OAuth-only user)
        if (!user || user.status === "INACTIVE" || !user.passwordHash) {
          return null;
        }

        const passwordMatches = await compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        const memberships = await db.orgMembership.findMany({
          where:   { userId: user.id },
          include: { organization: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        });

        if (memberships.length === 0) return null;

        const firstMembership = memberships[0];

        return {
          id:             user.id,
          name:           user.name,
          email:          user.email,
          image:          user.image ?? user.avatar ?? null,
          activeOrgId:    firstMembership.organizationId,
          activeRole:     firstMembership.role,
          memberships:    memberships.map((m) => ({
            organizationId: m.organizationId,
            role:           m.role,
            orgName:        m.organization.name,
          })),
          tokenVersion:     user.tokenVersion,
          isEmailVerified:  !!user.emailVerified,
        };
      },
    }),
  ],
});
