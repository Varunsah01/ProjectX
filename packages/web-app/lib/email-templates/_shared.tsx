import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

const brand = {
  50: "#eef2ff",
  100: "#e0e7ff",
  500: "#6366f1",
  600: "#4f46e5",
  700: "#4338ca",
  900: "#312e81",
};

export function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3001";
}

export function EmailLayout({
  preview,
  heading,
  preheader,
  organizationName = "Recuring",
  ctaLabel,
  ctaHref,
  children,
  footerNote,
}: {
  preview: string;
  heading: string;
  preheader: string;
  organizationName?: string;
  ctaLabel?: string;
  ctaHref?: string;
  children: React.ReactNode;
  footerNote?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={card}>
            <Section style={header}>
              <Section style={logoWrap}>
                <Text style={logoMark}>R</Text>
              </Section>
              <Text style={logoLabel}>{organizationName}</Text>
              <Text style={logoSubLabel}>Company Logo Placeholder</Text>
            </Section>

            <Heading style={headingStyle}>{heading}</Heading>
            <Text style={preheaderStyle}>{preheader}</Text>

            <Section style={content}>{children}</Section>

            {ctaLabel && ctaHref ? (
              <Section style={ctaSection}>
                <Button href={ctaHref} style={button}>
                  {ctaLabel}
                </Button>
              </Section>
            ) : null}

            <Hr style={divider} />

            <Text style={footerText}>
              {footerNote ?? "You are receiving this email because there is an update in your Recuring account."}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function DetailList({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <Section style={detailSection}>
      {items.map((item) => (
        <Section key={item.label} style={detailRow}>
          <Text style={detailLabel}>{item.label}</Text>
          <Text style={detailValue}>{item.value}</Text>
        </Section>
      ))}
    </Section>
  );
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={paragraph}>{children}</Text>;
}

const body = {
  backgroundColor: "#f8fafc",
  margin: 0,
  padding: "24px 12px",
  fontFamily: "Inter, Arial, sans-serif",
} as const;

const container = {
  margin: "0 auto",
  maxWidth: "560px",
  width: "100%",
} as const;

const card = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  padding: "32px 24px",
} as const;

const header = {
  marginBottom: "24px",
} as const;

const logoWrap = {
  backgroundColor: brand[600],
  borderRadius: "16px",
  height: "48px",
  width: "48px",
  textAlign: "center" as const,
} as const;

const logoMark = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "700",
  lineHeight: "48px",
  margin: 0,
} as const;

const logoLabel = {
  color: brand[900],
  fontSize: "20px",
  fontWeight: "700",
  margin: "14px 0 4px",
} as const;

const logoSubLabel = {
  color: "#64748b",
  fontSize: "12px",
  margin: 0,
} as const;

const headingStyle = {
  color: "#0f172a",
  fontSize: "28px",
  lineHeight: "36px",
  margin: "0 0 12px",
} as const;

const preheaderStyle = {
  color: "#475569",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 20px",
} as const;

const content = {
  marginTop: "12px",
} as const;

const paragraph = {
  color: "#334155",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 14px",
} as const;

const detailSection = {
  backgroundColor: brand[50],
  borderRadius: "16px",
  padding: "16px 18px",
  margin: "18px 0",
} as const;

const detailRow = {
  marginBottom: "12px",
} as const;

const detailLabel = {
  color: brand[700],
  fontSize: "12px",
  fontWeight: "600",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
} as const;

const detailValue = {
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: "600",
  margin: 0,
} as const;

const ctaSection = {
  marginTop: "24px",
  marginBottom: "24px",
} as const;

const button = {
  backgroundColor: brand[600],
  borderRadius: "12px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "600",
  padding: "14px 22px",
  textDecoration: "none",
} as const;

const divider = {
  borderColor: "#e2e8f0",
  margin: "26px 0 20px",
} as const;

const footerText = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "20px",
  margin: 0,
} as const;
