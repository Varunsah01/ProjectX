import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState } from "react-native";
import { loadFeatures, evalFeatureMobile } from "../services/feature-flags";
import { useAuth } from "../hooks/useAuth";

type FeatureFlagsContextValue = {
  isFeatureOn: (key: string) => boolean;
  isReady: boolean;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  isFeatureOn: () => false, // fail-closed default
  isReady: false,
});

/**
 * Provides feature flag evaluation for the mobile app.
 * Must be placed inside AuthProvider (needs user context for targeting).
 *
 * Features are loaded from AsyncStorage cache on first render, then refreshed
 * from the GrowthBook CDN. On foreground (app resume) the cache is refreshed
 * again to pick up flag changes within the 30 s TTL window.
 */
export function FeatureFlagsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isReady, setIsReady] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Initial load — non-blocking
    void loadFeatures().finally(() => setIsReady(true));

    // Refresh on foreground to pick up live flag changes
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void loadFeatures();
      }
    });

    return () => sub.remove();
  }, []);

  const isFeatureOn = useCallback(
    (key: string) =>
      evalFeatureMobile(key, {
        userId: user?.id,
        orgId: user?.organizationId,
        role: user?.role,
      }),
    [user],
  );

  return (
    <FeatureFlagsContext.Provider value={{ isFeatureOn, isReady }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Evaluate a feature flag in a mobile component.
 * Returns `false` before features are loaded (fail-closed).
 *
 * @example
 * const showBeta = useFeatureFlag("jobs.beta-checklist");
 */
export function useFeatureFlag(key: string): boolean {
  return useContext(FeatureFlagsContext).isFeatureOn(key);
}
