import fs from "node:fs";
import path from "node:path";
import type { ExpoConfig } from "expo/config";
import {
  formatMobileEnvValidationError,
  getMobileEnvContract,
} from "./config/env";

const appJson = require("./app.json");
const projectRoot = __dirname;
const androidPackagePattern = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

function assertConfigCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertAssetFileExists(relativePath: string | undefined, label: string) {
  assertConfigCondition(
    relativePath,
    `Mobile app config is missing ${label}.`,
  );

  const absolutePath = path.resolve(projectRoot, relativePath);

  assertConfigCondition(
    fs.existsSync(absolutePath),
    `Mobile app config references a missing ${label}: ${relativePath}`,
  );
}

function validateAndroidBuildConfig(config: ExpoConfig) {
  const androidPackage = config.android?.package;
  const versionCode = config.android?.versionCode;

  assertConfigCondition(
    androidPackage,
    "Mobile app config must define android.package for Android internal builds.",
  );
  assertConfigCondition(
    androidPackagePattern.test(androidPackage),
    `android.package must be a valid Android application id. Received: ${androidPackage}`,
  );
  assertConfigCondition(
    Number.isInteger(versionCode) && Number(versionCode) > 0,
    "android.versionCode must be a positive integer for Android builds.",
  );
}

export default function getAppConfig(): ExpoConfig {
  const mobileEnvContract = getMobileEnvContract(
    process.env as Record<string, string | undefined>,
  );

  if (mobileEnvContract.errors.length > 0) {
    throw new Error(formatMobileEnvValidationError(mobileEnvContract));
  }

  const config: ExpoConfig = {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra ?? {}),
      mobileEnv: {
        apiUrlRequired: mobileEnvContract.apiUrlRequired,
        buildIntent: mobileEnvContract.buildIntent,
        buildProfile: mobileEnvContract.buildProfile ?? "local",
      },
    },
  };

  assertAssetFileExists(config.icon, "expo.icon asset");
  assertAssetFileExists(config.splash?.image, "expo.splash.image asset");
  assertAssetFileExists(
    config.android?.adaptiveIcon?.foregroundImage,
    "expo.android.adaptiveIcon.foregroundImage asset",
  );
  validateAndroidBuildConfig(config);

  return config;
}
