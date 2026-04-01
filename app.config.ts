import fs from "node:fs";
import path from "node:path";
import type { ExpoConfig } from "expo/config";
import {
  formatMobileEnvValidationError,
  getMobileEnvContract,
} from "./packages/mobile-app/config/env";
import {
  MOBILE_EAS_PROJECT_ID,
  mobileExpoConfig,
} from "./packages/mobile-app/config/expo-config";

const MOBILE_APP_DIRECTORY = path.join(__dirname, "packages", "mobile-app");
const androidPackagePattern = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

function assertConfigCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertAssetFileExists(relativePath: string | undefined, label: string) {
  assertConfigCondition(
    relativePath,
    `Mobile app config is missing ${label}.`,
  );

  const absolutePath = path.resolve(__dirname, relativePath);

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
    "Mobile app config must define android.package for Android builds.",
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

function loadMobileEnvLocalIfPresent() {
  const envLocalPath = path.join(MOBILE_APP_DIRECTORY, ".env.local");

  if (!fs.existsSync(envLocalPath)) {
    return;
  }

  const envLines = fs.readFileSync(envLocalPath, "utf8").split(/\r?\n/);

  for (const rawLine of envLines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;

    if (process.env[key]) {
      continue;
    }

    process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, "");
  }
}

function prefixMobileAssetPath(assetPath?: string) {
  if (!assetPath || path.isAbsolute(assetPath)) {
    return assetPath;
  }

  const normalizedAssetPath = assetPath.replace(/\\/g, "/").replace(/^\.\//, "");

  if (normalizedAssetPath.startsWith("packages/mobile-app/")) {
    return normalizedAssetPath;
  }

  return `packages/mobile-app/${normalizedAssetPath}`;
}

export default function getRootAppConfig(): ExpoConfig {
  loadMobileEnvLocalIfPresent();
  const mobileEnvContract = getMobileEnvContract(
    process.env as Record<string, string | undefined>,
  );

  if (mobileEnvContract.errors.length > 0) {
    throw new Error(formatMobileEnvValidationError(mobileEnvContract));
  }

  const mobileConfig: ExpoConfig = {
    ...mobileExpoConfig,
    extra: {
      ...(mobileExpoConfig.extra ?? {}),
      mobileEnv: {
        apiUrlRequired: mobileEnvContract.apiUrlRequired,
        buildIntent: mobileEnvContract.buildIntent,
        buildProfile: mobileEnvContract.buildProfile ?? "local",
      },
    },
  };

  const prefixedConfig: ExpoConfig = {
    ...mobileConfig,
    icon: prefixMobileAssetPath(mobileConfig.icon),
    splash: mobileConfig.splash
      ? {
          ...mobileConfig.splash,
          image: prefixMobileAssetPath(mobileConfig.splash.image),
        }
      : mobileConfig.splash,
    android: mobileConfig.android
      ? {
          ...mobileConfig.android,
          adaptiveIcon: mobileConfig.android.adaptiveIcon
            ? {
                ...mobileConfig.android.adaptiveIcon,
                foregroundImage: prefixMobileAssetPath(
                  mobileConfig.android.adaptiveIcon.foregroundImage,
                ),
              }
            : mobileConfig.android.adaptiveIcon,
        }
      : mobileConfig.android,
    extra: {
      ...(mobileConfig.extra ?? {}),
      eas: {
        ...(mobileConfig.extra?.eas ?? {}),
        projectId: MOBILE_EAS_PROJECT_ID,
      },
    },
  };

  assertAssetFileExists(prefixedConfig.icon, "expo.icon asset");
  assertAssetFileExists(prefixedConfig.splash?.image, "expo.splash.image asset");
  assertAssetFileExists(
    prefixedConfig.android?.adaptiveIcon?.foregroundImage,
    "expo.android.adaptiveIcon.foregroundImage asset",
  );
  validateAndroidBuildConfig(prefixedConfig);

  return prefixedConfig;
}
