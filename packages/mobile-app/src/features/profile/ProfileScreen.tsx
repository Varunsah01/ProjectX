import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { APP_ANDROID_PACKAGE_ID, APP_VERSION } from "../../constants/branding";
import { colors, spacing } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import { getApiDiagnostics } from "../../services/api";
import { isInternalDiagnosticsEnabled } from "../../services/test-logger";
import { titleCase } from "../../utils/format";

export default function ProfileScreen({
  onOpenDeviceCheck,
  onOpenDiagnostics,
}: {
  onOpenDeviceCheck: () => void;
  onOpenDiagnostics: () => void;
}) {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const internalDiagnosticsEnabled = isInternalDiagnosticsEnabled();
  const [, setVersionTapCount] = useState(0);
  const apiDiagnostics = getApiDiagnostics();
  const buildProfileLabel = apiDiagnostics.buildProfile
    ? apiDiagnostics.buildProfile
    : apiDiagnostics.buildIntent === "development"
      ? "Local dev build"
      : "Not shown";
  const backendTargetLabel = apiDiagnostics.baseUrl ?? "Not set";
  const testerBuildMessage = apiDiagnostics.baseUrl
    ? apiDiagnostics.mode === "android-emulator-fallback"
      ? "This build points to the Android emulator server. Do not use it on a physical phone."
      : "Before you start, make sure the version and server below match the build your lead asked you to use."
    : "This build is missing its server setup. Stop here and ask for the correct build.";

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  function handleVersionPress() {
    if (!internalDiagnosticsEnabled) {
      return;
    }

    setVersionTapCount((currentCount) => {
      const nextCount = currentCount + 1;

      if (nextCount >= 5) {
        onOpenDiagnostics();
        return 0;
      }

      return nextCount;
    });
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Your account and app details for this phone.</Text>
      </View>

      <Card>
        <ProfileLine label="Name" value={user?.name ?? "Not available"} />
        <ProfileLine label="Work phone" value={user?.phone ?? "Not available"} />
        <ProfileLine label="Role" value={titleCase(user?.role ?? "technician")} />
        <ProfileLine
          label="App Version"
          value={APP_VERSION}
          onPress={internalDiagnosticsEnabled ? handleVersionPress : undefined}
          testID={internalDiagnosticsEnabled ? "profile.app-version-trigger" : undefined}
        />
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Build Check</Text>
        <Text style={styles.helperText}>{testerBuildMessage}</Text>
        <ProfileLine label="Version" value={APP_VERSION} />
        <ProfileLine label="App ID" value={APP_ANDROID_PACKAGE_ID} />
        <ProfileLine label="Build Profile" value={buildProfileLabel} />
        <ProfileLine label="Server" value={backendTargetLabel} />
      </Card>

      <Button
        label="Device Check"
        variant="secondary"
        onPress={onOpenDeviceCheck}
        testID="profile.device-check-button"
      />

      {internalDiagnosticsEnabled ? (
        <Button
          label="Open Diagnostics"
          variant="ghost"
          onPress={onOpenDiagnostics}
          testID="profile.diagnostics-button"
        />
      ) : null}

      <Button
        label="Sign Out"
        variant="danger"
        onPress={() => void handleSignOut()}
        loading={signingOut}
        testID="profile.sign-out-button"
      />
    </ScrollView>
  );
}

function ProfileLine({
  label,
  value,
  onPress,
  testID,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  testID?: string;
}) {
  const content = (
    <>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [styles.line, pressed && styles.linePressed]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={styles.line} testID={testID}>
      {content}
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
  header: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
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
  line: {
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  linePressed: {
    opacity: 0.72,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
});
