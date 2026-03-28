import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Project X - Recurring Service Operations Platform",
  description:
    "The all-in-one operations platform for Indian service businesses. Manage customers, billing, complaints, technicians, AMC contracts, and collections from one place. Collect faster, serve better, renew more.",
  keywords: [
    "service business software",
    "recurring billing India",
    "AMC management",
    "field service management",
    "technician management",
    "complaint management",
    "collections software",
    "service operations platform",
  ],
  openGraph: {
    title: "Project X - Recurring Service Operations Platform",
    description:
      "Collect faster, serve better, renew more customers. The operating system for Indian service businesses.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
