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

interface MagicLinkEmailProps {
  magicLinkUrl: string;
  expiryMinutes?: number;
}

export function MagicLinkEmail({
  magicLinkUrl,
  expiryMinutes = 15,
}: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Sign in to your account</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={card}>
            <Section style={header}>
              <Section style={logoWrap}>
                <Text style={logoMark}>R</Text>
              </Section>
              <Text style={logoLabel}>Customer Portal</Text>
            </Section>

            <Heading style={headingStyle}>Sign in to your account</Heading>
            <Text style={paragraph}>
              Click the button below to sign in to your customer portal. This
              link is valid for {expiryMinutes} minutes.
            </Text>

            <Section style={ctaSection}>
              <Button href={magicLinkUrl} style={button}>
                Sign in
              </Button>
            </Section>

            <Text style={smallText}>
              If the button doesn&apos;t work, copy and paste this URL into your
              browser:
            </Text>
            <Text style={urlText}>{magicLinkUrl}</Text>

            <Hr style={divider} />

            <Text style={footerText}>
              This link expires in {expiryMinutes} minutes. If you didn&apos;t
              request this, you can safely ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const brand600 = "#4f46e5";
const brand900 = "#312e81";

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
  backgroundColor: brand600,
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
  color: brand900,
  fontSize: "20px",
  fontWeight: "700",
  margin: "14px 0 4px",
} as const;

const headingStyle = {
  color: "#0f172a",
  fontSize: "28px",
  lineHeight: "36px",
  margin: "0 0 12px",
} as const;

const paragraph = {
  color: "#334155",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 14px",
} as const;

const ctaSection = {
  marginTop: "24px",
  marginBottom: "24px",
} as const;

const button = {
  backgroundColor: brand600,
  borderRadius: "12px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "600",
  padding: "14px 22px",
  textDecoration: "none",
} as const;

const smallText = {
  color: "#475569",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 4px",
} as const;

const urlText = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 14px",
  wordBreak: "break-all" as const,
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
