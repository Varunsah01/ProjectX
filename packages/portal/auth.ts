import { createHash } from "node:crypto";
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import authConfig from "./auth.config";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { renderEmailTemplate } from "@/lib/render-email-template";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getPortalUrl() {
  return process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3002";
}

const MAGIC_LINK_EXPIRY_MINUTES = 15;

async function getCustomerIdByEmail(email: string): Promise<string | null> {
  const customer = await db.customer.findFirst({
    where: {
      email: email.toLowerCase(),
      status: "ACTIVE",
    },
    select: { id: true },
  });

  return customer?.id ?? null;
}

const portalAuthConfig: NextAuthConfig = {
  ...authConfig,
  trustHost: true,
  providers: [
    {
      id: "email",
      name: "Email",
      type: "email",
      maxAge: MAGIC_LINK_EXPIRY_MINUTES * 60,
      async sendVerificationRequest({
        identifier: email,
        token,
      }: {
        identifier: string;
        url: string;
        token: string;
        provider: unknown;
      }) {
        // Silently skip for unknown emails to prevent account enumeration
        const customerId = await getCustomerIdByEmail(email);
        if (!customerId) return;

        const portalUrl = getPortalUrl();
        const verifyUrl = `${portalUrl}/api/auth/callback/email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

        const html = await renderEmailTemplate(
          MagicLinkEmail({
            magicLinkUrl: verifyUrl,
            expiryMinutes: MAGIC_LINK_EXPIRY_MINUTES,
          }),
        );

        await sendEmail(email, "Sign in to your account", html);
      },
      options: {},
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider !== "email") return true;
      if (!user.email) return false;
      return true;
    },
    async jwt(params) {
      const token = authConfig.callbacks.jwt(params);

      // On initial sign-in, look up the customer
      if (params.trigger === "signIn" && params.user?.email) {
        const customer = await db.customer.findFirst({
          where: {
            email: params.user.email.toLowerCase(),
            status: "ACTIVE",
          },
          select: {
            id: true,
            name: true,
            email: true,
            organizationId: true,
          },
        });

        if (customer) {
          token.customerId = customer.id;
          token.organizationId = customer.organizationId;
          token.customerName = customer.name;
          token.email = customer.email;
          token.sub = customer.id;
        }
      }

      return token;
    },
  },
  adapter: {
    async createVerificationToken({ identifier, expires, token }) {
      const customerId = await getCustomerIdByEmail(identifier);
      if (customerId) {
        await db.customerMagicLink.create({
          data: {
            customerId,
            token: hashToken(token),
            expiresAt: expires,
          },
        });
      }
      // Always return token data to prevent account enumeration
      return { identifier, expires, token };
    },
    async useVerificationToken({ identifier, token }) {
      const hashed = hashToken(token);
      const record = await db.customerMagicLink.findUnique({
        where: { token: hashed },
        include: { customer: { select: { email: true } } },
      });

      if (!record || record.usedAt || record.expiresAt < new Date()) {
        return null;
      }

      if (record.customer.email.toLowerCase() !== identifier.toLowerCase()) {
        return null;
      }

      await db.customerMagicLink.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      return {
        identifier,
        expires: record.expiresAt,
        token,
      };
    },
    async getUserByEmail(email: string) {
      const customer = await db.customer.findFirst({
        where: {
          email: email.toLowerCase(),
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          email: true,
          organizationId: true,
        },
      });

      if (!customer) return null;

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        emailVerified: new Date(),
        customerId: customer.id,
        organizationId: customer.organizationId,
        customerName: customer.name,
      };
    },
    // Stubs for required adapter methods (not used by email provider)
    async createUser(data: any) { return { ...data, id: data.id ?? "" }; },
    async getUser() { return null; },
    async getUserByAccount() { return null; },
    async updateUser(data: any) { return data; },
    async linkAccount() { return undefined as any; },
    async createSession(data: any) { return data; },
    async getSessionAndUser() { return null; },
    async updateSession(data: any) { return data; },
    async deleteSession() {},
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(portalAuthConfig);
