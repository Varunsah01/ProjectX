import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import NoticeCard from "../../components/ui/NoticeCard";
import StatusBadge from "../../components/ui/StatusBadge";
import ScreenHeader from "../../components/shell/ScreenHeader";
import FullscreenState from "../../components/states/FullscreenState";
import { colors, spacing } from "../../constants/theme";
import { useComplaintsFeed } from "../../hooks/useComplaintsFeed";
import { formatDateTime } from "../../utils/format";

type FilterKey = "all" | "open" | "resolved";

function getEmptyStateCopy(filter: FilterKey) {
  if (filter === "open") {
    return {
      title: "No Open Complaints",
      message: "There are no open or active complaints in the current list.",
    };
  }

  if (filter === "resolved") {
    return {
      title: "No Resolved Complaints",
      message: "Resolved or closed complaints will appear here after they are completed.",
    };
  }

  return {
    title: "No Assigned Complaints",
    message: "Pull to refresh when the connection improves to check for new complaint assignments.",
  };
}

export default function ComplaintsScreen({
  onOpenComplaint,
}: {
  onOpenComplaint: (complaintId: string) => void;
}) {
  const { complaints, loading, error, reload, showingCachedData } = useComplaintsFeed();
  const [filter, setFilter] = useState<FilterKey>("all");

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

  if (loading && complaints.length === 0) {
    return (
      <FullscreenState
        title="Loading complaints"
        message="Checking the latest assigned complaints and SLA-driven field issues."
        loading
      />
    );
  }

  const emptyState = getEmptyStateCopy(filter);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} />}
    >
      <ScreenHeader
        title="Assigned Complaints"
        subtitle="Track SLA-driven service issues from the field without leaving the mobile workflow."
      />

      {showingCachedData && error ? (
        <NoticeCard
          tone="warning"
          title="Showing Saved Complaint Data"
          message={error}
          actionLabel="Retry"
          onAction={() => void reload()}
        />
      ) : null}

      {!showingCachedData && error ? (
        <NoticeCard
          tone="danger"
          title="Unable to Load Complaints"
          message={error}
          actionLabel="Retry"
          onAction={() => void reload()}
        />
      ) : null}

      <View style={styles.filters}>
        {(["all", "open", "resolved"] as const).map((value) => (
          <Button
            key={value}
            label={value === "all" ? "All" : value === "open" ? "Open" : "Resolved"}
            variant={filter === value ? "primary" : "ghost"}
            onPress={() => setFilter(value)}
            disabled={loading}
            style={styles.filterButton}
          />
        ))}
      </View>

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
          <Text style={styles.meta}>
            Logged: {formatDateTime(complaint.createdAt)} · SLA: {formatDateTime(complaint.slaDeadline)}
          </Text>

          <Button
            label="Open Complaint"
            variant="secondary"
            onPress={() => onOpenComplaint(complaint.id)}
            disabled={loading}
          />
        </Card>
      ))}

      {!loading && filteredComplaints.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>{emptyState.title}</Text>
          <Text style={styles.emptyBody}>{emptyState.message}</Text>
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
    lineHeight: 19,
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
});
