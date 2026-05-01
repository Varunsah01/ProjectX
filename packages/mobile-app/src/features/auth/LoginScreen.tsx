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

type AuthMethod = "password" | "otp";

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

function getOtpCodeError(code: string) {
  const trimmed = code.trim();
  if (!trimmed) {
    return "Enter the 6-digit code we sent.";
  }
  if (!/^\d{6}$/.test(trimmed)) {
    return "Code must be 6 digits.";
  }
  return null;
}

export default function LoginScreen() {
  const { signIn, requestOtp, signInWithOtp, sessionNotice } = useAuth();
  const [identifierType, setIdentifierType] = useState<LoginIdentifierType>("employee_id");
  const [identifier, setIdentifier] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backNotice, setBackNotice] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<AuthMethod>("password");
  const [otpStep, setOtpStep] = useState<"phone" | "code">("phone");
  const [otpCode, setOtpCode] = useState<string>("");
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const apiConfigError = getApiConfigError();
  const apiTargetNotice = getApiTargetNotice();
  const lastBackPressAtRef = useRef(0);
  const backNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const identifierError = getIdentifierError(identifierType, identifier);
  const secretError = getPasswordError(secret);
  const otpCodeError = getOtpCodeError(otpCode);

  const usingOtp = identifierType === "phone" && authMethod === "otp";
  const canSubmitPassword = !apiConfigError && !identifierError && !secretError;
  const canRequestOtp = !apiConfigError && !identifierError;
  const canVerifyOtp = !apiConfigError && !identifierError && !otpCodeError;
  const canSubmit = usingOtp
    ? otpStep === "code"
      ? canVerifyOtp
      : canRequestOtp
    : canSubmitPassword;

  const identifierHelperText =
    identifierType === "employee_id"
      ? "Use the employee ID linked to your operator account."
      : "Use the work phone number linked to your operator account.";

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
        "Sign-in details are not saved. Press back again within 2 seconds to close the app.",
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

    if (!canSubmitPassword) {
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

  async function handleRequestOtp() {
    setShowValidation(true);
    setError(null);
    setOtpInfo(null);

    if (!canRequestOtp) {
      return;
    }

    setSubmitting(true);
    try {
      await requestOtp(identifier.trim());
      setOtpStep("code");
      setOtpCode("");
      setShowValidation(false);
      setOtpInfo("We sent a 6-digit code to your phone. It expires in 5 minutes.");
    } catch (otpError) {
      logTestWarning("auth", "otp-request-screen-error", {
        errorMessage: otpError instanceof Error ? otpError.message : "Unknown error",
      });
      setError(getErrorMessage(otpError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp() {
    setShowValidation(true);
    setError(null);

    if (!canVerifyOtp) {
      return;
    }

    setSubmitting(true);
    try {
      await signInWithOtp({
        phone: identifier.trim(),
        code: otpCode.trim(),
      });
    } catch (otpError) {
      logTestWarning("auth", "otp-verify-screen-error", {
        errorMessage: otpError instanceof Error ? otpError.message : "Unknown error",
      });
      setError(getErrorMessage(otpError));
    } finally {
      setSubmitting(false);
    }
  }

  function handleIdentifierTypeChange(nextType: LoginIdentifierType) {
    setIdentifierType(nextType);
    setIdentifier("");
    setError(null);
    setShowValidation(false);
    if (nextType !== "phone") {
      setAuthMethod("password");
      setOtpStep("phone");
      setOtpCode("");
      setOtpInfo(null);
    }
  }

  function handleAuthMethodChange(nextMethod: AuthMethod) {
    setAuthMethod(nextMethod);
    setError(null);
    setShowValidation(false);
    setOtpStep("phone");
    setOtpCode("");
    setSecret("");
    setOtpInfo(null);
  }

  function handleResetOtpStep() {
    setOtpStep("phone");
    setOtpCode("");
    setOtpInfo(null);
    setError(null);
    setShowValidation(false);
  }

  function handlePrimaryPress() {
    if (usingOtp) {
      if (otpStep === "phone") {
        void handleRequestOtp();
      } else {
        void handleVerifyOtp();
      }
      return;
    }
    void handleSignIn();
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
            Sign in to see your jobs, update visits, and finish work on site.
          </Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>
              Use your employee ID or work phone and password. You will stay signed in on this phone until you sign out.
            </Text>
          </View>

          {apiConfigError ? (
            <NoticeCard
              tone="danger"
              title="App Setup Needed"
              message="This build cannot sign in on this phone because its server setup is missing or invalid. Ask your lead for the correct build."
            />
          ) : null}

          {!apiConfigError && apiTargetNotice ? (
            <NoticeCard
              tone="warning"
              title="Wrong Build for This Phone"
              message={apiTargetNotice}
            />
          ) : null}

          {sessionNotice ? (
            <NoticeCard
              tone={sessionNotice.tone}
              title="Sign-In Status"
              message={sessionNotice.message}
            />
          ) : null}

          {backNotice ? (
            <NoticeCard
              tone="info"
              title="Press Back Again to Close"
              message={backNotice}
            />
          ) : null}

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

          {identifierType === "phone" ? (
            <View style={styles.group}>
              <Text style={styles.groupLabel}>Verification</Text>
              <View style={styles.optionRow}>
                <OptionPill
                  label="Password"
                  active={authMethod === "password"}
                  disabled={submitting}
                  onPress={() => handleAuthMethodChange("password")}
                />
                <OptionPill
                  label="One-time Code"
                  active={authMethod === "otp"}
                  disabled={submitting}
                  onPress={() => handleAuthMethodChange("otp")}
                />
              </View>
            </View>
          ) : null}

          <Input
            label={identifierType === "phone" ? "Phone Number" : "Employee ID"}
            value={identifier}
            testID="login.identifier-input"
            onChangeText={(value) => {
              setIdentifier(value);
              setError(null);
            }}
            placeholder={identifierType === "phone" ? "+91 98765 43210" : "EMP1024"}
            keyboardType={identifierType === "phone" ? "phone-pad" : "default"}
            autoComplete={identifierType === "phone" ? "tel" : "off"}
            textContentType={identifierType === "phone" ? "telephoneNumber" : "none"}
            editable={!submitting && !(usingOtp && otpStep === "code")}
            error={showValidation ? identifierError ?? undefined : undefined}
            helperText={identifierHelperText}
            returnKeyType="next"
          />

          {usingOtp ? (
            <>
              {otpInfo ? (
                <NoticeCard tone="info" title="Code Sent" message={otpInfo} />
              ) : null}
              {otpStep === "code" ? (
                <Input
                  label="One-time Code"
                  value={otpCode}
                  testID="login.otp-input"
                  onChangeText={(value) => {
                    setOtpCode(value);
                    setError(null);
                  }}
                  placeholder="123456"
                  keyboardType="number-pad"
                  autoComplete="sms-otp"
                  textContentType="oneTimeCode"
                  editable={!submitting}
                  error={showValidation ? otpCodeError ?? undefined : undefined}
                  helperText="Codes expire after 5 minutes."
                  returnKeyType="done"
                  onSubmitEditing={() => void handleVerifyOtp()}
                />
              ) : null}
            </>
          ) : (
            <Input
              label="Password"
              value={secret}
              testID="login.password-input"
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
              helperText="Enter your account password."
              returnKeyType="done"
              onSubmitEditing={() => void handleSignIn()}
            />
          )}

          {error ? <NoticeCard tone="danger" title="Can't Sign In" message={error} /> : null}

          <Button
            label={
              usingOtp
                ? otpStep === "phone"
                  ? "Send Code"
                  : "Verify & Sign In"
                : "Sign In"
            }
            onPress={() => handlePrimaryPress()}
            loading={submitting}
            disabled={!canSubmit}
            testID={
              usingOtp
                ? otpStep === "phone"
                  ? "login.otp-request-button"
                  : "login.otp-verify-button"
                : "login.submit-button"
            }
          />

          {usingOtp && otpStep === "code" ? (
            <Pressable
              disabled={submitting}
              onPress={handleResetOtpStep}
              style={({ pressed }) => [styles.linkButton, pressed && styles.linkButtonPressed]}
            >
              <Text style={styles.linkButtonText}>Use a different number</Text>
            </Pressable>
          ) : null}
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
  linkButton: {
    alignSelf: "center",
    paddingVertical: spacing.xs,
  },
  linkButtonPressed: {
    opacity: 0.7,
  },
  linkButtonText: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: "700",
  },
});
