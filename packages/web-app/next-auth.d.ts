import type { UserRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      activeOrgId: string;
      activeRole: UserRole;
      isEmailVerified: boolean;
      memberships: Array<{
        organizationId: string;
        role: UserRole;
        orgName: string;
      }>;
    };
  }

  interface User {
    activeOrgId?: string;
    activeRole?: UserRole;
    memberships?: Array<{
      organizationId: string;
      role: UserRole;
      orgName: string;
    }>;
    tokenVersion?: number;
    isEmailVerified?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    activeOrgId?: string;
    activeRole?: UserRole;
    memberships?: Array<{
      organizationId: string;
      role: UserRole;
      orgName: string;
    }>;
    tokenVersion?: number;
    tokenVersionCheckedAt?: number;
    isEmailVerified?: boolean;
  }
}
