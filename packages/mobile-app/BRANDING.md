# Mobile Branding

This app now uses a stable pilot branding pack so branding swaps do not require Expo config rewrites.

## Current Pilot Pack

Expo currently points to:

- `packages/mobile-app/assets/branding/pilot/icon.png`
- `packages/mobile-app/assets/branding/pilot/adaptive-icon.png`
- `packages/mobile-app/assets/branding/pilot/splash-icon.png`

These files are safe placeholders for internal and pilot builds. Replace them in place when final design assets are ready.

## Visible App Copy

Visible mobile branding copy is centralized in:

- `packages/mobile-app/src/constants/branding.ts`

Update that file when you need to change:

- app display name
- short monogram
- pilot label
- fallback operator name used when no signed-in name is available

## Safe Swap Rules

When replacing branding assets:

- keep the same filenames so Expo config does not need to change
- keep `icon.png` as a square app icon PNG
- keep `adaptive-icon.png` as a square foreground PNG for Android adaptive icons
- keep `splash-icon.png` as a PNG that works on the existing `#0F766E` splash background
- run `npm run check:env -w packages/mobile-app` after swapping files

## Current Visual Direction

The pilot build now aligns on a simple teal brand color:

- primary brand: `#0F766E`
- soft brand surface: `#CCFBF1`

If final design assets use a different primary color, update:

- `packages/mobile-app/src/constants/theme.ts`
- splash/adaptive icon background color in `packages/mobile-app/config/expo-config.ts`
