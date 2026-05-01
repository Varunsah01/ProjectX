# Mobile API v1

All mobile-only routes live under `/api/mobile/v1/*`. Versioning policy: any semver-incompatible change (renamed/removed fields, altered request shapes, changed status codes for the same condition, removed routes) ships under a new prefix (`/api/mobile/v2/*`); v1 stays supported for at least 12 months after v2 launches so installed mobile builds keep working through the rollout window. Additive changes (new optional fields, new routes) ship inline within v1.
