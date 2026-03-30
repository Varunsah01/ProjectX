const explicitTestLogging = process.env.EXPO_PUBLIC_ENABLE_TEST_LOGS === "true";

function shouldLogForTestBuild() {
  return __DEV__ || explicitTestLogging;
}

function serializeDetails(details?: Record<string, unknown>) {
  if (!details) {
    return "";
  }

  try {
    return ` ${JSON.stringify(details, (key, value) => {
      const normalizedKey = key.toLowerCase();

      if (
        normalizedKey.includes("token") ||
        normalizedKey.includes("secret") ||
        normalizedKey.includes("password") ||
        normalizedKey.includes("authorization")
      ) {
        return "[redacted]";
      }

      return value;
    })}`;
  } catch {
    return " [unserializable-details]";
  }
}

function formatMessage(scope: string, event: string, details?: Record<string, unknown>) {
  return `[field-operator][${scope}] ${event}${serializeDetails(details)}`;
}

export function logTestEvent(
  scope: string,
  event: string,
  details?: Record<string, unknown>,
) {
  if (!shouldLogForTestBuild()) {
    return;
  }

  console.info(formatMessage(scope, event, details));
}

export function logTestWarning(
  scope: string,
  event: string,
  details?: Record<string, unknown>,
) {
  if (!shouldLogForTestBuild()) {
    return;
  }

  console.warn(formatMessage(scope, event, details));
}

export function logTestError(
  scope: string,
  event: string,
  details?: Record<string, unknown>,
) {
  if (!shouldLogForTestBuild()) {
    return;
  }

  console.error(formatMessage(scope, event, details));
}
