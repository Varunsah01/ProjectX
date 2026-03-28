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

export interface InvoicePdfData {
  organization: {
    name: string;
    address: string;
    city: string;
    gst?: string | null;
    email: string;
    phone: string;
    logo?: string | null;
  };
  customer: {
    name: string;
    address: string;
    city: string;
    gst?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  invoice: {
    invoiceNumber: string;
    issuedDate: Date | string;
    dueDate: Date | string;
    amount: number;
    paidAmount: number;
    notes?: string | null;
    items: Array<{
      id: string;
      description: string;
      qty: number;
      rate: number;
      amount: number;
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
  descriptionCol: {
    flexBasis: "46%",
    flexGrow: 1,
  },
  qtyCol: {
    flexBasis: "12%",
    textAlign: "right",
  },
  rateCol: {
    flexBasis: "21%",
    textAlign: "right",
  },
  amountCol: {
    flexBasis: "21%",
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
  const totals = calculateIncludedTax(data.invoice.amount);
  const balance = Math.max(0, data.invoice.amount - data.invoice.paidAmount);

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
                  GST: {data.organization.gst || "-"} | Email: {data.organization.email}
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
                <Text style={pdfStyles.muted}>GST: {data.customer.gst || "-"}</Text>
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
                <View style={pdfStyles.detailRow}>
                  <Text style={pdfStyles.detailLabel}>Amount Due</Text>
                  <Text style={pdfStyles.detailValue}>{formatPdfCurrency(balance)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableLabel, styles.descriptionCol]}>Description</Text>
                <Text style={[styles.tableLabel, styles.qtyCol]}>Qty</Text>
                <Text style={[styles.tableLabel, styles.rateCol]}>Rate</Text>
                <Text style={[styles.tableLabel, styles.amountCol]}>Amount</Text>
              </View>
              {data.invoice.items.map((item) => (
                <View key={item.id} style={styles.tableRow}>
                  <Text style={[styles.tableValue, styles.descriptionCol]}>
                    {item.description}
                  </Text>
                  <Text style={[styles.tableValue, styles.qtyCol]}>{item.qty}</Text>
                  <Text style={[styles.tableValue, styles.rateCol]}>
                    {formatPdfCurrency(item.rate)}
                  </Text>
                  <Text style={[styles.tableValue, styles.amountCol]}>
                    {formatPdfCurrency(item.amount)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={pdfStyles.muted}>Subtotal</Text>
                <Text>{formatPdfCurrency(totals.subtotal)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={pdfStyles.muted}>GST (18% included)</Text>
                <Text>{formatPdfCurrency(totals.tax)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={pdfStyles.muted}>Paid</Text>
                <Text>{formatPdfCurrency(data.invoice.paidAmount)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={pdfStyles.subheading}>Total</Text>
                <Text style={pdfStyles.subheading}>
                  {formatPdfCurrency(totals.total)}
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
                  All listed line-item rates are GST-inclusive. Late payments may
                  affect ongoing service commitments.
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

