import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { auth } from "@/auth";
import { AuthSessionProvider } from "@/components/providers/AuthSessionProvider";
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

  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        <AuthSessionProvider session={session}>
          {children}
          <Toaster richColors position="top-right" />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
