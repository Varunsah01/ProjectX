import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import { colors, radius, spacing } from "../../../constants/theme";
import { useSync } from "../../../hooks/useSync";
import type { Job } from "../../../types/domain";
import {
  type JobBoardTab,
  getEmptyStateCopy,
  getJobSummaryCounts,
  getJobsForTab,
} from "../job-board";
import JobListCard from "./JobListCard";
import JobSummaryCard from "./JobSummaryCard";

const boardTabs: Array<{ key: JobBoardTab; label: string }> = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "overdue", label: "Overdue" },
];

export default function JobBoard({
  screenLabel,
  operatorName,
  subtitle,
  jobs,
  loading,
  error,
  onRefresh,
  onOpenJob,
  secondaryActionLabel,
  onSecondaryAction,
}: {
  screenLabel: string;
  operatorName: string;
  subtitle: string;
  jobs: Job[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onOpenJob: (jobId: string) => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}) {
  const { isSyncing, pendingCount, lastSyncError } = useSync();
  const [activeTab, setActiveTab] = useState<JobBoardTab>("today");
  const screenKey = screenLabel.toLowerCase().replace(/\s+/g, "-");

  const summary = useMemo(() => getJobSummaryCounts(jobs), [jobs]);
  const visibleJobs = useMemo(() => getJobsForTab(jobs, activeTab), [activeTab, jobs]);
  const emptyState = getEmptyStateCopy(activeTab);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>{screenLabel}</Text>
          <Text style={styles.operatorName}>{operatorName}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {isSyncing || pendingCount > 0 ? (
            <View
              style={[
                styles.syncPill,
                isSyncing ? styles.syncPillActive : styles.syncPillPending,
              ]}
            >
              <Text
                style={[
                  styles.syncPillLabel,
                  isSyncing ? styles.syncPillLabelActive : styles.syncPillLabelPending,
                ]}
              >
                {isSyncing
                  ? `Syncing ${pendingCount} pending action${pendingCount === 1 ? "" : "s"}`
                  : `${pendingCount} action${pendingCount === 1 ? "" : "s"} pending sync`}
              </Text>
            </View>
          ) : null}
          {!isSyncing && lastSyncError && pendingCount > 0 ? (
            <Text style={styles.syncError}>{lastSyncError}</Text>
          ) : null}
        </View>
        {secondaryActionLabel && onSecondaryAction ? (
          <Button
            label={secondaryActionLabel}
            variant="ghost"
            onPress={onSecondaryAction}
            testID={`${screenKey}.secondary-action-button`}
          />
        ) : null}
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryRow}>
          <JobSummaryCard label="Assigned" value={String(summary.assigned)} />
          <JobSummaryCard label="In Progress" value={String(summary.inProgress)} tone="warning" />
        </View>
        <View style={styles.summaryRow}>
          <JobSummaryCard label="Completed" value={String(summary.completed)} tone="success" />
          <JobSummaryCard label="Overdue" value={String(summary.overdue)} tone="danger" />
        </View>
      </View>

      <View style={styles.tabs}>
        {boardTabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            testID={`${screenKey}.jobs-tab.${tab.key}`}
            style={({ pressed }) => [
              styles.tab,
              activeTab === tab.key && styles.tabActive,
              pressed && styles.tabPressed,
            ]}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <Card>
          <Text style={styles.errorTitle}>Unable to load assigned jobs</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Button label="Retry" onPress={onRefresh} />
        </Card>
      ) : null}

      {loading && jobs.length === 0 ? (
        <Card style={styles.loadingCard}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.loadingTitle}>Loading jobs</Text>
          <Text style={styles.loadingBody}>Pulling the latest assignments for the field queue.</Text>
        </Card>
      ) : null}

      {!loading && visibleJobs.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>{emptyState.title}</Text>
          <Text style={styles.emptyBody}>{emptyState.message}</Text>
        </Card>
      ) : null}

      {visibleJobs.map((job) => (
        <JobListCard
          key={job.id}
          job={job}
          onOpenJob={onOpenJob}
          testIdPrefix={screenKey}
        />
      ))}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  operatorName: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
  syncPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: spacing.xs,
  },
  syncPillActive: {
    backgroundColor: colors.infoSoft,
  },
  syncPillPending: {
    backgroundColor: colors.warningSoft,
  },
  syncPillLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  syncPillLabelActive: {
    color: colors.info,
  },
  syncPillLabelPending: {
    color: colors.warning,
  },
  syncError: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  summaryGrid: {
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  tabs: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  tabActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  tabPressed: {
    opacity: 0.92,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.brand,
  },
  loadingCard: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  loadingBody: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.danger,
  },
  errorBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
