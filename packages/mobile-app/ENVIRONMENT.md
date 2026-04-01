# Mobile Environment Setup

This document covers the Expo environment contract for the Android field operator app.

## Internal Build Config Location

- Expo app config: `packages/mobile-app/app.config.ts`
- Shared Expo metadata: `packages/mobile-app/config/expo-config.ts`
- EAS build profiles: `packages/mobile-app/eas.json`

Run EAS commands from `packages/mobile-app` so the app config and `eas.json` resolve together.

## Final Contract

- `EXPO_PUBLIC_API_URL`
  Required for every non-dev build.
  Optional only for local Expo development sessions that intentionally use localhost or `10.0.2.2`.
- `EXPO_PUBLIC_ENABLE_TEST_LOGS`
  Optional.
  Enables extra JS-side diagnostics for internal test builds when set to `true`.

## What Counts As Non-Dev

The app treats the following as non-dev and will fail config validation if `EXPO_PUBLIC_API_URL` is missing or localhost-like:

- any EAS build profile
- CI builds
- `NODE_ENV=production`

## Allowed Local Development Fallback

Only local Expo dev sessions may fall back to:

- Android emulator: `http://10.0.2.2:3001`
- iOS simulator: `http://localhost:3001`

That fallback is not allowed for Android internal builds or any production-like build.

## Local Expo Setup

1. Create `packages/mobile-app/.env.local`.
2. Set:

```env
EXPO_PUBLIC_API_URL=https://your-mobile-api.example.com
EXPO_PUBLIC_ENABLE_TEST_LOGS=true
```

3. Run the app from the repo root with `npm run dev:mobile`.
4. Validate the resolved Expo config with `npm run check:env -w packages/mobile-app`.

If you intentionally want localhost fallback for emulator-only development, you may omit `EXPO_PUBLIC_API_URL`.

## EAS Internal Build Setup

Preferred approach: store `EXPO_PUBLIC_API_URL` in the EAS environment or CI secret store instead of committing it.

### Option A: Set It In EAS

Set `EXPO_PUBLIC_API_URL` in the environment used by your Android internal build before running:

```bash
cd packages/mobile-app
eas build --platform android --profile internal
```

### Option B: Provide It In The Shell For The Build Command

```bash
cd packages/mobile-app
EXPO_PUBLIC_API_URL=https://your-mobile-api.example.com eas build --platform android --profile internal
```

### Option C: Use An `eas.json` Profile `env` Block

Do this only if committing the value is acceptable for your setup.

```json
{
  "build": {
    "internal": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://your-mobile-api.example.com"
      }
    }
  }
}
```

## Internal Android Build Profile

The checked-in `packages/mobile-app/eas.json` now defines:

- `build.internal.distribution = "internal"`
- `build.internal.channel = "internal"`
- `build.internal.android.buildType = "apk"`

That profile is intended for pilot installs on physical Android devices without exposing emulator-only behavior.

## Validation Rules

For non-dev builds, `EXPO_PUBLIC_API_URL` must:

- be present
- be an absolute `http://` or `https://` URL
- not point to `localhost`
- not point to `127.0.0.1`
- not point to `0.0.0.0`
- not point to `::1`
- not point to `10.0.2.2`

## Failure Mode

If the env contract is broken:

- Expo config evaluation fails early through `packages/mobile-app/app.config.ts`
- missing icon or splash asset references also fail early through `packages/mobile-app/app.config.ts`
- invalid or missing `android.package` / `android.versionCode` also fail early through `packages/mobile-app/app.config.ts`
- the app runtime also surfaces a clear configuration error instead of silently using localhost in internal builds
- developers can reproduce the same validation locally with `npm run check:env -w packages/mobile-app`
