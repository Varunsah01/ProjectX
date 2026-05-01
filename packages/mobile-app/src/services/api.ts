import { Platform } from "react-native";
import { getMobileRuntimeEnvDiagnostics } from "../../config/env";
import { logTestError, logTestEvent, logTestWarning } from "./test-logger";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const runtimeEnvDiagnostics = getMobileRuntimeEnvDiagnostics(
  process.env as Record<string, string | undefined>,
  {
    isDevRuntime: __DEV__,
    platform: Platform.OS === "android" ? "android" : "ios",
  },
);

export type ApiResolutionMode = typeof runtimeEnvDiagnostics.mode;

export function getApiDiagnostics() {
  return {
    mode: runtimeEnvDiagnostics.mode,
    baseUrl: runtimeEnvDiagnostics.baseUrl,
    configuredApiUrl: runtimeEnvDiagnostics.apiUrl,
    mobileApiBaseUrl: runtimeEnvDiagnostics.mobileApiBaseUrl,
    apiUrlConfigured: Boolean(runtimeEnvDiagnostics.apiUrl),
    apiUrlRequired: runtimeEnvDiagnostics.apiUrlRequired,
    buildIntent: runtimeEnvDiagnostics.buildIntent,
    buildProfile: runtimeEnvDiagnostics.buildProfile,
    isLocalhostLikeApiUrl: runtimeEnvDiagnostics.isLocalhostLikeApiUrl,
  };
}

export function getApiConfigError() {
  return runtimeEnvDiagnostics.configError;
}

export function getApiTargetNotice() {
  return runtimeEnvDiagnostics.targetNotice;
}

export const API_VERSION_PATH = "/v1";

export const MOBILE_API_BASE_URL = runtimeEnvDiagnostics.mobileApiBaseUrl
  ? `${runtimeEnvDiagnostics.mobileApiBaseUrl}${API_VERSION_PATH}`
  : runtimeEnvDiagnostics.mobileApiBaseUrl;

export type ApiMethod = "GET" | "POST" | "DELETE";

export type ApiRequestOptions = {
  method?: ApiMethod;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  retry?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
};

export type AuthenticatedApiRequestOptions = Omit<ApiRequestOptions, "token">;

export type AuthenticatedRequest = <T>(
  path: string,
  options?: AuthenticatedApiRequestOptions,
) => Promise<T>;

export type ApiReachabilityCheck = {
  status: "reachable" | "unreachable" | "not_configured";
  reachable: boolean;
  message: string;
};

function isFormDataBody(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function isRetryableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error instanceof ApiError) {
    return isRetryableStatus(error.status);
  }

  const message = error.message.toLowerCase();
  return (
    error.name === "AbortError" ||
    error.name === "TypeError" ||
    message.includes("network") ||
    message.includes("abort") ||
    message.includes("timed out") ||
    message.includes("failed to fetch")
  );
}

export function shouldQueueOfflineMutation(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return false;
    }

    return isRetryableStatus(error.status);
  }

  return isRetryableError(error);
}

function wait(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export async function checkApiReachability(timeoutMs = 4000): Promise<ApiReachabilityCheck> {
  const diagnostics = getApiDiagnostics();
  const targetNotice = getApiTargetNotice();

  if (!diagnostics.baseUrl) {
    return {
      status: "not_configured",
      reachable: false,
      message:
        getApiConfigError() ??
        targetNotice ??
        "This build is missing a working server address.",
    };
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => {
        controller.abort();
      }, timeoutMs)
    : null;

  try {
    await fetch(diagnostics.baseUrl, {
      method: "HEAD",
      signal: controller?.signal,
    });

    return {
      status: "reachable",
      reachable: true,
      message: "The server can be reached from this phone.",
    };
  } catch (error) {
    return {
      status: "unreachable",
      reachable: false,
      message:
        targetNotice ??
        getErrorMessage(error) ??
        "Can't reach the server right now. Check mobile data or Wi-Fi and try again.",
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function runApiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  if (!MOBILE_API_BASE_URL) {
    throw new Error(getApiConfigError() ?? "App configuration is incomplete.");
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers ?? {}),
  };

  if (options.body !== undefined && !isFormDataBody(options.body)) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const requestMethod = options.method ?? "GET";
  const timeoutMs = options.timeoutMs ?? (isFormDataBody(options.body) ? 20000 : 15000);
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => {
        controller.abort();
      }, timeoutMs)
    : null;

  logTestEvent("api", "request-start", {
    method: requestMethod,
    path,
    timeoutMs,
  });

  let response: Response;

  try {
    response = await fetch(`${MOBILE_API_BASE_URL}${path}`, {
      method: requestMethod,
      headers,
      body:
        options.body === undefined
          ? undefined
          : isFormDataBody(options.body)
            ? options.body
            : JSON.stringify(options.body),
      signal: controller?.signal,
    });
  } catch (error) {
    logTestWarning("api", "request-failed", {
      method: requestMethod,
      path,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    logTestWarning("api", "request-non-ok", {
      method: requestMethod,
      path,
      status: response.status,
    });
    throw new ApiError(
      payload?.error ?? "Request failed.",
      response.status,
    );
  }

  logTestEvent("api", "request-success", {
    method: requestMethod,
    path,
    status: response.status,
  });

  return payload as T;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
) {
  const retryCount = Math.max(0, options.retry ?? 0);
  const retryDelayMs = options.retryDelayMs ?? 350;

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      return await runApiRequest<T>(path, options);
    } catch (error) {
      if (attempt >= retryCount || !isRetryableError(error)) {
        logTestError("api", "request-exhausted", {
          method: options.method ?? "GET",
          path,
          attempt,
          retryCount,
          errorName: error instanceof Error ? error.name : "UnknownError",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }

      logTestWarning("api", "request-retrying", {
        method: options.method ?? "GET",
        path,
        attempt: attempt + 1,
        retryCount,
      });
      await wait(retryDelayMs * (attempt + 1));
    }
  }

  throw new Error("Request failed.");
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const apiTargetNotice = getApiTargetNotice();

    if (apiTargetNotice && isRetryableError(error)) {
      return apiTargetNotice;
    }

    if (error.name === "AbortError" || message.includes("timed out") || message.includes("abort")) {
      return "This is taking longer than expected. Check your connection and try again.";
    }

    if (isRetryableError(error)) {
      return "Can't reach the server right now. Check mobile data or Wi-Fi and try again.";
    }

    return error.message;
  }

  return "Something went wrong.";
}
