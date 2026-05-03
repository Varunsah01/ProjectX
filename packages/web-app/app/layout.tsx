import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { auth } from "@/auth";
import { AuthSessionProvider } from "@/components/providers/AuthSessionProvider";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import { GrowthBookProvider } from "@/components/providers/GrowthBookProvider";
import { getSerializedFeatures } from "@/lib/feature-flags/server";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Project X - Web App",
  description: "Project X recurring service operations platform.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const serializedFeatures = await getSerializedFeatures();

  const attributes = {
    userId: session?.user?.id,
    orgId: session?.user?.activeOrgId,
    role: session?.user?.activeRole,
  };

  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <AuthSessionProvider session={session}>
          <GrowthBookProvider
            serializedFeatures={serializedFeatures}
            attributes={attributes}
          >
            <AnalyticsProvider session={session} />
            {children}
            <Toaster richColors position="top-right" />
          </GrowthBookProvider>
        </AuthSessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
