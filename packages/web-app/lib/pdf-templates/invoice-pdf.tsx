import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  brand,
  calculateIncludedTax,
  formatPdfCurrency,
  formatPdfDate,
  PdfLogoPlaceholder,
  pdfStyles,
} from "@/lib/pdf-templates/shared";
import { INDIAN_STATES } from "@/lib/tax/gst";

export interface InvoicePdfData {
  organization: {
    name: string;
    address: string;
    city: string;
    gstin?: string | null;
    email: string;
    phone: string;
    logo?: string | null;
  };
  customer: {
    name: string;
    address: string;
    city: string;
    gstin?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  invoice: {
    invoiceNumber: string;
    issuedDate: Date | string;
    dueDate: Date | string;
    amount: number;
    paidAmount: number;
    placeOfSupply?: string | null;
    isInterState?: boolean | null;
    subtotalAmount?: number | null;
    cgstAmount?: number | null;
    sgstAmount?: number | null;
    igstAmount?: number | null;
    totalTaxAmount?: number | null;
    notes?: string | null;
    items: Array<{
      id: string;
      description: string;
      qty: number;
      rate: number;
      amount: number;
      hsnSac?: string | null;
      gstRatePercent?: number | null;
    }>;
  };
}

const styles = StyleSheet.create({
  invoiceBadge: {
    backgroundColor: brand[50],
    borderRadius: 999,
    color: brand[700],
    fontSize: 10,
    fontWeight: 700,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerMeta: {
    alignItems: "flex-end",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  companyWrap: {
    display: "flex",
    flexDirection: "row",
    gap: 14,
  },
  companyDetails: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    maxWidth: 280,
  },
  sectionWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    marginTop: 16,
  },
  table: {
    border: "1 solid #e2e8f0",
    borderRadius: 12,
    marginTop: 16,
    overflow: "hidden",
  },
  tableHeader: {
    backgroundColor: brand[50],
    borderBottom: "1 solid #e2e8f0",
    display: "flex",
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tableRow: {
    borderBottom: "1 solid #f1f5f9",
    display: "flex",
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hsnCol: {
    flexBasis: "14%",
  },
  descriptionCol: {
    flexBasis: "34%",
    flexGrow: 1,
  },
  qtyCol: {
    flexBasis: "10%",
    textAlign: "right",
  },
  rateCol: {
    flexBasis: "16%",
    textAlign: "right",
  },
  gstCol: {
    flexBasis: "10%",
    textAlign: "right",
  },
  amountCol: {
    flexBasis: "16%",
    textAlign: "right",
  },
  tableLabel: {
    color: "#475569",
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  tableValue: {
    color: "#0f172a",
    fontSize: 10,
  },
  summaryRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  summaryCard: {
    backgroundColor: "#f8fafc",
    border: "1 solid #e2e8f0",
    borderRadius: 14,
    marginLeft: "auto",
    marginTop: 16,
    padding: 14,
    width: 220,
  },
  totalRow: {
    borderTop: "1 solid #cbd5e1",
    marginTop: 8,
    paddingTop: 8,
  },
  bankDetails: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  noteText: {
    color: "#334155",
    fontSize: 10,
    lineHeight: 1.55,
  },
});

export function InvoicePdfDocument({ data }: { data: InvoicePdfData }) {
  const hasGstBreakdown = data.invoice.subtotalAmount != null;

  // Legacy fallback for old invoices without GST breakup
  const legacyTotals = !hasGstBreakdown
    ? calculateIncludedTax(data.invoice.amount)
    : null;

  const balance = Math.max(0, data.invoice.amount - data.invoice.paidAmount);

  const hasHsnColumn = data.invoice.items.some((item) => item.hsnSac);

  const placeOfSupplyLabel = data.invoice.placeOfSupply
    ? INDIAN_STATES[data.invoice.placeOfSupply] || data.invoice.placeOfSupply
    : null;

  return (
    <Document
      author={data.organization.name}
      creator="Recuring"
      producer="Recuring"
      title={`Invoice ${data.invoice.invoiceNumber}`}
    >
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.card}>
          <View style={pdfStyles.rowBetween}>
            <View style={styles.companyWrap}>
              <PdfLogoPlaceholder label={data.organization.name.slice(0, 1).toUpperCase()} />
              <View style={styles.companyDetails}>
                <Text style={pdfStyles.heading}>{data.organization.name}</Text>
                <Text style={pdfStyles.muted}>
                  {data.organization.address}, {data.organization.city}
                </Text>
                <Text style={pdfStyles.muted}>
                  GSTIN: {data.organization.gstin || "-"} | Email: {data.organization.email}
                </Text>
                <Text style={pdfStyles.muted}>Phone: {data.organization.phone}</Text>
              </View>
            </View>

            <View style={styles.headerMeta}>
              <Text style={styles.invoiceBadge}>Tax Invoice</Text>
              <Text style={pdfStyles.eyebrow}>Invoice Number</Text>
              <Text style={pdfStyles.subheading}>{data.invoice.invoiceNumber}</Text>
            </View>
          </View>

          <View style={styles.sectionWrap}>
            <View style={pdfStyles.grid}>
              <View style={[pdfStyles.infoCard, pdfStyles.gridCol]}>
                <Text style={pdfStyles.sectionTitle}>Bill To</Text>
                <Text style={pdfStyles.subheading}>{data.customer.name}</Text>
                <Text style={pdfStyles.muted}>
                  {data.customer.address}, {data.customer.city}
                </Text>
                <Text style={pdfStyles.muted}>GSTIN: {data.customer.gstin || "-"}</Text>
                <Text style={pdfStyles.muted}>
                  {data.customer.email || "-"} | {data.customer.phone || "-"}
                </Text>
              </View>

              <View style={[pdfStyles.infoCard, pdfStyles.gridCol]}>
                <Text style={pdfStyles.sectionTitle}>Invoice Details</Text>
                <View style={pdfStyles.detailRow}>
                  <Text style={pdfStyles.detailLabel}>Issued Date</Text>
                  <Text style={pdfStyles.detailValue}>
                    {formatPdfDate(data.invoice.issuedDate)}
                  </Text>
                </View>
                <View style={pdfStyles.detailRow}>
                  <Text style={pdfStyles.detailLabel}>Due Date</Text>
                  <Text style={pdfStyles.detailValue}>
                    {formatPdfDate(data.invoice.dueDate)}
                  </Text>
                </View>
                {placeOfSupplyLabel ? (
                  <View style={pdfStyles.detailRow}>
                    <Text style={pdfStyles.detailLabel}>Place of Supply</Text>
                    <Text style={pdfStyles.detailValue}>{placeOfSupplyLabel}</Text>
                  </View>
                ) : null}
                <View style={pdfStyles.detailRow}>
                  <Text style={pdfStyles.detailLabel}>Amount Due</Text>
                  <Text style={pdfStyles.detailValue}>{formatPdfCurrency(balance)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                {hasHsnColumn ? (
                  <Text style={[styles.tableLabel, styles.hsnCol]}>HSN/SAC</Text>
                ) : null}
                <Text style={[styles.tableLabel, hasHsnColumn ? styles.descriptionCol : { flexBasis: "46%", flexGrow: 1 }]}>Description</Text>
                <Text style={[styles.tableLabel, styles.qtyCol]}>Qty</Text>
                <Text style={[styles.tableLabel, styles.rateCol]}>Rate</Text>
                {hasGstBreakdown ? (
                  <Text style={[styles.tableLabel, styles.gstCol]}>GST %</Text>
                ) : null}
                <Text style={[styles.tableLabel, styles.amountCol]}>Amount</Text>
              </View>
              {data.invoice.items.map((item) => (
                <View key={item.id} style={styles.tableRow}>
                  {hasHsnColumn ? (
                    <Text style={[styles.tableValue, styles.hsnCol]}>
                      {item.hsnSac || "-"}
                    </Text>
                  ) : null}
                  <Text style={[styles.tableValue, hasHsnColumn ? styles.descriptionCol : { flexBasis: "46%", flexGrow: 1 }]}>
                    {item.description}
                  </Text>
                  <Text style={[styles.tableValue, styles.qtyCol]}>{item.qty}</Text>
                  <Text style={[styles.tableValue, styles.rateCol]}>
                    {formatPdfCurrency(item.rate)}
                  </Text>
                  {hasGstBreakdown ? (
                    <Text style={[styles.tableValue, styles.gstCol]}>
                      {item.gstRatePercent != null ? `${item.gstRatePercent}%` : "-"}
                    </Text>
                  ) : null}
                  <Text style={[styles.tableValue, styles.amountCol]}>
                    {formatPdfCurrency(item.amount)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.summaryCard}>
              {hasGstBreakdown ? (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={pdfStyles.muted}>Subtotal</Text>
                    <Text>{formatPdfCurrency(data.invoice.subtotalAmount!)}</Text>
                  </View>
                  {data.invoice.isInterState ? (
                    <View style={styles.summaryRow}>
                      <Text style={pdfStyles.muted}>IGST</Text>
                      <Text>{formatPdfCurrency(data.invoice.igstAmount ?? 0)}</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.summaryRow}>
                        <Text style={pdfStyles.muted}>CGST</Text>
                        <Text>{formatPdfCurrency(data.invoice.cgstAmount ?? 0)}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={pdfStyles.muted}>SGST</Text>
                        <Text>{formatPdfCurrency(data.invoice.sgstAmount ?? 0)}</Text>
                      </View>
                    </>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={pdfStyles.muted}>Subtotal</Text>
                    <Text>{formatPdfCurrency(legacyTotals!.subtotal)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={pdfStyles.muted}>GST (18% included)</Text>
                    <Text>{formatPdfCurrency(legacyTotals!.tax)}</Text>
                  </View>
                </>
              )}
              <View style={styles.summaryRow}>
                <Text style={pdfStyles.muted}>Paid</Text>
                <Text>{formatPdfCurrency(data.invoice.paidAmount)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={pdfStyles.subheading}>Total</Text>
                <Text style={pdfStyles.subheading}>
                  {formatPdfCurrency(data.invoice.amount)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={pdfStyles.muted}>Balance Due</Text>
                <Text style={pdfStyles.subheading}>{formatPdfCurrency(balance)}</Text>
              </View>
            </View>

            <View style={pdfStyles.grid}>
              <View style={[pdfStyles.infoCard, pdfStyles.gridCol]}>
                <Text style={pdfStyles.sectionTitle}>Payment Terms</Text>
                <Text style={styles.noteText}>
                  Payment is due by {formatPdfDate(data.invoice.dueDate)}. Please
                  mention invoice number {data.invoice.invoiceNumber} in your transfer
                  reference.
                </Text>
                <Text style={[styles.noteText, { marginTop: 6 }]}>
                  Late payments may affect ongoing service commitments.
                </Text>
              </View>
              <View style={[pdfStyles.infoCard, pdfStyles.gridCol]}>
                <Text style={pdfStyles.sectionTitle}>Bank Details</Text>
                <View style={styles.bankDetails}>
                  <View style={pdfStyles.detailRow}>
                    <Text style={pdfStyles.detailLabel}>Account Name</Text>
                    <Text style={pdfStyles.detailValue}>{data.organization.name}</Text>
                  </View>
                  <View style={pdfStyles.detailRow}>
                    <Text style={pdfStyles.detailLabel}>Bank Name</Text>
                    <Text style={pdfStyles.detailValue}>Your Bank Name</Text>
                  </View>
                  <View style={pdfStyles.detailRow}>
                    <Text style={pdfStyles.detailLabel}>Account Number</Text>
                    <Text style={pdfStyles.detailValue}>XXXX XXXX XXXX</Text>
                  </View>
                  <View style={pdfStyles.detailRow}>
                    <Text style={pdfStyles.detailLabel}>IFSC</Text>
                    <Text style={pdfStyles.detailValue}>XXXXXXXXXXX</Text>
                  </View>
                </View>
              </View>
            </View>

            {data.invoice.notes ? (
              <View style={pdfStyles.infoCard}>
                <Text style={pdfStyles.sectionTitle}>Notes</Text>
                <Text style={styles.noteText}>{data.invoice.notes}</Text>
              </View>
            ) : null}
          </View>

          <Text style={pdfStyles.footer}>
            Generated by Recuring for {data.organization.name}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
