import appConfig from "../../app.json";

export const APP_DISPLAY_NAME = "ProjectX Field";
export const APP_MONOGRAM = "PX";
export const APP_PILOT_LABEL = "Pilot";
export const APP_OPERATOR_FALLBACK_NAME = APP_DISPLAY_NAME;
export const APP_VERSION = appConfig.expo.version;
export const APP_ANDROID_PACKAGE_ID = appConfig.expo.android?.package ?? "Not configured";
