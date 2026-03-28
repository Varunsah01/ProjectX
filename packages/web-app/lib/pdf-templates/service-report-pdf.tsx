import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  brand,
  formatPdfDate,
  formatPdfDateTime,
  formatPdfDuration,
  PdfLogoPlaceholder,
  pdfStyles,
} from "@/lib/pdf-templates/shared";

export interface ServiceReportPdfData {
  organization: {
    name: string;
    address: string;
    city: string;
    gst?: string | null;
    email: string;
    phone: string;
  };
  customer: {
    name: string;
    address: string;
    city: string;
    phone?: string | null;
    email?: string | null;
  };
  asset?: {
    name: string;
    model: string;
    serialNumber: string;
    category: string;
    location?: string | null;
  } | null;
  technician: {
    name: string;
    email: string;
    phone?: string | null;
    territory?: string | null;
    specialization?: string | null;
  };
  job: {
    jobNumber: string;
    type: string;
    scheduledDate: Date | string;
    completedAt?: Date | string | null;
    serviceReport?: string | null;
    notes?: string | null;
  };
  partsReplaced: string[];
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: brand[50],
    borderRadius: 999,
    color: brand[700],
    fontSize: 10,
    fontWeight: 700,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    maxWidth: 300,
  },
  timelineCard: {
    backgroundColor: brand[50],
    borderRadius: 14,
    display: "flex",
    flexDirection: "row",
    marginTop: 16,
    padding: 14,
  },
  timelineItem: {
    flexBasis: 0,
    flexGrow: 1,
  },
  divider: {
    backgroundColor: "#c7d2fe",
    marginHorizontal: 12,
    width: 1,
  },
  bodyText: {
    color: "#334155",
    fontSize: 10,
    lineHeight: 1.6,
  },
  partsList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  signatureBox: {
    border: "1 solid #cbd5e1",
    borderRadius: 12,
    height: 88,
    marginTop: 8,
    padding: 12,
  },
  signatureLabel: {
    color: "#94a3b8",
    fontSize: 9,
    marginTop: 48,
  },
});

export function ServiceReportPdfDocument({
  data,
}: {
  data: ServiceReportPdfData;
}) {
  const workPerformed =
    data.job.serviceReport ||
    data.job.notes ||
    "Service work details were not recorded for this job.";

  return (
    <Document
      author={data.organization.name}
      creator="Recuring"
      producer="Recuring"
      title={`Service Report ${data.job.jobNumber}`}
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

            <View style={pdfStyles.column}>
              <Text style={styles.badge}>Service Report</Text>
              <Text style={[pdfStyles.eyebrow, { marginTop: 10 }]}>Job Number</Text>
              <Text style={pdfStyles.subheading}>{data.job.jobNumber}</Text>
            </View>
          </View>

          <View style={styles.timelineCard}>
            <View style={styles.timelineItem}>
              <Text style={pdfStyles.detailLabel}>Job Date</Text>
              <Text style={pdfStyles.subheading}>
                {formatPdfDate(data.job.scheduledDate)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.timelineItem}>
              <Text style={pdfStyles.detailLabel}>Completed</Text>
              <Text style={pdfStyles.subheading}>
                {formatPdfDateTime(data.job.completedAt)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.timelineItem}>
              <Text style={pdfStyles.detailLabel}>Duration</Text>
              <Text style={pdfStyles.subheading}>
                {formatPdfDuration(data.job.scheduledDate, data.job.completedAt)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.timelineItem}>
              <Text style={pdfStyles.detailLabel}>Job Type</Text>
              <Text style={pdfStyles.subheading}>{data.job.type}</Text>
            </View>
          </View>

          <View style={[pdfStyles.grid, { marginTop: 16 }]}>
            <View style={[pdfStyles.infoCard, pdfStyles.gridCol]}>
              <Text style={pdfStyles.sectionTitle}>Customer Details</Text>
              <Text style={pdfStyles.subheading}>{data.customer.name}</Text>
              <Text style={pdfStyles.muted}>
                {data.customer.address}, {data.customer.city}
              </Text>
              <Text style={pdfStyles.muted}>
                {data.customer.phone || "-"} | {data.customer.email || "-"}
              </Text>
            </View>

            <View style={[pdfStyles.infoCard, pdfStyles.gridCol]}>
              <Text style={pdfStyles.sectionTitle}>Asset Details</Text>
              {data.asset ? (
                <>
                  <Text style={pdfStyles.subheading}>{data.asset.name}</Text>
                  <Text style={pdfStyles.muted}>
                    {data.asset.model} | {data.asset.category}
                  </Text>
                  <Text style={pdfStyles.muted}>
                    Serial: {data.asset.serialNumber}
                  </Text>
                  <Text style={pdfStyles.muted}>
                    Location: {data.asset.location || "-"}
                  </Text>
                </>
              ) : (
                <Text style={pdfStyles.muted}>No linked asset for this job.</Text>
              )}
            </View>
          </View>

          <View style={[pdfStyles.grid, { marginTop: 12 }]}>
            <View style={[pdfStyles.infoCard, pdfStyles.gridCol]}>
              <Text style={pdfStyles.sectionTitle}>Technician Details</Text>
              <Text style={pdfStyles.subheading}>{data.technician.name}</Text>
              <Text style={pdfStyles.muted}>{data.technician.email}</Text>
              <Text style={pdfStyles.muted}>
                {data.technician.phone || "-"} | {data.technician.territory || "-"}
              </Text>
              <Text style={pdfStyles.muted}>
                Specialization: {data.technician.specialization || "-"}
              </Text>
            </View>

            <View style={[pdfStyles.infoCard, pdfStyles.gridCol]}>
              <Text style={pdfStyles.sectionTitle}>Technician Notes</Text>
              <Text style={styles.bodyText}>
                {data.job.notes || "No additional technician notes were captured."}
              </Text>
            </View>
          </View>

          <View style={[pdfStyles.infoCard, { marginTop: 16 }]}>
            <Text style={pdfStyles.sectionTitle}>Work Performed</Text>
            <Text style={styles.bodyText}>{workPerformed}</Text>
          </View>

          <View style={[pdfStyles.infoCard, { marginTop: 12 }]}>
            <Text style={pdfStyles.sectionTitle}>Parts Replaced</Text>
            <View style={styles.partsList}>
              {data.partsReplaced.length > 0 ? (
                data.partsReplaced.map((part) => (
                  <Text key={part} style={styles.bodyText}>
                    - {part}
                  </Text>
                ))
              ) : (
                <Text style={styles.bodyText}>No parts replaced were recorded.</Text>
              )}
            </View>
          </View>

          <View style={[pdfStyles.infoCard, { marginTop: 12 }]}>
            <Text style={pdfStyles.sectionTitle}>Customer Signature</Text>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Sign here</Text>
            </View>
          </View>

          <Text style={pdfStyles.footer}>
            Generated by Recuring for {data.organization.name}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

