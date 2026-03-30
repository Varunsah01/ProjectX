# Mobile App Deployment And Internal Testing

Use this guide for local Expo runs and Android internal APK testing for `packages/mobile-app`.

## Local Run

Run these from the repo root unless noted.

1. Install dependencies:

```bash
npm install
```

2. Create `packages/mobile-app/.env.local` and set the mobile API URL:

```env
EXPO_PUBLIC_API_URL=https://your-mobile-api.example.com
EXPO_PUBLIC_ENABLE_TEST_LOGS=true
```

Notes:

- `EXPO_PUBLIC_API_URL` must be reachable from the Android device.
- For internal builds, `EXPO_PUBLIC_API_URL` is required.
- Do not use `localhost`, `127.0.0.1`, `0.0.0.0`, `::1`, or `10.0.2.2` for internal APKs.
- Local Expo development may omit `EXPO_PUBLIC_API_URL` only when you intentionally want the emulator-only fallback.

3. Validate the resolved Expo config:

```bash
npm run check:env -w packages/mobile-app
```

4. Start Expo locally:

```bash
npm run dev:mobile
```

Equivalent workspace command:

```bash
npm run start -w packages/mobile-app
```

Android emulator shortcut:

```bash
npm run android -w packages/mobile-app
```

## Android Internal APK Build

Run EAS commands from `packages/mobile-app` so `app.config.ts` and `eas.json` resolve together.

The checked-in build profile is:

- profile: `internal`
- distribution: `internal`
- channel: `internal`
- Android build type: `apk`

Build command:

```bash
cd packages/mobile-app
EXPO_PUBLIC_API_URL=https://your-mobile-api.example.com eas build --platform android --profile internal
```

If you already manage `EXPO_PUBLIC_API_URL` in EAS env, run:

```bash
cd packages/mobile-app
eas build --platform android --profile internal
```

## Real Android Device Testing

1. Build the APK with the `internal` profile.
2. Install the APK on the device.
3. Confirm the phone can reach `EXPO_PUBLIC_API_URL` on the network you plan to test.
4. Open the app.
5. On first launch, complete the built-in `Device Check` screen.
6. Sign in with employee ID or work phone plus password.
7. Allow camera and photo access when prompted so proof capture/upload can work.
8. Re-open `Profile > Device Check` later if you need to re-check the phone.

For the field pass, also use:

- `packages/mobile-app/ANDROID_DEVICE_TEST_CHECKLIST.md`

## Common Failure Cases

### `npm run check:env -w packages/mobile-app` fails

Check:

- `EXPO_PUBLIC_API_URL` is set for non-dev/internal builds
- the URL is a valid absolute `http://` or `https://` URL
- the URL is not localhost-like for internal builds
- `app.json` still has valid Android config and existing asset paths

### App warns that the build will not work on a physical phone

Check:

- you are not using the emulator fallback URL
- `EXPO_PUBLIC_API_URL` points to a backend reachable from the device
- you rebuilt and reinstalled the APK after fixing env

### Sign-in or refresh fails on a real device

Check:

- the phone can reach the backend on Wi-Fi or mobile data
- the hostname is correct and exposed outside your laptop
- the backend is running
- the build is pointed at the correct server

### Camera or photo upload does not work

Check:

- Android camera permission is allowed
- Android photo/media permission is allowed
- if permission is blocked, open Android settings and allow it there
- re-run `Profile > Device Check` if you want a quick permission check

### EAS build succeeds but the wrong artifact or config is used

Check:

- you ran the build from `packages/mobile-app`
- you used `--profile internal`
- `EXPO_PUBLIC_API_URL` was present in the shell or EAS environment at build time
