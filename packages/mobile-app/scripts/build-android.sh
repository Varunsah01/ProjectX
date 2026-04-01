#!/bin/bash

# Build an Android APK using EAS local builds.
#
# Usage (from anywhere in the repo):
#   bash packages/mobile-app/scripts/build-android.sh
#
# What this does:
#   1. Writes EXPO_PUBLIC_API_URL to .env.production (read by Expo in EAS builds
#      when NODE_ENV=production; .env.local is intentionally skipped by EAS).
#   2. Runs eas build --local so the build executes on this machine and can read
#      the local .env.production file.
#
# Prerequisites:
#   - eas-cli installed globally (npm install -g eas-cli)
#   - Logged in to EAS (eas login)
#   - packages/mobile-app/app.json has a non-empty extra.eas.projectId
#     (run: cd packages/mobile-app && eas init)

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Resolve the mobile-app directory regardless of where the script is called from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_PRODUCTION_FILE="$MOBILE_DIR/.env.production"
APP_JSON="$MOBILE_DIR/app.json"

cd "$MOBILE_DIR"

echo -e "${BLUE}EAS Android Build${NC}\n"

# --- Preflight checks ---

if ! command -v eas &>/dev/null; then
  echo -e "${RED}eas-cli not found. Install it with: npm install -g eas-cli${NC}"
  exit 1
fi

if ! eas whoami &>/dev/null; then
  echo -e "${RED}Not logged in to EAS. Run: eas login${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Logged in to EAS as $(eas whoami)${NC}"

# Check that the project is linked (non-empty projectId)
PROJECT_ID=$(node -e "
  const a = require('$APP_JSON');
  process.stdout.write(a?.expo?.extra?.eas?.projectId ?? '');
")
if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}No EAS projectId found in app.json.${NC}"
  echo -e "Run: cd packages/mobile-app && eas init"
  exit 1
fi
echo -e "${GREEN}✓ EAS project: $PROJECT_ID${NC}"

# --- API URL ---

echo ""
# Offer the current value as default if one already exists
CURRENT_URL=$(grep -s '^EXPO_PUBLIC_API_URL=' "$ENV_PRODUCTION_FILE" | cut -d= -f2-)
if [ -n "$CURRENT_URL" ]; then
  echo -e "${YELLOW}Current API URL: $CURRENT_URL${NC}"
  read -p "Enter new API URL (or press Enter to keep current): " API_URL
  API_URL="${API_URL:-$CURRENT_URL}"
else
  read -p "Enter your backend API URL (e.g., https://api.example.com): " API_URL
fi

if [[ ! $API_URL =~ ^https?:// ]]; then
  echo -e "${RED}Error: URL must start with http:// or https://${NC}"
  exit 1
fi

# Write to .env.production — this file is:
#   - Read by Expo/EAS when NODE_ENV=production (set in eas.json internal/production profiles)
#   - Not gitignored (unlike .env and .env.local)
#   - Ignored/skipped in local `expo start` dev sessions in favour of .env.local
if [ -f "$ENV_PRODUCTION_FILE" ]; then
  # Update in place if key already exists, otherwise append
  if grep -q '^EXPO_PUBLIC_API_URL=' "$ENV_PRODUCTION_FILE"; then
    # Using a temp file to avoid sed -i portability issues between macOS and Linux
    TMP=$(mktemp)
    sed "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=$API_URL|" "$ENV_PRODUCTION_FILE" > "$TMP"
    mv "$TMP" "$ENV_PRODUCTION_FILE"
  else
    echo "EXPO_PUBLIC_API_URL=$API_URL" >> "$ENV_PRODUCTION_FILE"
  fi
else
  echo "EXPO_PUBLIC_API_URL=$API_URL" > "$ENV_PRODUCTION_FILE"
fi
echo -e "${GREEN}✓ Wrote EXPO_PUBLIC_API_URL to .env.production${NC}"

# --- Build ---

echo ""
echo -e "Profile:   internal (APK)"
echo -e "Platform:  Android"
echo -e "Mode:      local (builds on this machine)"
echo -e "API URL:   $API_URL"
echo ""
read -p "Proceed with build? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Build cancelled${NC}"
  exit 0
fi

echo -e "\n${YELLOW}Starting build...${NC}\n"
eas build --platform android --profile internal --local
echo -e "\n${GREEN}✓ Build complete${NC}"
