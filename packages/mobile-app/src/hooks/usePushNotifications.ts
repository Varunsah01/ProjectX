import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { MOBILE_EAS_PROJECT_ID } from "../../config/expo-config";
import { useAuth } from "./useAuth";

// Show system banner for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface NotificationTapData {
  type: string;
  id: string;
}

export function usePushNotifications(
  onNotificationTap?: (data: NotificationTapData) => void,
) {
  const { user, request } = useAuth();
  const tokenSentRef = useRef(false);
  const responseListenerRef = useRef<Notifications.Subscription>();

  // Register push token after login
  useEffect(() => {
    if (!user || tokenSentRef.current) {
      return;
    }

    let cancelled = false;

    async function register() {
      if (!Device.isDevice) {
        return;
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted" || cancelled) {
        return;
      }

      const pushToken = await Notifications.getExpoPushTokenAsync({
        projectId: MOBILE_EAS_PROJECT_ID,
      });

      if (cancelled) {
        return;
      }

      try {
        await request("/devices", {
          method: "POST",
          body: {
            token: pushToken.data,
            platform: Platform.OS,
          },
        });
        tokenSentRef.current = true;
      } catch (error) {
        console.warn("Failed to register push token:", error);
      }
    }

    void register();

    return () => {
      cancelled = true;
    };
  }, [user, request]);

  // Reset on logout so next login re-registers
  useEffect(() => {
    if (!user) {
      tokenSentRef.current = false;
    }
  }, [user]);

  // Handle notification taps (app in background or killed)
  const stableOnTap = useCallback(
    (data: NotificationTapData) => {
      onNotificationTap?.(data);
    },
    [onNotificationTap],
  );

  useEffect(() => {
    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;

        if (data?.type && data?.id) {
          stableOnTap({
            type: data.type as string,
            id: data.id as string,
          });
        }
      });

    return () => {
      if (responseListenerRef.current) {
        Notifications.removeNotificationSubscription(
          responseListenerRef.current,
        );
      }
    };
  }, [stableOnTap]);
}
