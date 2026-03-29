import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect, useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import StatusBadge from "../../components/ui/StatusBadge";
import { colors, spacing } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import type { ComplaintSummary, ListResponse } from "../../types/api";
import { formatDateTime } from "../../utils/format";
import { getErrorMessage } from "../../services/api";

type FilterKey = "all" | "open" | "resolved";

export default function ComplaintsScreen({
  onOpenComplaint,
}: {
  onOpenComplaint: (complaintId: string) => void;
}) {
  const { request } = useAuth();
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadComplaints = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await request<ListResponse<ComplaintSummary>>("/complaints");
      setComplaints(response.data);
    } catch (complaintsError) {
      setError(getErrorMessage(complaintsError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadComplaints();
  }, [request]);

  const filteredComplaints = useMemo(() => {
    if (filter === "open") {
      return complaints.filter(
        (complaint) => complaint.status !== "resolved" && complaint.status !== "closed",
      );
    }

    if (filter === "resolved") {
      return complaints.filter(
        (complaint) => complaint.status === "resolved" || complaint.status === "closed",
      );
    }

    return complaints;
  }, [complaints, filter]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={() => void loadComplaints()} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Assigned Complaints</Text>
        <Text style={styles.subtitle}>Track SLA-driven service issues from the field.</Text>
      </View>

      <View style={styles.filters}>
        {(["all", "open", "resolved"] as const).map((value) => (
          <Button
            key={value}
            label={value === "all" ? "All" : value === "open" ? "Open" : "Resolved"}
            variant={filter === value ? "primary" : "ghost"}
            onPress={() => setFilter(value)}
            style={styles.filterButton}
          />
        ))}
      </View>

      {error ? (
        <Card>
          <Text style={styles.errorTitle}>Unable to load complaints</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Button label="Retry" onPress={() => void loadComplaints()} />
        </Card>
      ) : null}

      {filteredComplaints.map((complaint) => (
        <Card key={complaint.id}>
          <View style={styles.row}>
            <View style={styles.copy}>
              <Text style={styles.subject}>{complaint.subject}</Text>
              <Text style={styles.meta}>
                {complaint.customerName} · {complaint.ticketNumber}
              </Text>
            </View>
            <StatusBadge value={complaint.priority} />
          </View>

          <View style={styles.badges}>
            <StatusBadge value={complaint.status} />
            {complaint.assetName ? <Text style={styles.assetName}>{complaint.assetName}</Text> : null}
          </View>

          <Text style={styles.description} numberOfLines={3}>
            {complaint.description}
          </Text>
          <Text style={styles.meta}>Logged: {formatDateTime(complaint.createdAt)}</Text>

          <Button
            label="Open Complaint"
            variant="secondary"
            onPress={() => onOpenComplaint(complaint.id)}
          />
        </Card>
      ))}

      {!loading && filteredComplaints.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>No complaints in this view</Text>
          <Text style={styles.emptyBody}>
            Pull down to refresh or switch filters to inspect older items.
          </Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  filters: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  subject: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
  },
  assetName: {
    fontSize: 13,
    color: colors.textMuted,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.danger,
  },
  errorBody: {
    fontSize: 14,
    color: colors.textMuted,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
