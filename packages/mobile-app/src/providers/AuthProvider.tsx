import { AppState, type AppStateStatus } from "react-native";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import {
  apiRequest,
  ApiError,
  type AuthenticatedApiRequestOptions,
  type AuthenticatedRequest,
} from "../services/api";
import type { LoginRequest, LoginResponse, MeResponse } from "../types/api";
import type { User } from "../types/domain";
import { logTestError, logTestEvent, logTestWarning } from "../services/test-logger";

const TOKEN_STORAGE_KEY = "project-x.mobile.session-token";
const USER_STORAGE_KEY = "project-x.mobile.session-user";
const CSRF_STORAGE_KEY = "project-x.mobile.csrf-token";

export type AuthSessionNotice = {
  tone: "warning" | "danger" | "info";
  message: string;
};

type AuthContextValue = {
  isLoading: boolean;
  hasSessionToken: boolean;
  user: User | null;
  sessionNotice: AuthSessionNotice | null;
  signIn: (credentials: LoginRequest) => Promise<void>;
  requestOtp: (phone: string) => Promise<{ expiresAt: string }>;
  signInWithOtp: (input: { phone: string; code: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  request: AuthenticatedRequest;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [sessionNotice, setSessionNotice] = useState<AuthSessionNotice | null>(null);

  const persistSession = useCallback(async (nextToken: string, nextUser: User, nextCsrfToken?: string) => {
    const ops = [
      SecureStore.setItemAsync(TOKEN_STORAGE_KEY, nextToken),
      SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(nextUser)),
    ];
    if (nextCsrfToken) {
      ops.push(SecureStore.setItemAsync(CSRF_STORAGE_KEY, nextCsrfToken));
    }
    await Promise.all(ops);
    logTestEvent("auth", "session-persisted", {
      userId: nextUser.id,
      role: nextUser.role,
    });
  }, []);

  const clearSession = useCallback(async () => {
    setToken(null);
    setUser(null);
    setSessionNotice(null);
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY),
      SecureStore.deleteItemAsync(USER_STORAGE_KEY),
      SecureStore.deleteItemAsync(CSRF_STORAGE_KEY),
    ]);
    logTestEvent("auth", "session-cleared");
  }, []);

  const refreshSession = useCallback(async () => {
    const [storedToken, storedUserValue] = await Promise.all([
      token ? Promise.resolve(token) : SecureStore.getItemAsync(TOKEN_STORAGE_KEY),
      SecureStore.getItemAsync(USER_STORAGE_KEY),
    ]);
    let cachedUser: User | null = null;

    if (storedUserValue) {
      try {
        cachedUser = JSON.parse(storedUserValue) as User;
      } catch {
        cachedUser = null;
        logTestWarning("auth", "stored-user-parse-failed");
      }
    }

    if (!storedToken) {
      setToken(null);
      setUser(null);
      setSessionNotice(null);
      logTestEvent("auth", "refresh-no-token");
      return;
    }

    try {
      const response = await apiRequest<MeResponse>("/auth/me", {
        token: storedToken,
        timeoutMs: 12000,
      });
      setToken(storedToken);
      setUser(response.user);
      setSessionNotice(null);
      await persistSession(storedToken, response.user, response.csrfToken ?? undefined);
      logTestEvent("auth", "refresh-verified", {
        userId: response.user.id,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logTestWarning("auth", "refresh-unauthorized");
        await clearSession();
        return;
      }

      if (cachedUser) {
        setToken(storedToken);
        setUser(cachedUser);
        setSessionNotice({
          tone: "warning",
          message:
            "Using the saved sign-in on this phone for now. We will check the server again when your connection is back.",
        });
        logTestWarning("auth", "refresh-fallback-cached-user", {
          userId: cachedUser.id,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
        return;
      }

      setToken(storedToken);
      setUser(null);
      setSessionNotice({
        tone: "danger",
        message:
          "We found a saved sign-in but could not finish loading your account. Check your connection, then sign in again.",
      });
      logTestError("auth", "refresh-no-user-fallback", {
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [clearSession, persistSession, token]);

  useEffect(() => {
    async function restoreSession() {
      await refreshSession();
      setIsLoading(false);
    }

    void restoreSession();
  }, [refreshSession]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          void refreshSession();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [refreshSession]);

  const signIn = useCallback(async (credentials: LoginRequest) => {
    logTestEvent("auth", "sign-in-start", {
      identifierType: credentials.identifierType,
      authMethod: credentials.authMethod,
    });
    const response = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: credentials,
      timeoutMs: 15000,
    });

    await persistSession(response.token, response.user, response.csrfToken);
    setToken(response.token);
    setUser(response.user);
    setSessionNotice(null);
    logTestEvent("auth", "sign-in-success", {
      userId: response.user.id,
      role: response.user.role,
    });
  }, [persistSession]);

  const requestOtp = useCallback(async (phone: string) => {
    logTestEvent("auth", "otp-request-start", { phone });
    const response = await apiRequest<{ ok: true; expiresAt: string }>(
      "/auth/otp/request",
      {
        method: "POST",
        body: { phone },
        timeoutMs: 15000,
      },
    );
    logTestEvent("auth", "otp-request-success", { phone });
    return { expiresAt: response.expiresAt };
  }, []);

  const signInWithOtp = useCallback(
    async ({ phone, code }: { phone: string; code: string }) => {
      logTestEvent("auth", "otp-verify-start", { phone });
      const response = await apiRequest<LoginResponse>("/auth/otp/verify", {
        method: "POST",
        body: { phone, code },
        timeoutMs: 15000,
      });

      await persistSession(response.token, response.user, response.csrfToken);
      setToken(response.token);
      setUser(response.user);
      setSessionNotice(null);
      logTestEvent("auth", "otp-verify-success", {
        userId: response.user.id,
      });
    },
    [persistSession],
  );

  const signOut = useCallback(async () => {
    try {
      if (token) {
        logTestEvent("auth", "sign-out-start");
        await apiRequest("/auth/logout", {
          method: "POST",
          token,
          timeoutMs: 10000,
        });
      }
    } catch {
      // Ignore logout network failures; local session still needs to clear.
    } finally {
      await clearSession();
    }
  }, [clearSession, token]);

  const request = useCallback(
    async <T,>(
      path: string,
      options: AuthenticatedApiRequestOptions = {},
    ) => {
      if (!token) {
        throw new Error("You are not signed in.");
      }

      const method = (options.method ?? "GET").toUpperCase();
      const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
      let headers = options.headers ?? {};

      if (isMutation) {
        const csrfToken = await SecureStore.getItemAsync(CSRF_STORAGE_KEY);
        if (csrfToken) {
          headers = { ...headers, "x-csrf-token": csrfToken };
        }
      }

      try {
        return await apiRequest<T>(path, {
          method: options.method,
          body: options.body,
          headers,
          retry: options.retry,
          retryDelayMs: options.retryDelayMs,
          timeoutMs: options.timeoutMs,
          token,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await clearSession();
          throw new Error("Your session ended. Sign in again.");
        }

        throw error;
      }
    },
    [clearSession, token],
  );

  const value = useMemo(
    () => ({
      isLoading,
      hasSessionToken: Boolean(token),
      user,
      sessionNotice,
      signIn,
      requestOtp,
      signInWithOtp,
      signOut,
      refreshSession,
      request,
    }),
    [
      isLoading,
      request,
      refreshSession,
      requestOtp,
      sessionNotice,
      signIn,
      signInWithOtp,
      signOut,
      token,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
