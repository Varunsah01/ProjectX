import { mobileExpoConfig } from "../../config/expo-config";

export const APP_DISPLAY_NAME = "ProjectX Field";
export const APP_MONOGRAM = "PX";
export const APP_PILOT_LABEL = "Pilot";
export const APP_OPERATOR_FALLBACK_NAME = APP_DISPLAY_NAME;
export const APP_VERSION = mobileExpoConfig.version ?? "0.1.0";
export const APP_ANDROID_PACKAGE_ID = mobileExpoConfig.android?.package ?? "Not configured";
