import { StyleSheet, Text, View } from "@react-pdf/renderer";

export const brand = {
  50: "#eef2ff",
  100: "#e0e7ff",
  500: "#6366f1",
  600: "#4f46e5",
  700: "#4338ca",
  900: "#312e81",
};

export const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.45,
    padding: 28,
  },
  card: {
    backgroundColor: "#ffffff",
    border: "1 solid #e2e8f0",
    borderRadius: 18,
    padding: 20,
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  row: {
    display: "flex",
    flexDirection: "row",
  },
  rowBetween: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  column: {
    display: "flex",
    flexDirection: "column",
  },
  grid: {
    display: "flex",
    flexDirection: "row",
    gap: 12,
  },
  gridCol: {
    flexGrow: 1,
    flexBasis: 0,
  },
  logoBox: {
    alignItems: "center",
    backgroundColor: brand[600],
    borderRadius: 14,
    display: "flex",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  logoText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 700,
  },
  heading: {
    color: brand[900],
    fontSize: 24,
    fontWeight: 700,
  },
  subheading: {
    color: "#334155",
    fontSize: 11,
    fontWeight: 600,
  },
  eyebrow: {
    color: brand[700],
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  muted: {
    color: "#64748b",
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: "#ffffff",
    border: "1 solid #e2e8f0",
    borderRadius: 12,
    padding: 14,
  },
  detailRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  detailLabel: {
    color: "#64748b",
    fontSize: 9,
    fontWeight: 600,
    textTransform: "uppercase",
  },
  detailValue: {
    color: "#0f172a",
    flexShrink: 1,
    fontSize: 10,
    fontWeight: 600,
    textAlign: "right",
  },
  footer: {
    borderTop: "1 solid #e2e8f0",
    color: "#64748b",
    fontSize: 9,
    marginTop: 16,
    paddingTop: 12,
    textAlign: "center",
  },
});

export function formatPdfCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPdfDate(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatPdfDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPdfDuration(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
) {
  if (!start || !end) {
    return "Not recorded";
  }

  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();

  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return "Not recorded";
  }

  const totalMinutes = Math.round(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0 && days === 0) {
    parts.push(`${minutes}m`);
  }

  return parts.join(" ") || "Less than 1h";
}

export function calculateIncludedTax(total: number, taxRate = 0.18) {
  const subtotal = Math.round(total / (1 + taxRate));
  return {
    subtotal,
    tax: Math.max(0, total - subtotal),
    total,
  };
}

export function sanitizeFilename(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

export function PdfLogoPlaceholder({ label }: { label: string }) {
  return (
    <View style={pdfStyles.logoBox}>
      <Text style={pdfStyles.logoText}>{label}</Text>
    </View>
  );
}

