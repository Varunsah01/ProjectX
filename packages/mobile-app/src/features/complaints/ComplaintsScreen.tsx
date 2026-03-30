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
      message: "Nothing needs action right now in this list. Pull to refresh if you expect a new complaint.",
    };
  }

  if (filter === "resolved") {
    return {
      title: "No Resolved Complaints",
      message: "Resolved complaints will appear here after they are closed from the field or office.",
    };
  }

  return {
    title: "No Complaints Yet",
    message: "There are no complaints assigned to you right now. Pull to refresh or check again later.",
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
        title="Loading Complaints"
        message="Checking the latest complaints assigned to you."
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
        title="Complaints"
        subtitle="Review complaint issues assigned to you and open the one that needs action."
      />

      {showingCachedData && error ? (
        <NoticeCard
          tone="warning"
          title="Showing Saved List"
          message={error}
          actionLabel="Retry"
          onAction={() => void reload()}
        />
      ) : null}

      {!showingCachedData && error ? (
        <NoticeCard
          tone="danger"
          title="Can't Refresh Complaints"
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
            Logged: {formatDateTime(complaint.createdAt)} · Due by: {formatDateTime(complaint.slaDeadline)}
          </Text>

          <Button
            label="View Complaint"
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
