const LOCALHOST_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "10.0.2.2",
  "::1",
]);
const PLACEHOLDER_HOSTS = new Set(["your_deployed_web_app_url"]);

const API_URL_DOC_HINT =
  "See packages/mobile-app/ENVIRONMENT.md for local Expo and EAS build-time setup.";

function readEnvValue(rawEnv, key) {
  const value = rawEnv[key]?.trim();
  return value ? value : null;
}

function inferMobileBuildIntent(rawEnv) {
  const easBuildProfile = readEnvValue(rawEnv, "EAS_BUILD_PROFILE");
  const isEasBuild = readEnvValue(rawEnv, "EAS_BUILD") === "true" || Boolean(easBuildProfile);
  const isCi = readEnvValue(rawEnv, "CI") === "true";
  const nodeEnv = readEnvValue(rawEnv, "NODE_ENV");

  if (isEasBuild || isCi || nodeEnv === "production") {
    return "non-dev";
  }

  return "development";
}

function normalizeApiUrl(rawEnv) {
  const value = readEnvValue(rawEnv, "EXPO_PUBLIC_API_URL");

  if (!value) {
    return null;
  }

  return value.replace(/\/$/, "");
}

function isValidAbsoluteHttpUrl(value) {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function isLocalhostLikeUrl(value) {
  if (!value || !isValidAbsoluteHttpUrl(value)) {
    return false;
  }

  const parsedUrl = new URL(value);
  return LOCALHOST_HOSTS.has(parsedUrl.hostname.toLowerCase());
}

function isPlaceholderApiUrl(value) {
  if (!value || !isValidAbsoluteHttpUrl(value)) {
    return false;
  }

  const parsedUrl = new URL(value);
  const hostname = parsedUrl.hostname.toLowerCase();

  return (
    PLACEHOLDER_HOSTS.has(hostname) ||
    hostname.endsWith(".example.com") ||
    value.includes("YOUR_DEPLOYED_WEB_APP_URL")
  );
}

function getMobileEnvContract(rawEnv) {
  const buildIntent = inferMobileBuildIntent(rawEnv);
  const buildProfile = readEnvValue(rawEnv, "EAS_BUILD_PROFILE");
  const apiUrl = normalizeApiUrl(rawEnv);
  const apiUrlRequired = buildIntent === "non-dev";
  const isLocalhostLikeApiUrl = isLocalhostLikeUrl(apiUrl);
  const isPlaceholderApiUrlValue = isPlaceholderApiUrl(apiUrl);
  const errors = [];
  const warnings = [];

  if (apiUrl && !isValidAbsoluteHttpUrl(apiUrl)) {
    errors.push(
      "EXPO_PUBLIC_API_URL must be a valid absolute http:// or https:// URL.",
    );
  }

  if (!apiUrl && apiUrlRequired) {
    errors.push(
      "EXPO_PUBLIC_API_URL is required for non-dev builds, including Android internal builds.",
    );
  }

  if (apiUrl && isLocalhostLikeApiUrl && apiUrlRequired) {
    errors.push(
      "EXPO_PUBLIC_API_URL cannot point to localhost, 127.0.0.1, 0.0.0.0, ::1, or 10.0.2.2 for internal or production-like builds.",
    );
  }

  if (apiUrl && isPlaceholderApiUrlValue && apiUrlRequired) {
    errors.push(
      "EXPO_PUBLIC_API_URL must point to a real deployed backend. Placeholder example hosts are not allowed for internal or production-like builds.",
    );
  }

  if (!apiUrl && !apiUrlRequired) {
    warnings.push(
      "EXPO_PUBLIC_API_URL is not set. Local Expo development will fall back to localhost/emulator-only behavior.",
    );
  }

  return {
    apiUrl,
    apiUrlRequired,
    buildIntent,
    buildProfile,
    isLocalhostLikeApiUrl,
    isPlaceholderApiUrl: isPlaceholderApiUrlValue,
    errors,
    warnings,
  };
}

function formatMobileEnvValidationError(contract) {
  const buildProfileLine = contract.buildProfile
    ? `EAS build profile: ${contract.buildProfile}`
    : "EAS build profile: not set";

  return [
    "Mobile app environment validation failed.",
    `Build context: ${contract.buildIntent}`,
    buildProfileLine,
    ...contract.errors.map((error, index) => `${index + 1}. ${error}`),
    "",
    "Expected contract:",
    "- Local Expo development may omit EXPO_PUBLIC_API_URL and use the localhost fallback.",
    "- Any internal or production-like build must set EXPO_PUBLIC_API_URL to a real backend reachable from the Android device.",
    `- ${API_URL_DOC_HINT}`,
  ].join("\n");
}

function getRuntimeApiConfigError(contract) {
  if (contract.errors.length > 0) {
    return `${contract.errors[0]} ${API_URL_DOC_HINT}`;
  }

  return null;
}

function getMobileRuntimeEnvDiagnostics(rawEnv, input) {
  const contract = getMobileEnvContract(rawEnv);

  if (contract.apiUrl && contract.errors.length === 0) {
    return {
      ...contract,
      mode: "configured",
      baseUrl: contract.apiUrl,
      mobileApiBaseUrl: `${contract.apiUrl}/api/mobile`,
      configError: null,
      targetNotice: null,
    };
  }

  const fallbackAllowed = input.isDevRuntime && contract.buildIntent === "development";

  if (fallbackAllowed) {
    const baseUrl =
      input.platform === "android" ? "http://10.0.2.2:3001" : "http://localhost:3001";

    return {
      ...contract,
      mode:
        input.platform === "android"
          ? "android-emulator-fallback"
          : "ios-localhost-fallback",
      baseUrl,
      mobileApiBaseUrl: `${baseUrl}/api/mobile`,
      configError: null,
      targetNotice:
        input.platform === "android"
          ? "This build is set to the Android emulator server and will not work on a physical phone. Install the correct build before you continue."
          : null,
    };
  }

  return {
    ...contract,
    mode: "missing",
    baseUrl: null,
    mobileApiBaseUrl: null,
    configError: getRuntimeApiConfigError(contract),
    targetNotice: getRuntimeApiConfigError(contract),
  };
}

module.exports = {
  formatMobileEnvValidationError,
  getMobileEnvContract,
  getMobileRuntimeEnvDiagnostics,
};
