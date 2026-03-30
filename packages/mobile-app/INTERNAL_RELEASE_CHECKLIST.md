# Internal Release Checklist

Use this checklist before every Android internal build distribution.

## Quick Validation

Run this from the repo root:

```bash
npm run check:release -w packages/mobile-app
```

What it validates automatically:

- `npm run check:env -w packages/mobile-app` resolves Expo config successfully.
- `EXPO_PUBLIC_API_URL` passes the non-dev build contract in `packages/mobile-app/app.config.ts`.
- app config asset references still exist for icon, splash, and Android adaptive icon.
- `packages/mobile-app/eas.json` still contains the `build.internal` Android APK profile.

## Manual Sign-Off

Mark these before sharing the APK with internal testers:

- [ ] `EXPO_PUBLIC_API_URL` is set to the backend that internal testers should use.
- [ ] Login path is ready on that backend. Confirm a fresh sign-in succeeds on a real Android device.
- [ ] Proof upload flow was tested manually on a real Android device.
- [ ] Camera permission was tested manually: first prompt, allow path, deny path, and retry/settings path.
- [ ] Gallery/media permission was tested manually: first prompt, allow path, deny path, and retry/settings path.
- [ ] Sync retry was tested manually by creating a pending action, restoring connectivity, and using the retry path.

## Recommended Manual Pass

Use the fuller device walkthrough here when needed:

- `packages/mobile-app/ANDROID_DEVICE_TEST_CHECKLIST.md`

Minimum pilot pass before internal distribution:

1. Sign in on the target backend.
2. Open a job and confirm data loads normally.
3. Save one status or notes update offline, then retry sync after reconnecting.
4. Add proof from camera or gallery and confirm the upload or pending-retry path behaves as expected.

## Internal Build Command

Run from `packages/mobile-app` after the checklist is complete:

```bash
EXPO_PUBLIC_API_URL=https://your-mobile-api.example.com eas build --platform android --profile internal
```

If `EXPO_PUBLIC_API_URL` is already managed in EAS env, use:

```bash
eas build --platform android --profile internal
```
