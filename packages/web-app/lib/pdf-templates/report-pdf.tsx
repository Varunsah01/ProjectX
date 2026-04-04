import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReportsOverview } from "@/lib/types";
import {
  brand,
  formatPdfCurrency,
  formatPdfDate,
  PdfLogoPlaceholder,
  pdfStyles,
} from "@/lib/pdf-templates/shared";

const styles = StyleSheet.create({
  sectionBadge: {
    backgroundColor: brand[50],
    borderRadius: 999,
    color: brand[700],
    fontSize: 9,
    fontWeight: 700,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  metricsGrid: {
    display: "flex",
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  metricCard: {
    backgroundColor: "#ffffff",
    border: "1 solid #e2e8f0",
    borderRadius: 10,
    padding: 10,
    flex: 1,
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 7,
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  metricValue: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 700,
  },
  table: {
    border: "1 solid #e2e8f0",
    borderRadius: 8,
    marginBottom: 14,
    overflow: "hidden",
  },
  tableHeader: {
    backgroundColor: brand[50],
    display: "flex",
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottom: "1 solid #e2e8f0",
  },
  tableRow: {
    display: "flex",
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottom: "1 solid #f1f5f9",
  },
  tableLabel: {
    color: "#475569",
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  tableCell: {
    color: "#0f172a",
    fontSize: 9,
  },
  valueCard: {
    backgroundColor: "#ffffff",
    border: "1 solid #e2e8f0",
    borderRadius: 10,
    padding: 14,
    flex: 1,
  },
});

function ReportPageHeader({
  orgName,
  section,
  dateRange,
}: {
  orgName: string;
  section: string;
  dateRange: string;
}) {
  return (
    <View style={[pdfStyles.card, { marginBottom: 14 }]}>
      <View style={pdfStyles.rowBetween}>
        <View style={pdfStyles.row}>
          <PdfLogoPlaceholder label={orgName.slice(0, 1).toUpperCase()} />
          <View style={{ marginLeft: 12, display: "flex", flexDirection: "column", gap: 3 }}>
            <Text style={pdfStyles.heading}>{orgName}</Text>
            <Text style={pdfStyles.muted}>Reports & Analytics</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end", display: "flex", flexDirection: "column", gap: 4 }}>
          <Text style={styles.sectionBadge}>{section}</Text>
          <Text style={pdfStyles.muted}>{dateRange}</Text>
        </View>
      </View>
    </View>
  );
}

function OverviewPage({
  data,
  orgName,
  dateRange,
}: {
  data: ReportsOverview;
  orgName: string;
  dateRange: string;
}) {
  return (
    <Page size="A4" style={pdfStyles.page}>
      <ReportPageHeader orgName={orgName} section="Overview" dateRange={dateRange} />

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Revenue</Text>
          <Text style={styles.metricValue}>{formatPdfCurrency(data.totalRevenue)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Collected</Text>
          <Text style={styles.metricValue}>{formatPdfCurrency(data.totalCollected)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Collection Rate</Text>
          <Text style={styles.metricValue}>{data.collectionRate}%</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Active Contracts</Text>
          <Text style={styles.metricValue}>{data.activeContractsCount}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Avg Resolution</Text>
          <Text style={styles.metricValue}>{data.avgResolutionHours}h</Text>
        </View>
      </View>

      <Text style={pdfStyles.sectionTitle}>Top Customers by Revenue</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableLabel, { flex: 3 }]}>Customer</Text>
          <Text style={[styles.tableLabel, { flex: 2, textAlign: "right" }]}>Paid</Text>
          <Text style={[styles.tableLabel, { flex: 2, textAlign: "right" }]}>Outstanding</Text>
          <Text style={[styles.tableLabel, { flex: 1, textAlign: "right" }]}>Assets</Text>
        </View>
        {data.topCustomers.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, pdfStyles.muted]}>No data available</Text>
          </View>
        ) : (
          data.topCustomers.map((c) => (
            <View key={c.name} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 3 }]}>{c.name}</Text>
              <Text style={[styles.tableCell, { flex: 2, textAlign: "right" }]}>
                {formatPdfCurrency(c.totalPaid)}
              </Text>
              <Text style={[styles.tableCell, { flex: 2, textAlign: "right" }]}>
                {formatPdfCurrency(c.outstanding)}
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                {c.assetsCount}
              </Text>
            </View>
          ))
        )}
      </View>

      <Text style={pdfStyles.sectionTitle}>Contract Status</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableLabel, { flex: 3 }]}>Status</Text>
          <Text style={[styles.tableLabel, { flex: 1, textAlign: "right" }]}>Count</Text>
        </View>
        {(
          [
            { key: "active", label: "Active" },
            { key: "expiring_soon", label: "Expiring Soon" },
            { key: "expired", label: "Expired" },
            { key: "renewed", label: "Renewed" },
          ] as const
        ).map((s) => (
          <View key={s.key} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 3 }]}>{s.label}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
              {data.contractStatusCounts[s.key] ?? 0}
            </Text>
          </View>
        ))}
      </View>

      <Text style={pdfStyles.footer}>Generated by Recuring · {dateRange}</Text>
    </Page>
  );
}

function CollectionsPage({
  data,
  orgName,
  dateRange,
}: {
  data: ReportsOverview;
  orgName: string;
  dateRange: string;
}) {
  return (
    <Page size="A4" style={pdfStyles.page}>
      <ReportPageHeader orgName={orgName} section="Collections" dateRange={dateRange} />

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Outstanding</Text>
          <Text style={styles.metricValue}>{formatPdfCurrency(data.totalOutstanding)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Overdue Amount</Text>
          <Text style={styles.metricValue}>{formatPdfCurrency(data.overdueAmount)}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Avg Days Overdue</Text>
          <Text style={styles.metricValue}>{data.avgDaysOverdue} days</Text>
        </View>
      </View>

      <Text style={pdfStyles.sectionTitle}>Aging Breakdown</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableLabel, { flex: 3 }]}>Period</Text>
          <Text style={[styles.tableLabel, { flex: 1, textAlign: "right" }]}>Invoices</Text>
          <Text style={[styles.tableLabel, { flex: 2, textAlign: "right" }]}>Amount</Text>
        </View>
        {(
          [
            { key: "not_due", label: "Not Due" },
            { key: "0_30", label: "0–30 Days" },
            { key: "30_60", label: "30–60 Days" },
            { key: "60_90", label: "60–90 Days" },
            { key: "90_plus", label: "90+ Days" },
          ] as const
        ).map((b) => {
          const item = data.agingBuckets[b.key] ?? { count: 0, amount: 0 };
          return (
            <View key={b.key} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 3 }]}>{b.label}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                {item.count}
              </Text>
              <Text style={[styles.tableCell, { flex: 2, textAlign: "right" }]}>
                {formatPdfCurrency(item.amount)}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={pdfStyles.footer}>Generated by Recuring · {dateRange}</Text>
    </Page>
  );
}

function ServicePage({
  data,
  orgName,
  dateRange,
}: {
  data: ReportsOverview;
  orgName: string;
  dateRange: string;
}) {
  return (
    <Page size="A4" style={pdfStyles.page}>
      <ReportPageHeader orgName={orgName} section="Service" dateRange={dateRange} />

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Total Jobs</Text>
          <Text style={styles.metricValue}>{data.totalJobs}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Completed</Text>
          <Text style={styles.metricValue}>{data.completedJobs}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Completion Rate</Text>
          <Text style={styles.metricValue}>{data.completedRate}%</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Open Complaints</Text>
          <Text style={styles.metricValue}>{data.openComplaints}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Resolved</Text>
          <Text style={styles.metricValue}>{data.resolvedComplaints}</Text>
        </View>
      </View>

      <View style={{ display: "flex", flexDirection: "row", gap: 10, marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={pdfStyles.sectionTitle}>Jobs by Type</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableLabel, { flex: 3 }]}>Type</Text>
              <Text style={[styles.tableLabel, { flex: 1, textAlign: "right" }]}>Count</Text>
            </View>
            {(
              [
                { key: "complaint", label: "Complaint" },
                { key: "scheduled", label: "Scheduled" },
                { key: "installation", label: "Installation" },
                { key: "inspection", label: "Inspection" },
              ] as const
            ).map((t) => (
              <View key={t.key} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 3 }]}>{t.label}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                  {data.jobsByType[t.key] ?? 0}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={pdfStyles.sectionTitle}>Complaint Status</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableLabel, { flex: 3 }]}>Status</Text>
              <Text style={[styles.tableLabel, { flex: 1, textAlign: "right" }]}>Count</Text>
            </View>
            {[
              { label: "Open", value: data.openComplaints },
              { label: "In Progress", value: data.inProgressComplaints },
              { label: "Resolved", value: data.resolvedComplaints },
            ].map((s) => (
              <View key={s.label} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 3 }]}>{s.label}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                  {s.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <Text style={pdfStyles.sectionTitle}>Technician Performance</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableLabel, { flex: 3 }]}>Name</Text>
          <Text style={[styles.tableLabel, { flex: 2 }]}>Specialization</Text>
          <Text style={[styles.tableLabel, { flex: 1, textAlign: "right" }]}>Completed</Text>
          <Text style={[styles.tableLabel, { flex: 1, textAlign: "right" }]}>Active</Text>
          <Text style={[styles.tableLabel, { flex: 1, textAlign: "right" }]}>Rating</Text>
        </View>
        {data.techPerformance.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, pdfStyles.muted]}>No data available</Text>
          </View>
        ) : (
          data.techPerformance.map((tech) => (
            <View key={tech.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 3 }]}>{tech.name}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{tech.specialization || "—"}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                {tech.completedJobs}
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                {tech.activeJobs}
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                {tech.rating}
              </Text>
            </View>
          ))
        )}
      </View>

      <Text style={pdfStyles.footer}>Generated by Recuring · {dateRange}</Text>
    </Page>
  );
}

function ContractsPage({
  data,
  orgName,
  dateRange,
}: {
  data: ReportsOverview;
  orgName: string;
  dateRange: string;
}) {
  return (
    <Page size="A4" style={pdfStyles.page}>
      <ReportPageHeader orgName={orgName} section="Contracts" dateRange={dateRange} />

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Active</Text>
          <Text style={styles.metricValue}>{data.activeContractsCount}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Expiring in 30d</Text>
          <Text style={styles.metricValue}>{data.expiringIn30}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Expired</Text>
          <Text style={styles.metricValue}>{data.expiredContracts}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Renewed</Text>
          <Text style={styles.metricValue}>{data.renewedContracts}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Renewal Rate</Text>
          <Text style={styles.metricValue}>{data.renewalRate}%</Text>
        </View>
      </View>

      <View style={{ display: "flex", flexDirection: "row", gap: 10, marginBottom: 14 }}>
        <View style={styles.valueCard}>
          <Text style={pdfStyles.sectionTitle}>Total AMC Value</Text>
          <Text style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
            {formatPdfCurrency(data.totalAmcValue)}
          </Text>
        </View>
        <View style={styles.valueCard}>
          <Text style={pdfStyles.sectionTitle}>Total Warranty Value</Text>
          <Text style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
            {formatPdfCurrency(data.totalWarrantyValue)}
          </Text>
        </View>
      </View>

      <Text style={pdfStyles.sectionTitle}>Renewal Pipeline</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableLabel, { flex: 3 }]}>Customer</Text>
          <Text style={[styles.tableLabel, { flex: 2 }]}>Asset</Text>
          <Text style={[styles.tableLabel, { flex: 2 }]}>Status</Text>
          <Text style={[styles.tableLabel, { flex: 2, textAlign: "right" }]}>Expires</Text>
          <Text style={[styles.tableLabel, { flex: 2, textAlign: "right" }]}>Value</Text>
        </View>
        {data.renewalPipeline.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, pdfStyles.muted]}>No contracts pending renewal</Text>
          </View>
        ) : (
          data.renewalPipeline.slice(0, 10).map((c) => (
            <View key={c.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 3 }]}>{c.customerName}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{c.assetName}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{c.status}</Text>
              <Text style={[styles.tableCell, { flex: 2, textAlign: "right" }]}>
                {formatPdfDate(c.endDate)}
              </Text>
              <Text style={[styles.tableCell, { flex: 2, textAlign: "right" }]}>
                {formatPdfCurrency(c.value)}
              </Text>
            </View>
          ))
        )}
      </View>

      {data.highUtilizationContracts.length > 0 && (
        <>
          <Text style={pdfStyles.sectionTitle}>High Utilization Contracts (&gt;80% visits)</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableLabel, { flex: 3 }]}>Customer</Text>
              <Text style={[styles.tableLabel, { flex: 2 }]}>Asset</Text>
              <Text style={[styles.tableLabel, { flex: 2, textAlign: "right" }]}>Visits Used</Text>
              <Text style={[styles.tableLabel, { flex: 2, textAlign: "right" }]}>Covered</Text>
              <Text style={[styles.tableLabel, { flex: 1, textAlign: "right" }]}>%</Text>
            </View>
            {data.highUtilizationContracts.map((c) => {
              const pct =
                c.visitsCovered > 0
                  ? Math.round((c.visitsUsed / c.visitsCovered) * 100)
                  : 0;
              return (
                <View key={c.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 3 }]}>{c.customerName}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{c.assetName}</Text>
                  <Text style={[styles.tableCell, { flex: 2, textAlign: "right" }]}>
                    {c.visitsUsed}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 2, textAlign: "right" }]}>
                    {c.visitsCovered}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                    {pct}%
                  </Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      <Text style={pdfStyles.footer}>Generated by Recuring · {dateRange}</Text>
    </Page>
  );
}

export interface ReportPdfData {
  reports: ReportsOverview;
  orgName: string;
  dateRange: string;
}

export function ReportPdfDocument({ data }: { data: ReportPdfData }) {
  return (
    <Document
      author={data.orgName}
      creator="Recuring"
      producer="Recuring"
      title={`Reports & Analytics – ${data.dateRange}`}
    >
      <OverviewPage data={data.reports} orgName={data.orgName} dateRange={data.dateRange} />
      <CollectionsPage data={data.reports} orgName={data.orgName} dateRange={data.dateRange} />
      <ServicePage data={data.reports} orgName={data.orgName} dateRange={data.dateRange} />
      <ContractsPage data={data.reports} orgName={data.orgName} dateRange={data.dateRange} />
    </Document>
  );
}
