import { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import NoticeCard from "../../components/ui/NoticeCard";
import {
  APP_DISPLAY_NAME,
  APP_MONOGRAM,
  APP_PILOT_LABEL,
} from "../../constants/branding";
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import { getApiConfigError, getApiTargetNotice, getErrorMessage } from "../../services/api";
import type { LoginIdentifierType } from "../../types/api";
import { logTestWarning } from "../../services/test-logger";

const identifierOptions: Array<{ value: LoginIdentifierType; label: string }> = [
  { value: "employee_id", label: "Employee ID" },
  { value: "phone", label: "Phone Number" },
];
const LOGIN_EXIT_BACK_WINDOW_MS = 2000;

function getIdentifierError(identifierType: LoginIdentifierType, identifier: string) {
  const trimmedIdentifier = identifier.trim();

  if (!trimmedIdentifier) {
    return identifierType === "phone"
      ? "Phone number is required."
      : "Employee ID is required.";
  }

  if (identifierType === "phone") {
    const digits = trimmedIdentifier.replace(/\D/g, "");

    if (digits.length < 10) {
      return "Enter a valid mobile number.";
    }

    return null;
  }

  if (!/^[A-Za-z0-9_-]{4,24}$/.test(trimmedIdentifier)) {
    return "Enter a valid employee ID.";
  }

  return null;
}

function getPasswordError(secret: string) {
  const trimmedSecret = secret.trim();

  if (!trimmedSecret) {
    return "Password is required.";
  }

  if (trimmedSecret.length < 6) {
    return "Password must be at least 6 characters.";
  }

  return null;
}

export default function LoginScreen() {
  const { signIn, sessionNotice } = useAuth();
  const [identifierType, setIdentifierType] = useState<LoginIdentifierType>("employee_id");
  const [identifier, setIdentifier] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backNotice, setBackNotice] = useState<string | null>(null);
  const apiConfigError = getApiConfigError();
  const apiTargetNotice = getApiTargetNotice();
  const lastBackPressAtRef = useRef(0);
  const backNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const identifierError = getIdentifierError(identifierType, identifier);
  const secretError = getPasswordError(secret);
  const canSubmit = !apiConfigError && !identifierError && !secretError;

  const identifierHelperText =
    identifierType === "employee_id"
      ? "Recommended for the pilot rollout. Use the employee ID assigned to your operator account."
      : "Use the phone number linked to the same operator account if needed.";

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (submitting) {
        return true;
      }

      const now = Date.now();

      if (now - lastBackPressAtRef.current < LOGIN_EXIT_BACK_WINDOW_MS) {
        return false;
      }

      lastBackPressAtRef.current = now;
      setBackNotice(
        "Sign-in entries are not saved. Press back again within 2 seconds to close the app.",
      );

      if (backNoticeTimerRef.current) {
        clearTimeout(backNoticeTimerRef.current);
      }

      backNoticeTimerRef.current = setTimeout(() => {
        backNoticeTimerRef.current = null;
        setBackNotice(null);
      }, LOGIN_EXIT_BACK_WINDOW_MS);

      return true;
    });

    return () => {
      subscription.remove();
      if (backNoticeTimerRef.current) {
        clearTimeout(backNoticeTimerRef.current);
      }
    };
  }, [submitting]);

  async function handleSignIn() {
    setShowValidation(true);
    setError(null);

    if (!canSubmit) {
      return;
    }

    setSubmitting(true);

    try {
      await signIn({
        identifierType,
        identifier: identifier.trim(),
        authMethod: "password",
        secret: secret.trim(),
      });
    } catch (signInError) {
      logTestWarning("auth", "sign-in-screen-error", {
        identifierType,
        authMethod: "password",
        errorMessage: signInError instanceof Error ? signInError.message : "Unknown error",
      });
      setError(getErrorMessage(signInError));
    } finally {
      setSubmitting(false);
    }
  }

  function handleIdentifierTypeChange(nextType: LoginIdentifierType) {
    setIdentifierType(nextType);
    setIdentifier("");
    setError(null);
    setShowValidation(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>{APP_MONOGRAM}</Text>
          </View>
          <View style={styles.titleGroup}>
            <Text style={styles.title}>{APP_DISPLAY_NAME}</Text>
            <View style={styles.pilotBadge}>
              <Text style={styles.pilotBadgeLabel}>{APP_PILOT_LABEL}</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Sign in to review assigned jobs, update status on site, and finish field work quickly on Android.
          </Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>
              Pilot access uses employee ID or work phone with password. Your session stays on this device until you sign out.
            </Text>
          </View>

          {apiConfigError ? (
            <NoticeCard tone="danger" title="App Configuration" message={apiConfigError} />
          ) : null}

          {!apiConfigError && apiTargetNotice ? (
            <NoticeCard
              tone="warning"
              title="Real Device Warning"
              message={apiTargetNotice}
            />
          ) : null}

          {sessionNotice ? (
            <NoticeCard
              tone={sessionNotice.tone}
              title="Saved Session"
              message={sessionNotice.message}
            />
          ) : null}

          {backNotice ? <NoticeCard tone="info" title="Press Back Again to Exit" message={backNotice} /> : null}

          <NoticeCard
            tone="info"
            title="Pilot Auth"
            message="The pilot login path is password only. Employee ID plus password is the primary sign-in route. OTP remains disabled until backend verification is production-ready."
          />

          <View style={styles.group}>
            <Text style={styles.groupLabel}>Sign in with</Text>
            <View style={styles.optionRow}>
              {identifierOptions.map((option) => (
                <OptionPill
                  key={option.value}
                  label={option.label}
                  active={identifierType === option.value}
                  disabled={submitting}
                  onPress={() => handleIdentifierTypeChange(option.value)}
                />
              ))}
            </View>
          </View>

          <Input
            label={identifierType === "phone" ? "Phone Number" : "Employee ID"}
            value={identifier}
            onChangeText={(value) => {
              setIdentifier(value);
              setError(null);
            }}
            placeholder={identifierType === "phone" ? "+91 98765 43210" : "EMP1024"}
            keyboardType={identifierType === "phone" ? "phone-pad" : "default"}
            autoComplete={identifierType === "phone" ? "tel" : "off"}
            textContentType={identifierType === "phone" ? "telephoneNumber" : "none"}
            editable={!submitting}
            error={showValidation ? identifierError ?? undefined : undefined}
            helperText={identifierHelperText}
            returnKeyType="next"
          />

          <Input
            label="Password"
            value={secret}
            onChangeText={(value) => {
              setSecret(value);
              setError(null);
            }}
            secureTextEntry
            placeholder="Enter password"
            keyboardType="default"
            autoComplete="password"
            textContentType="password"
            editable={!submitting}
            error={showValidation ? secretError ?? undefined : undefined}
            helperText="Enter the password for your operator account."
            returnKeyType="done"
            onSubmitEditing={() => void handleSignIn()}
          />

          {error ? <NoticeCard tone="danger" message={error} /> : null}

          <Button
            label="Sign In"
            onPress={() => void handleSignIn()}
            loading={submitting}
            disabled={!canSubmit}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function OptionPill({
  label,
  active,
  disabled = false,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionPill,
        active && styles.optionPillActive,
        disabled && styles.optionPillDisabled,
        pressed && styles.optionPillPressed,
      ]}
    >
      <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.xl,
  },
  hero: {
    alignItems: "center",
    gap: spacing.sm,
  },
  titleGroup: {
    alignItems: "center",
    gap: spacing.xs,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "800",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  pilotBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
  },
  pilotBadgeLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.brand,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
  },
  card: {
    gap: spacing.lg,
  },
  cardHeader: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  group: {
    gap: spacing.sm,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  optionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  optionPill: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  optionPillActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  optionPillPressed: {
    opacity: 0.92,
  },
  optionPillDisabled: {
    opacity: 0.6,
  },
  optionPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textAlign: "center",
  },
  optionPillTextActive: {
    color: colors.brand,
  },
});
