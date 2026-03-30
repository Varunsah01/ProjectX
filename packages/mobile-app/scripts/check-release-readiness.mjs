import fs from "node:fs";
import path from "node:path";

const packageRoot = path.resolve(import.meta.dirname, "..");
const easJsonPath = path.join(packageRoot, "eas.json");
const checklistPath = path.join(packageRoot, "INTERNAL_RELEASE_CHECKLIST.md");

function fail(message) {
  console.error(`Release readiness check failed: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(easJsonPath)) {
  fail("Missing packages/mobile-app/eas.json.");
}

const easJson = JSON.parse(fs.readFileSync(easJsonPath, "utf8"));
const internalProfile = easJson?.build?.internal;

if (!internalProfile) {
  fail("Missing eas.json build.internal profile.");
}

if (internalProfile.distribution !== "internal") {
  fail('eas.json build.internal.distribution must be "internal".');
}

if (internalProfile.android?.buildType !== "apk") {
  fail('eas.json build.internal.android.buildType must be "apk".');
}

if (!fs.existsSync(checklistPath)) {
  fail("Missing INTERNAL_RELEASE_CHECKLIST.md.");
}

console.log("Release config checks passed.");
console.log("- Existing `npm run check:env` already validated Expo config resolution.");
console.log("- That covers EXPO_PUBLIC_API_URL rules, app config asset references, and Android app config checks.");
console.log("- This step confirmed `packages/mobile-app/eas.json` still includes the Android internal APK profile.");
console.log("");
console.log("Manual sign-off still required:");
console.log("- Login path readiness");
console.log("- Proof upload flow");
console.log("- Camera and gallery permissions");
console.log("- Sync retry");
console.log("");
console.log("Before distributing an internal APK, work through:");
console.log("- packages/mobile-app/INTERNAL_RELEASE_CHECKLIST.md");
