import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      customerId: string;
      organizationId: string;
      customerName: string;
    };
  }

  interface User {
    customerId?: string;
    organizationId?: string;
    customerName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    customerId?: string;
    organizationId?: string;
    customerName?: string;
  }
}
