export type MobileBuildIntent = "development" | "non-dev";

export type MobileApiResolutionMode =
  | "configured"
  | "android-emulator-fallback"
  | "ios-localhost-fallback"
  | "missing";

export type MobileEnvContract = {
  apiUrl: string | null;
  apiUrlRequired: boolean;
  buildIntent: MobileBuildIntent;
  buildProfile: string | null;
  isLocalhostLikeApiUrl: boolean;
  errors: string[];
  warnings: string[];
};

export type MobileRuntimeEnvDiagnostics = MobileEnvContract & {
  mode: MobileApiResolutionMode;
  baseUrl: string | null;
  mobileApiBaseUrl: string | null;
  configError: string | null;
  targetNotice: string | null;
};

type EnvInput = Record<string, string | undefined>;

export function getMobileEnvContract(rawEnv: EnvInput): MobileEnvContract;

export function formatMobileEnvValidationError(
  contract: MobileEnvContract,
): string;

export function getMobileRuntimeEnvDiagnostics(
  rawEnv: EnvInput,
  input: {
    isDevRuntime: boolean;
    platform: "android" | "ios";
  },
): MobileRuntimeEnvDiagnostics;
