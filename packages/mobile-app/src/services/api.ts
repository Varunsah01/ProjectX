import { Platform } from "react-native";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const fallbackBaseUrl =
  Platform.OS === "android" ? "http://10.0.2.2:3001" : "http://localhost:3001";

function getConfiguredBaseUrl() {
  return process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? null;
}

function getResolvedBaseUrl() {
  const configuredBaseUrl = getConfiguredBaseUrl();

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (__DEV__) {
    return fallbackBaseUrl;
  }

  return null;
}

export function getApiConfigError() {
  return getResolvedBaseUrl()
    ? null
    : "App configuration is incomplete. Set EXPO_PUBLIC_API_URL before installing an internal or release build.";
}

export const MOBILE_API_BASE_URL = getResolvedBaseUrl()
  ? `${getResolvedBaseUrl()}/api/mobile`
  : null;

export type ApiMethod = "GET" | "POST" | "DELETE";

export type ApiRequestOptions = {
  method?: ApiMethod;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  retry?: number;
  retryDelayMs?: number;
};

export type AuthenticatedApiRequestOptions = Omit<ApiRequestOptions, "token">;

export type AuthenticatedRequest = <T>(
  path: string,
  options?: AuthenticatedApiRequestOptions,
) => Promise<T>;

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
    error.name === "TypeError" ||
    message.includes("network") ||
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

  const response = await fetch(`${MOBILE_API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body:
      options.body === undefined
        ? undefined
        : isFormDataBody(options.body)
          ? options.body
          : JSON.stringify(options.body),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    throw new ApiError(
      payload?.error ?? "Request failed.",
      response.status,
    );
  }

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
        throw error;
      }

      await wait(retryDelayMs * (attempt + 1));
    }
  }

  throw new Error("Request failed.");
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}
