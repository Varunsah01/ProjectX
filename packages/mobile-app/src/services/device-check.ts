import * as SecureStore from "expo-secure-store";

const DEVICE_CHECK_DISMISSED_KEY = "project-x.mobile.device-check.dismissed.v1";

export async function loadDeviceCheckDismissed() {
  try {
    return (await SecureStore.getItemAsync(DEVICE_CHECK_DISMISSED_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function dismissDeviceCheck() {
  try {
    await SecureStore.setItemAsync(DEVICE_CHECK_DISMISSED_KEY, "1");
  } catch {
    // Continue into the app even if dismissal persistence fails on this device.
  }
}
