import {
  Document,
  Image,
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
import { numberToIndianWords } from "@/lib/indian-number-words";

export interface InvoicePdfData {
  organization: {
    name: string;
    address: string;
    city: string;
    gstin?: string | null;
    pan?: string | null;
    legalName?: string | null;
    email: string;
    phone: string;
    logoUrl?: string | null;
    signatureUrl?: string | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankIfsc?: string | null;
    bankBranch?: string | null;
    upiId?: string | null;
    invoiceTerms?: string | null;
  };
  customer: {
    name: string;
    address: string;
    city: string;
    gstin?: string | null;
    billingState?: string | null;
    shippingState?: string | null;
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
      taxableAmount?: number | null;
      cgstAmount?: number | null;
      sgstAmount?: number | null;
      igstAmount?: number | null;
    }>;
  };
}

const s = StyleSheet.create({
  headerRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  companyWrap: {
    display: "flex",
    flexDirection: "row",
    gap: 12,
  },
  companyDetails: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    maxWidth: 280,
  },
  headerRight: {
    alignItems: "flex-end",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  invoiceBadge: {
    backgroundColor: brand[50],
    borderRadius: 999,
    color: brand[700],
    fontSize: 10,
    fontWeight: 700,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  logo: {
    height: 44,
    maxWidth: 120,
    objectFit: "contain",
  },
  // Table
  table: {
    border: "1 solid #e2e8f0",
    borderRadius: 8,
    marginTop: 14,
    overflow: "hidden",
  },
  tHead: {
    backgroundColor: brand[50],
    borderBottom: "1 solid #e2e8f0",
    display: "flex",
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  tRow: {
    borderBottom: "1 solid #f1f5f9",
    display: "flex",
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  th: {
    color: "#475569",
    fontSize: 7,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  td: {
    color: "#0f172a",
    fontSize: 8,
  },
  tdMuted: {
    color: "#64748b",
    fontSize: 7,
  },
  // Column widths — percentages
  colSno: { flexBasis: "4%", textAlign: "center" },
  colDesc: { flexBasis: "22%", flexGrow: 1 },
  colHsn: { flexBasis: "9%" },
  colQty: { flexBasis: "6%", textAlign: "right" },
  colRate: { flexBasis: "10%", textAlign: "right" },
  colTaxable: { flexBasis: "11%", textAlign: "right" },
  colTaxRate: { flexBasis: "5%", textAlign: "right" },
  colTaxAmt: { flexBasis: "9%", textAlign: "right" },
  colTotal: { flexBasis: "11%", textAlign: "right" },
  // Summary
  summaryCard: {
    backgroundColor: "#f8fafc",
    border: "1 solid #e2e8f0",
    borderRadius: 10,
    marginLeft: "auto",
    marginTop: 14,
    padding: 12,
    width: 210,
  },
  summaryRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  totalRow: {
    borderTop: "1 solid #cbd5e1",
    marginTop: 6,
    paddingTop: 6,
  },
  // Amount in words
  wordsBox: {
    backgroundColor: brand[50],
    borderRadius: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  wordsText: {
    color: brand[900],
    fontSize: 9,
    fontWeight: 600,
  },
  // Bank / Terms
  bankRow: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  noteText: {
    color: "#334155",
    fontSize: 9,
    lineHeight: 1.5,
  },
  // Signature
  signatureBlock: {
    alignItems: "flex-end",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginTop: 20,
  },
  signatureImage: {
    height: 50,
    maxWidth: 120,
    objectFit: "contain",
  },
});

function stateLabel(code?: string | null): string {
  if (!code) return "—";
  const name = INDIAN_STATES[code];
  return name ? `${code} - ${name}` : code;
}

export function InvoicePdfDocument({ data }: { data: InvoicePdfData }) {
  const hasGstBreakdown = data.invoice.subtotalAmount != null;
  const isInterState = Boolean(data.invoice.isInterState);

  const legacyTotals = !hasGstBreakdown
    ? calculateIncludedTax(data.invoice.amount)
    : null;

  const balance = Math.max(0, data.invoice.amount - data.invoice.paidAmount);

  const hasHsnColumn = data.invoice.items.some((item) => item.hsnSac);

  const placeOfSupplyLabel = data.invoice.placeOfSupply
    ? stateLabel(data.invoice.placeOfSupply)
    : null;

  // Round-off: difference between stored total and (subtotal + tax)
  const roundOff =
    hasGstBreakdown
      ? data.invoice.amount -
        (data.invoice.subtotalAmount! + (data.invoice.totalTaxAmount ?? 0))
      : 0;

  const hasBankDetails = Boolean(
    data.organization.bankName || data.organization.bankAccountNumber,
  );

  return (
    <Document
      author={data.organization.name}
      creator="Recuring"
      producer="Recuring"
      title={`Invoice ${data.invoice.invoiceNumber}`}
    >
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.card}>
          {/* ── HEADER ── */}
          <View style={s.headerRow}>
            <View style={s.companyWrap}>
              {data.organization.logoUrl ? (
                <Image src={data.organization.logoUrl} style={s.logo} />
              ) : (
                <PdfLogoPlaceholder
                  label={data.organization.name.slice(0, 1).toUpperCase()}
                />
              )}
              <View style={s.companyDetails}>
                <Text style={pdfStyles.heading}>{data.organization.name}</Text>
                {data.organization.legalName &&
                  data.organization.legalName !== data.organization.name && (
                    <Text style={[pdfStyles.muted, { fontSize: 8 }]}>
                      {data.organization.legalName}
                    </Text>
                  )}
                <Text style={pdfStyles.muted}>
                  {data.organization.address}, {data.organization.city}
                </Text>
                <Text style={pdfStyles.muted}>
                  GSTIN: {data.organization.gstin || "—"}
                  {data.organization.pan
                    ? ` | PAN: ${data.organization.pan}`
                    : ""}
                </Text>
                <Text style={pdfStyles.muted}>
                  {data.organization.email} | {data.organization.phone}
                </Text>
              </View>
            </View>

            <View style={s.headerRight}>
              <Text style={s.invoiceBadge}>Tax Invoice</Text>
              <Text style={pdfStyles.eyebrow}>Invoice Number</Text>
              <Text style={pdfStyles.subheading}>
                {data.invoice.invoiceNumber}
              </Text>
              <Text style={[pdfStyles.muted, { fontSize: 9 }]}>
                Date: {formatPdfDate(data.invoice.issuedDate)}
              </Text>
            </View>
          </View>

          {/* ── BILL-TO / INVOICE DETAILS ── */}
          <View style={pdfStyles.grid}>
            <View style={[pdfStyles.infoCard, pdfStyles.gridCol]}>
              <Text style={pdfStyles.sectionTitle}>Bill To</Text>
              <Text style={pdfStyles.subheading}>{data.customer.name}</Text>
              <Text style={pdfStyles.muted}>
                {data.customer.address}, {data.customer.city}
              </Text>
              <Text style={pdfStyles.muted}>
                GSTIN: {data.customer.gstin || "—"}
              </Text>
              {data.customer.billingState && (
                <Text style={pdfStyles.muted}>
                  State: {stateLabel(data.customer.billingState)}
                </Text>
              )}
              <Text style={pdfStyles.muted}>
                {data.customer.email || "—"} | {data.customer.phone || "—"}
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
              {placeOfSupplyLabel && (
                <View style={pdfStyles.detailRow}>
                  <Text style={pdfStyles.detailLabel}>Place of Supply</Text>
                  <Text style={pdfStyles.detailValue}>
                    {placeOfSupplyLabel}
                  </Text>
                </View>
              )}
              <View style={pdfStyles.detailRow}>
                <Text style={pdfStyles.detailLabel}>IRN</Text>
                <Text style={pdfStyles.detailValue}>—</Text>
              </View>
              <View style={pdfStyles.detailRow}>
                <Text style={pdfStyles.detailLabel}>Amount Due</Text>
                <Text style={pdfStyles.detailValue}>
                  {formatPdfCurrency(balance)}
                </Text>
              </View>
            </View>
          </View>

          {/* ── LINE ITEMS TABLE ── */}
          <View style={s.table}>
            <View style={s.tHead}>
              <Text style={[s.th, s.colSno]}>#</Text>
              <Text style={[s.th, s.colDesc]}>Description</Text>
              {hasHsnColumn && (
                <Text style={[s.th, s.colHsn]}>HSN/SAC</Text>
              )}
              <Text style={[s.th, s.colQty]}>Qty</Text>
              <Text style={[s.th, s.colRate]}>Rate</Text>
              <Text style={[s.th, s.colTaxable]}>Taxable</Text>
              {hasGstBreakdown &&
                (isInterState ? (
                  <>
                    <Text style={[s.th, s.colTaxRate]}>IGST%</Text>
                    <Text style={[s.th, s.colTaxAmt]}>IGST</Text>
                  </>
                ) : (
                  <>
                    <Text style={[s.th, s.colTaxRate]}>CGST%</Text>
                    <Text style={[s.th, s.colTaxAmt]}>CGST</Text>
                    <Text style={[s.th, s.colTaxRate]}>SGST%</Text>
                    <Text style={[s.th, s.colTaxAmt]}>SGST</Text>
                  </>
                ))}
              <Text style={[s.th, s.colTotal]}>Total</Text>
            </View>

            {data.invoice.items.map((item, idx) => {
              const taxable = item.taxableAmount ?? item.amount;
              const gstRate = item.gstRatePercent ?? 0;
              const halfRate = gstRate / 2;
              const lineTotal = hasGstBreakdown
                ? taxable +
                  (item.cgstAmount ?? 0) +
                  (item.sgstAmount ?? 0) +
                  (item.igstAmount ?? 0)
                : item.amount;

              return (
                <View key={item.id} style={s.tRow}>
                  <Text style={[s.td, s.colSno]}>{idx + 1}</Text>
                  <Text style={[s.td, s.colDesc]}>{item.description}</Text>
                  {hasHsnColumn && (
                    <Text style={[s.td, s.colHsn]}>
                      {item.hsnSac || "—"}
                    </Text>
                  )}
                  <Text style={[s.td, s.colQty]}>{item.qty}</Text>
                  <Text style={[s.td, s.colRate]}>
                    {formatPdfCurrency(item.rate)}
                  </Text>
                  <Text style={[s.td, s.colTaxable]}>
                    {formatPdfCurrency(taxable)}
                  </Text>
                  {hasGstBreakdown &&
                    (isInterState ? (
                      <>
                        <Text style={[s.tdMuted, s.colTaxRate]}>
                          {gstRate}%
                        </Text>
                        <Text style={[s.td, s.colTaxAmt]}>
                          {formatPdfCurrency(item.igstAmount ?? 0)}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={[s.tdMuted, s.colTaxRate]}>
                          {halfRate}%
                        </Text>
                        <Text style={[s.td, s.colTaxAmt]}>
                          {formatPdfCurrency(item.cgstAmount ?? 0)}
                        </Text>
                        <Text style={[s.tdMuted, s.colTaxRate]}>
                          {halfRate}%
                        </Text>
                        <Text style={[s.td, s.colTaxAmt]}>
                          {formatPdfCurrency(item.sgstAmount ?? 0)}
                        </Text>
                      </>
                    ))}
                  <Text style={[s.td, s.colTotal]}>
                    {formatPdfCurrency(lineTotal)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* ── TAX SUMMARY ── */}
          <View style={s.summaryCard}>
            {hasGstBreakdown ? (
              <>
                <View style={s.summaryRow}>
                  <Text style={pdfStyles.muted}>Subtotal</Text>
                  <Text style={{ fontSize: 9 }}>
                    {formatPdfCurrency(data.invoice.subtotalAmount!)}
                  </Text>
                </View>
                {isInterState ? (
                  <View style={s.summaryRow}>
                    <Text style={pdfStyles.muted}>IGST</Text>
                    <Text style={{ fontSize: 9 }}>
                      {formatPdfCurrency(data.invoice.igstAmount ?? 0)}
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={s.summaryRow}>
                      <Text style={pdfStyles.muted}>CGST</Text>
                      <Text style={{ fontSize: 9 }}>
                        {formatPdfCurrency(data.invoice.cgstAmount ?? 0)}
                      </Text>
                    </View>
                    <View style={s.summaryRow}>
                      <Text style={pdfStyles.muted}>SGST</Text>
                      <Text style={{ fontSize: 9 }}>
                        {formatPdfCurrency(data.invoice.sgstAmount ?? 0)}
                      </Text>
                    </View>
                  </>
                )}
                {roundOff !== 0 && (
                  <View style={s.summaryRow}>
                    <Text style={pdfStyles.muted}>Round Off</Text>
                    <Text style={{ fontSize: 9 }}>
                      {roundOff > 0 ? "+" : ""}
                      {formatPdfCurrency(roundOff)}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={s.summaryRow}>
                  <Text style={pdfStyles.muted}>Subtotal</Text>
                  <Text style={{ fontSize: 9 }}>
                    {formatPdfCurrency(legacyTotals!.subtotal)}
                  </Text>
                </View>
                <View style={s.summaryRow}>
                  <Text style={pdfStyles.muted}>GST (18% incl.)</Text>
                  <Text style={{ fontSize: 9 }}>
                    {formatPdfCurrency(legacyTotals!.tax)}
                  </Text>
                </View>
              </>
            )}
            <View style={[s.summaryRow, s.totalRow]}>
              <Text style={pdfStyles.subheading}>Total</Text>
              <Text style={pdfStyles.subheading}>
                {formatPdfCurrency(data.invoice.amount)}
              </Text>
            </View>
            {data.invoice.paidAmount > 0 && (
              <View style={s.summaryRow}>
                <Text style={pdfStyles.muted}>Paid</Text>
                <Text style={{ fontSize: 9 }}>
                  {formatPdfCurrency(data.invoice.paidAmount)}
                </Text>
              </View>
            )}
            <View style={s.summaryRow}>
              <Text style={pdfStyles.muted}>Balance Due</Text>
              <Text style={[pdfStyles.subheading, { color: balance > 0 ? "#dc2626" : "#16a34a" }]}>
                {formatPdfCurrency(balance)}
              </Text>
            </View>
          </View>

          {/* ── AMOUNT IN WORDS ── */}
          <View style={s.wordsBox}>
            <Text style={s.wordsText}>
              {numberToIndianWords(data.invoice.amount)}
            </Text>
          </View>

          {/* ── BANK DETAILS / TERMS ── */}
          <View style={[pdfStyles.grid, { marginTop: 14 }]}>
            <View style={[pdfStyles.infoCard, pdfStyles.gridCol]}>
              <Text style={pdfStyles.sectionTitle}>Bank Details</Text>
              <View style={s.bankRow}>
                <View style={pdfStyles.detailRow}>
                  <Text style={pdfStyles.detailLabel}>Account Name</Text>
                  <Text style={pdfStyles.detailValue}>
                    {data.organization.legalName || data.organization.name}
                  </Text>
                </View>
                <View style={pdfStyles.detailRow}>
                  <Text style={pdfStyles.detailLabel}>Bank</Text>
                  <Text style={pdfStyles.detailValue}>
                    {data.organization.bankName || "—"}
                  </Text>
                </View>
                <View style={pdfStyles.detailRow}>
                  <Text style={pdfStyles.detailLabel}>Account No.</Text>
                  <Text style={pdfStyles.detailValue}>
                    {data.organization.bankAccountNumber || "—"}
                  </Text>
                </View>
                <View style={pdfStyles.detailRow}>
                  <Text style={pdfStyles.detailLabel}>IFSC</Text>
                  <Text style={pdfStyles.detailValue}>
                    {data.organization.bankIfsc || "—"}
                  </Text>
                </View>
                {data.organization.bankBranch && (
                  <View style={pdfStyles.detailRow}>
                    <Text style={pdfStyles.detailLabel}>Branch</Text>
                    <Text style={pdfStyles.detailValue}>
                      {data.organization.bankBranch}
                    </Text>
                  </View>
                )}
                {data.organization.upiId && (
                  <View style={pdfStyles.detailRow}>
                    <Text style={pdfStyles.detailLabel}>UPI</Text>
                    <Text style={pdfStyles.detailValue}>
                      {data.organization.upiId}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={[pdfStyles.infoCard, pdfStyles.gridCol]}>
              <Text style={pdfStyles.sectionTitle}>Terms & Conditions</Text>
              <Text style={s.noteText}>
                {data.organization.invoiceTerms ||
                  `Payment is due by ${formatPdfDate(data.invoice.dueDate)}. Please mention invoice number ${data.invoice.invoiceNumber} in your transfer reference.`}
              </Text>
            </View>
          </View>

          {/* ── NOTES ── */}
          {data.invoice.notes && (
            <View style={[pdfStyles.infoCard, { marginTop: 14 }]}>
              <Text style={pdfStyles.sectionTitle}>Notes</Text>
              <Text style={s.noteText}>{data.invoice.notes}</Text>
            </View>
          )}

          {/* ── SIGNATURE ── */}
          <View style={s.signatureBlock}>
            {data.organization.signatureUrl && (
              <Image
                src={data.organization.signatureUrl}
                style={s.signatureImage}
              />
            )}
            <Text style={{ fontSize: 9, color: "#475569" }}>
              Authorized Signatory
            </Text>
            <Text style={{ fontSize: 8, color: "#64748b" }}>
              For {data.organization.legalName || data.organization.name}
            </Text>
          </View>

          {/* ── FOOTER ── */}
          <Text style={pdfStyles.footer}>
            Generated by Recuring for {data.organization.name}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
