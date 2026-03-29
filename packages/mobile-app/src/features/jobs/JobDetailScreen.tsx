import { useState } from "react";
import {
  Image,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatusBadge from "../../components/ui/StatusBadge";
import ScreenHeader from "../../components/shell/ScreenHeader";
import FullscreenState from "../../components/states/FullscreenState";
import { colors, spacing } from "../../constants/theme";
import { useJobDetail } from "../../hooks/useJobDetail";
import { useSync } from "../../hooks/useSync";
import { countPendingActionsForJob } from "../../services/offline-sync";
import type { JobClosureType, JobProof } from "../../types/domain";
import { formatDate, formatDateTime, titleCase } from "../../utils/format";
import { getJobServiceLabel, getJobTimeSlot } from "./job-board";

export default function JobDetailScreen({
  jobId,
  proofs,
  onBack,
  onOpenComplaint,
  onOpenUpdateStatus,
  onOpenAddNotes,
  onOpenUploadProof,
  onOpenOutcome,
}: {
  jobId: string;
  proofs: JobProof[];
  onBack: () => void;
  onOpenComplaint: (complaintId: string) => void;
  onOpenUpdateStatus: (jobId: string) => void;
  onOpenAddNotes: (jobId: string) => void;
  onOpenUploadProof: (jobId: string) => void;
  onOpenOutcome: (jobId: string, outcome: JobClosureType) => void;
}) {
  const { job, loading, error, reload } = useJobDetail(jobId);
  const { pendingActions } = useSync();
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) {
    return (
      <FullscreenState
        title="Loading job"
        message="Fetching the latest job details and workflow actions."
        loading
      />
    );
  }

  if (!job) {
    return (
      <FullscreenState
        title="Job unavailable"
        message={error ?? "The selected job could not be loaded."}
        actionLabel="Back"
        onAction={onBack}
      />
    );
  }

  const currentJob = job;
  const serviceType = getJobServiceLabel(job);
  const scheduledTime = getJobTimeSlot(job);
  const issueSummary =
    job.complaint?.description ??
    job.complaint?.subject ??
    job.notes ??
    "No issue summary available for this job.";
  const internalNotes = job.notes ?? "No internal notes added yet.";
  const priorityValue = job.complaint?.priority ?? "standard";
  const displayStatus = job.operatorStatus ?? job.status;
  const canUpdateStatus = job.status !== "completed" && job.status !== "cancelled";
  const canCompleteJob = job.status === "in_progress";
  const canCloseJob = job.status !== "completed" && job.status !== "cancelled";
  const pendingActionCount = countPendingActionsForJob(job.id, pendingActions);

  async function openExternal(url: string, fallbackError: string) {
    setActionError(null);

    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        setActionError(fallbackError);
        return;
      }

      await Linking.openURL(url);
    } catch {
      setActionError(fallbackError);
    }
  }

  async function handleCallCustomer() {
    if (!currentJob.customer.phone) {
      setActionError("Customer phone number is not available for this job.");
      return;
    }

    await openExternal(
      `tel:${currentJob.customer.phone}`,
      "Unable to open the phone dialer on this device.",
    );
  }

  async function handleOpenInMaps() {
    if (!currentJob.customer.address) {
      setActionError("Customer address is not available for this job.");
      return;
    }

    const query = encodeURIComponent(currentJob.customer.address);
    const mapsUrl =
      Platform.OS === "android"
        ? `geo:0,0?q=${query}`
        : `https://www.google.com/maps/search/?api=1&query=${query}`;

    await openExternal(mapsUrl, "Unable to open maps for this address.");
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void reload()} />}
    >
      <ScreenHeader
        title="Job Detail"
        subtitle={`${job.jobNumber} · ${formatDate(job.scheduledDate)}`}
        backLabel="Back to Jobs"
        onBack={onBack}
      />

      <Card>
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.customerName}>{job.customer.name}</Text>
            <Text style={styles.heroMeta}>
              {serviceType} · {scheduledTime}
            </Text>
          </View>
          <View style={styles.heroBadges}>
            <StatusBadge value={displayStatus} />
            <StatusBadge value={priorityValue} />
          </View>
        </View>

        <DetailLine label="Phone" value={job.customer.phone ?? "Not available"} />
        <DetailLine label="Address" value={job.customer.address} />
        <DetailLine label="Service Type" value={serviceType} />
        <DetailLine
          label="Scheduled Time"
          value={`${formatDate(job.scheduledDate)} · ${scheduledTime}`}
        />
        <DetailLine label="Priority" value={titleCase(priorityValue)} />
        <DetailLine label="Status" value={titleCase(displayStatus)} />
      </Card>

      {pendingActionCount > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>Pending Sync</Text>
          <Text style={styles.bodyText}>
            {pendingActionCount} field update{pendingActionCount === 1 ? "" : "s"} for this job
            {" "}are saved on device and waiting to sync.
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Issue Summary</Text>
        <Text style={styles.bodyText}>{issueSummary}</Text>
        {job.complaint ? (
          <Button
            label="Open Complaint"
            variant="ghost"
            onPress={() => onOpenComplaint(job.complaint!.id)}
          />
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Internal Notes</Text>
        <Text style={styles.bodyText}>{internalNotes}</Text>
        {job.serviceReport ? (
          <View style={styles.savedNoteBlock}>
            <Text style={styles.savedNoteLabel}>Technician Notes</Text>
            <Text style={styles.bodyText}>{job.serviceReport}</Text>
          </View>
        ) : null}
      </Card>

      {job.asset ? (
        <Card>
          <Text style={styles.sectionTitle}>Asset Details</Text>
          <DetailLine label="Asset" value={job.asset.name} />
          {job.asset.model ? <DetailLine label="Model" value={job.asset.model} /> : null}
          {job.asset.serialNumber ? (
            <DetailLine label="Serial Number" value={job.asset.serialNumber} />
          ) : null}
          {job.asset.category ? <DetailLine label="Category" value={job.asset.category} /> : null}
          {job.asset.status ? <DetailLine label="Asset Status" value={titleCase(job.asset.status)} /> : null}
          {job.asset.location ? <DetailLine label="Location" value={job.asset.location} /> : null}
          {job.asset.notes ? <DetailLine label="Asset Notes" value={job.asset.notes} /> : null}
        </Card>
      ) : null}

      {proofs.length > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>Uploaded Proof</Text>
          {proofs.map((proof) => (
            <View key={proof.id} style={styles.proofRow}>
              {proof.uri ? <Image source={{ uri: proof.uri }} style={styles.proofImage} /> : null}
              <Text style={styles.bodyText}>{proof.label}</Text>
              <Text style={styles.metaText}>
                {titleCase(proof.type)} · {formatDateTime(proof.createdAt)}
                {proof.syncState === "pending" ? " · Pending sync" : ""}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionRow}>
          <Button
            label="Call Customer"
            variant="secondary"
            onPress={() => void handleCallCustomer()}
            disabled={!job.customer.phone}
            style={styles.actionButton}
          />
          <Button
            label="Open in Maps"
            variant="ghost"
            onPress={() => void handleOpenInMaps()}
            disabled={!job.customer.address}
            style={styles.actionButton}
          />
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Job Actions</Text>
        <View style={styles.actionRow}>
          <Button
            label="Update Status"
            onPress={() => onOpenUpdateStatus(job.id)}
            disabled={!canUpdateStatus}
            style={styles.actionButton}
          />
          <Button
            label="Add Notes"
            variant="secondary"
            onPress={() => onOpenAddNotes(job.id)}
            style={styles.actionButton}
          />
        </View>
        <View style={styles.actionRow}>
          <Button
            label="Upload Proof"
            variant="ghost"
            onPress={() => onOpenUploadProof(job.id)}
            style={styles.actionButton}
          />
          <Button
            label="Close Job"
            onPress={() => onOpenOutcome(job.id, "complete")}
            disabled={!canCompleteJob}
            style={styles.actionButton}
          />
        </View>
        {canCloseJob && !canCompleteJob ? (
          <Text style={styles.helperText}>
            Move the job to In Progress before closing it.
          </Text>
        ) : null}
      </Card>

      {canCloseJob ? (
        <Card>
          <Text style={styles.sectionTitle}>Other Outcomes</Text>
          <View style={styles.actionRow}>
            <Button
              label="Reschedule"
              variant="secondary"
              onPress={() => onOpenOutcome(job.id, "reschedule")}
              style={styles.actionButton}
            />
            <Button
              label="Fail Visit"
              variant="danger"
              onPress={() => onOpenOutcome(job.id, "fail")}
              style={styles.actionButton}
            />
          </View>
        </Card>
      ) : null}

      {job.completedAt ? (
        <Card>
          <Text style={styles.sectionTitle}>Completion</Text>
          <Text style={styles.metaText}>Completed: {formatDateTime(job.completedAt)}</Text>
        </Card>
      ) : null}

      {actionError || error ? (
        <Card>
          <Text style={styles.errorText}>{actionError ?? error}</Text>
          <Button label="Retry" onPress={() => void reload()} />
        </Card>
      ) : null}
    </ScrollView>
  );
}

function DetailLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  customerName: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
  },
  heroMeta: {
    fontSize: 14,
    color: colors.textMuted,
  },
  heroBadges: {
    gap: spacing.sm,
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  detailLine: {
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  savedNoteBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  savedNoteLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  proofRow: {
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  proofImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.danger,
  },
});
