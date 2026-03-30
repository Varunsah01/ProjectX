const explicitTestLogging = process.env.EXPO_PUBLIC_ENABLE_TEST_LOGS === "true";

export type RetainedTestLogRecord = {
  level: "warning" | "error";
  scope: string;
  event: string;
  message: string;
  occurredAt: string;
};

type RetainedTestLogListener = (record: RetainedTestLogRecord | null) => void;

let lastRetainedTestLogRecord: RetainedTestLogRecord | null = null;
const retainedTestLogListeners = new Set<RetainedTestLogListener>();

function shouldLogForTestBuild() {
  return __DEV__ || explicitTestLogging;
}

export function isInternalDiagnosticsEnabled() {
  return shouldLogForTestBuild();
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

function retainLogRecord(
  level: RetainedTestLogRecord["level"],
  scope: string,
  event: string,
  message: string,
) {
  lastRetainedTestLogRecord = {
    level,
    scope,
    event,
    message,
    occurredAt: new Date().toISOString(),
  };
  retainedTestLogListeners.forEach((listener) => listener(lastRetainedTestLogRecord));
}

export function getLastRetainedTestLogRecord() {
  return lastRetainedTestLogRecord;
}

export function subscribeRetainedTestLogRecord(listener: RetainedTestLogListener) {
  retainedTestLogListeners.add(listener);
  listener(lastRetainedTestLogRecord);

  return () => {
    retainedTestLogListeners.delete(listener);
  };
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

  const message = formatMessage(scope, event, details);
  retainLogRecord("warning", scope, event, message);
  console.warn(message);
}

export function logTestError(
  scope: string,
  event: string,
  details?: Record<string, unknown>,
) {
  if (!shouldLogForTestBuild()) {
    return;
  }

  const message = formatMessage(scope, event, details);
  retainLogRecord("error", scope, event, message);
  console.error(message);
}
