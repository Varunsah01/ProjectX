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

const TOKEN_STORAGE_KEY = "project-x.mobile.session-token";
const USER_STORAGE_KEY = "project-x.mobile.session-user";

type AuthContextValue = {
  isLoading: boolean;
  user: User | null;
  signIn: (credentials: LoginRequest) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  request: AuthenticatedRequest;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const persistSession = useCallback(async (nextToken: string, nextUser: User) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_STORAGE_KEY, nextToken),
      SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(nextUser)),
    ]);
  }, []);

  const clearSession = useCallback(async () => {
    setToken(null);
    setUser(null);
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY),
      SecureStore.deleteItemAsync(USER_STORAGE_KEY),
    ]);
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
      }
    }

    if (!storedToken) {
      setToken(null);
      setUser(null);
      return;
    }

    try {
      const response = await apiRequest<MeResponse>("/auth/me", {
        token: storedToken,
      });
      setToken(storedToken);
      setUser(response.user);
      await persistSession(storedToken, response.user);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearSession();
        return;
      }

      if (cachedUser) {
        setToken(storedToken);
        setUser(cachedUser);
        return;
      }

      setToken(storedToken);
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
    const response = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: credentials,
    });

    await persistSession(response.token, response.user);
    setToken(response.token);
    setUser(response.user);
  }, [persistSession]);

  const signOut = useCallback(async () => {
    try {
      if (token) {
        await apiRequest("/auth/logout", {
          method: "POST",
          token,
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

      try {
        return await apiRequest<T>(path, {
          method: options.method,
          body: options.body,
          headers: options.headers,
          retry: options.retry,
          retryDelayMs: options.retryDelayMs,
          token,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await clearSession();
          throw new Error("Your session expired. Sign in again.");
        }

        throw error;
      }
    },
    [clearSession, token],
  );

  const value = useMemo(
    () => ({
      isLoading,
      user,
      signIn,
      signOut,
      refreshSession,
      request,
    }),
    [isLoading, user, signIn, signOut, refreshSession, request],
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
