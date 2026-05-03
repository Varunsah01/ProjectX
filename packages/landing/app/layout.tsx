import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { CookieBanner } from "@/components/ui/CookieBanner";
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
    siteName: "Project X",
  },
  twitter: {
    card: "summary_large_image",
    title: "Project X - Recurring Service Operations Platform",
    description:
      "Collect faster, serve better, renew more customers. The operating system for Indian service businesses.",
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "theme-color": "#4f46e5",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Project X",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://recuring.in",
  logo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://recuring.in"}/logo.png`,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    email: "hello@recuring.in",
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Project X",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    priceCurrency: "INR",
  },
  description:
    "The all-in-one operations platform for Indian service businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
      </head>
      <body className="font-sans">
        {/* Skip to content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-xl focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        <AnalyticsProvider>
          {children}
          <CookieBanner />
        </AnalyticsProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
