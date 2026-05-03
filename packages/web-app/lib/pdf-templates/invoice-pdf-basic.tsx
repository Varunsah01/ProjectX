/**
 * Basic invoice PDF fallback — no GST breakdown.
 *
 * Used when the `invoices.gst-pdf-template` feature flag is OFF, allowing
 * a safe roll-back without redeployment.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  brand,
  pdfStyles,
  formatPdfCurrency,
  formatPdfDate,
} from "@/lib/pdf-templates/shared";
import type { InvoicePdfData } from "@/lib/pdf-templates/invoice-pdf";

function paiseToRupeesNum(paise: number): number {
  return paise / 100;
}

const s = StyleSheet.create({
  titleRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 20,
  },
  title: {
    color: brand[900],
    fontSize: 22,
    fontWeight: 700,
  },
  invNum: {
    color: brand[600],
    fontSize: 12,
    fontWeight: 700,
  },
  sectionHeader: {
    color: "#64748b",
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  partyBox: {
    flexGrow: 1,
    flexBasis: 0,
    backgroundColor: "#ffffff",
    border: "1 solid #e2e8f0",
    borderRadius: 10,
    padding: 12,
  },
  partyName: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 2,
  },
  partyDetail: {
    color: "#64748b",
    fontSize: 9,
  },
  tableHeader: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: brand[50],
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 16,
    marginBottom: 4,
  },
  tableRow: {
    display: "flex",
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottom: "1 solid #f1f5f9",
  },
  colDesc: { flex: 4, fontSize: 9, color: "#374151" },
  colQty: { flex: 1, fontSize: 9, textAlign: "right", color: "#374151" },
  colRate: { flex: 2, fontSize: 9, textAlign: "right", color: "#374151" },
  colAmt: { flex: 2, fontSize: 9, textAlign: "right", color: "#374151" },
  colHeaderText: { fontSize: 8, fontWeight: 700, color: "#475569", textTransform: "uppercase" },
  totalRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 8,
    paddingTop: 10,
    gap: 16,
  },
  totalLabel: { fontSize: 11, fontWeight: 700, color: "#0f172a" },
  totalValue: { fontSize: 11, fontWeight: 700, color: brand[700] },
  metaRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  metaBox: {
    backgroundColor: "#f8fafc",
    border: "1 solid #e2e8f0",
    borderRadius: 8,
    padding: 10,
    flexGrow: 1,
    flexBasis: 0,
    marginHorizontal: 4,
  },
  metaLabel: { fontSize: 8, color: "#64748b", fontWeight: 700, textTransform: "uppercase" },
  metaValue: { fontSize: 10, color: "#0f172a", fontWeight: 600, marginTop: 2 },
});

function BasicInvoiceDocument({ data }: { data: InvoicePdfData }) {
  const { organization, customer, invoice } = data;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Title */}
        <View style={s.titleRow}>
          <Text style={s.title}>{organization.name}</Text>
          <View>
            <Text style={s.invNum}>{invoice.invoiceNumber}</Text>
            <Text style={{ fontSize: 9, color: "#64748b", textAlign: "right" }}>
              {formatPdfDate(invoice.issuedDate)}
            </Text>
          </View>
        </View>

        {/* Parties */}
        <View style={{ display: "flex", flexDirection: "row", gap: 12 }}>
          <View style={s.partyBox}>
            <Text style={s.sectionHeader}>From</Text>
            <Text style={s.partyName}>{organization.legalName ?? organization.name}</Text>
            <Text style={s.partyDetail}>{organization.address}, {organization.city}</Text>
            {organization.gstin ? (
              <Text style={s.partyDetail}>GSTIN: {organization.gstin}</Text>
            ) : null}
            <Text style={s.partyDetail}>{organization.phone} · {organization.email}</Text>
          </View>
          <View style={s.partyBox}>
            <Text style={s.sectionHeader}>Bill To</Text>
            <Text style={s.partyName}>{customer.name}</Text>
            <Text style={s.partyDetail}>{customer.address}, {customer.city}</Text>
            {customer.gstin ? (
              <Text style={s.partyDetail}>GSTIN: {customer.gstin}</Text>
            ) : null}
            {customer.phone ? (
              <Text style={s.partyDetail}>{customer.phone}</Text>
            ) : null}
          </View>
        </View>

        {/* Dates meta */}
        <View style={s.metaRow}>
          <View style={[s.metaBox, { marginLeft: 0 }]}>
            <Text style={s.metaLabel}>Issue Date</Text>
            <Text style={s.metaValue}>{formatPdfDate(invoice.issuedDate)}</Text>
          </View>
          <View style={s.metaBox}>
            <Text style={s.metaLabel}>Due Date</Text>
            <Text style={s.metaValue}>{formatPdfDate(invoice.dueDate)}</Text>
          </View>
          <View style={[s.metaBox, { marginRight: 0 }]}>
            <Text style={s.metaLabel}>Status</Text>
            <Text style={s.metaValue}>
              {invoice.paidAmount >= invoice.amount ? "Paid" : "Unpaid"}
            </Text>
          </View>
        </View>

        {/* Line items */}
        <View style={s.tableHeader}>
          <Text style={[s.colDesc, s.colHeaderText]}>Description</Text>
          <Text style={[s.colQty, s.colHeaderText]}>Qty</Text>
          <Text style={[s.colRate, s.colHeaderText]}>Rate</Text>
          <Text style={[s.colAmt, s.colHeaderText]}>Amount</Text>
        </View>
        {invoice.items.map((item, i) => (
          <View key={item.id ?? i} style={s.tableRow}>
            <Text style={s.colDesc}>{item.description}</Text>
            <Text style={s.colQty}>{item.qty}</Text>
            <Text style={s.colRate}>{formatPdfCurrency(paiseToRupeesNum(item.rate))}</Text>
            <Text style={s.colAmt}>{formatPdfCurrency(paiseToRupeesNum(item.amount))}</Text>
          </View>
        ))}

        {/* Total */}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalValue}>
            {formatPdfCurrency(paiseToRupeesNum(invoice.amount))}
          </Text>
        </View>

        {/* Notes */}
        {invoice.notes ? (
          <View style={{ marginTop: 16, padding: 10, backgroundColor: "#f8fafc", borderRadius: 8 }}>
            <Text style={{ fontSize: 9, color: "#64748b" }}>{invoice.notes}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <Text style={pdfStyles.footer}>
          {organization.name} · {organization.email} · {organization.phone}
        </Text>
      </Page>
    </Document>
  );
}

/**
 * Renders a simplified invoice PDF without GST breakdown.
 * Use as the fallback when the `invoices.gst-pdf-template` flag is OFF.
 */
export async function renderBasicInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return renderToBuffer(<BasicInvoiceDocument data={data} />);
}
