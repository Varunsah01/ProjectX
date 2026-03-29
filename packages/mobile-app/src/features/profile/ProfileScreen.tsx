import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import appConfig from "../../../app.json";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { colors, spacing } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import { titleCase } from "../../utils/format";

const appVersion = appConfig.expo.version;

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Signed-in operator details and current app version.</Text>
      </View>

      <Card>
        <ProfileLine label="Name" value={user?.name ?? "Not available"} />
        <ProfileLine label="Phone" value={user?.phone ?? "Not available"} />
        <ProfileLine label="Role" value={titleCase(user?.role ?? "technician")} />
        <ProfileLine label="App Version" value={appVersion} />
      </Card>

      <Button
        label="Logout"
        variant="danger"
        onPress={() => void handleSignOut()}
        loading={signingOut}
      />
    </ScrollView>
  );
}

function ProfileLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.line}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
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
