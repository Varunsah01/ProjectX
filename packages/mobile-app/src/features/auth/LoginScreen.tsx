import { useState } from "react";
import {
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
import { colors, radius, spacing } from "../../constants/theme";
import { useAuth } from "../../hooks/useAuth";
import { getApiConfigError, getErrorMessage } from "../../services/api";
import type { LoginAuthMethod, LoginIdentifierType } from "../../types/api";

const identifierOptions: Array<{ value: LoginIdentifierType; label: string }> = [
  { value: "phone", label: "Phone Number" },
  { value: "employee_id", label: "Employee ID" },
];

const authMethodOptions: Array<{ value: LoginAuthMethod; label: string }> = [
  { value: "password", label: "Password" },
  { value: "otp", label: "OTP Code" },
];

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

function getSecretError(authMethod: LoginAuthMethod, secret: string) {
  const trimmedSecret = secret.trim();

  if (!trimmedSecret) {
    return authMethod === "password" ? "Password is required." : "OTP code is required.";
  }

  if (authMethod === "password" && trimmedSecret.length < 6) {
    return "Password must be at least 6 characters.";
  }

  if (authMethod === "otp" && !/^\d{6}$/.test(trimmedSecret)) {
    return "Enter the 6-digit OTP code.";
  }

  return null;
}

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [identifierType, setIdentifierType] = useState<LoginIdentifierType>("phone");
  const [authMethod, setAuthMethod] = useState<LoginAuthMethod>("password");
  const [identifier, setIdentifier] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiConfigError = getApiConfigError();

  const identifierError = getIdentifierError(identifierType, identifier);
  const secretError = getSecretError(authMethod, secret);
  const canSubmit = !apiConfigError && !identifierError && !secretError;

  const identifierHelperText =
    identifierType === "phone"
      ? "Use the phone number linked to your field account."
      : "Use the employee ID assigned to your operator account.";

  const secretHelperText =
    authMethod === "password"
      ? "Enter the password for your operator account."
      : "Enter the 6-digit code issued for your account.";

  const secondaryLabel = authMethod === "password" ? "Password" : "OTP Code";

  const secondaryPlaceholder =
    authMethod === "password" ? "Enter password" : "Enter 6-digit code";

  const secondInputKeyboardType = authMethod === "password" ? "default" : "number-pad";

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
        authMethod,
        secret: secret.trim(),
      });
    } catch (signInError) {
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

  function handleAuthMethodChange(nextMethod: LoginAuthMethod) {
    setAuthMethod(nextMethod);
    setSecret("");
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
            <Text style={styles.logoText}>FO</Text>
          </View>
          <Text style={styles.title}>Field Operator</Text>
          <Text style={styles.subtitle}>
            Sign in to review assigned jobs, update status on site, and finish field work quickly on Android.
          </Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>
              Use your work phone or employee ID. Your session stays on this device until you sign out.
            </Text>
          </View>

          {apiConfigError ? <Text style={styles.error}>{apiConfigError}</Text> : null}

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

          <View style={styles.group}>
            <Text style={styles.groupLabel}>Verification mode</Text>
            <View style={styles.optionRow}>
              {authMethodOptions.map((option) => (
                <OptionPill
                  key={option.value}
                  label={option.label}
                  active={authMethod === option.value}
                  disabled={submitting}
                  onPress={() => handleAuthMethodChange(option.value)}
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
            label={secondaryLabel}
            value={secret}
            onChangeText={(value) => {
              setSecret(value);
              setError(null);
            }}
            secureTextEntry={authMethod === "password"}
            placeholder={secondaryPlaceholder}
            keyboardType={secondInputKeyboardType}
            autoComplete={authMethod === "password" ? "password" : "one-time-code"}
            textContentType={authMethod === "password" ? "password" : "oneTimeCode"}
            maxLength={authMethod === "otp" ? 6 : undefined}
            editable={!submitting}
            error={showValidation ? secretError ?? undefined : undefined}
            helperText={secretHelperText}
            returnKeyType="done"
            onSubmitEditing={() => void handleSignIn()}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label={authMethod === "password" ? "Sign In" : "Verify and Continue"}
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
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600",
  },
});
