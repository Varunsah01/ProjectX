# Feature Flags

Feature flags let you roll out risky changes incrementally — per org, per user, or by percentage — and roll back instantly from the GrowthBook UI without redeploying.

---

## SDK & Hosting

**GrowthBook Cloud (free tier)** — `app.growthbook.io`

- Free: unlimited flags, 10 seats
- Features payload is a CDN-delivered JSON file (`https://cdn.growthbook.io/api/features/{clientKey}`)
- Server-side module caches it in memory for 30 s → zero CDN calls on hot path
- Changes propagate in ≤60 s without a deploy

### Self-hosted option

Add to `docker-compose.yml` if you need data residency:

```yaml
growthbook:
  image: growthbook/growthbook:latest
  ports: ["3100:3100", "3101:3101"]
  environment:
    - MONGODB_URI=mongodb://mongo:27017/growthbook
    - APP_ORIGIN=http://localhost:3100
    - API_HOST=http://localhost:3101
  depends_on: [mongo]

mongo:
  image: mongo:6
  volumes: [mongo_data:/data/db]
```

Set `NEXT_PUBLIC_GROWTHBOOK_API_HOST=http://localhost:3101` to point the SDKs at your self-hosted instance.

---

## Initial Setup

1. Create a free account at **app.growthbook.io**
2. **SDK Connections → Add Connection** → choose `Node.js / Next.js`
3. Copy the **Client Key** (looks like `sdk-abc123`)
4. Add to `.env.local` (all packages share the same key):

```env
NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY=sdk-abc123
EXPO_PUBLIC_GROWTHBOOK_CLIENT_KEY=sdk-abc123
```

5. Restart dev servers — flags are live.

---

## Flag Naming Convention

`area.flag-name` — lowercase kebab, dot separator.

| Flag | Default | Purpose |
|------|---------|---------|
| `invoices.gst-pdf-template` | ON | Full GST PDF with tax breakdown; set OFF to roll back to simple template |
| `portal.invoices` | ON | Invoice section in customer portal |
| `portal.tickets` | ON | Ticket / complaint section in customer portal |
| `portal.contracts` | ON | Contract view in customer portal |

### Targeting dimensions available

Every evaluation passes these attributes (set automatically from the session):

| Attribute | Source | Use for |
|-----------|--------|---------|
| `userId` | User ID / Customer ID | Per-user rollout |
| `orgId` | Organization ID | Per-org rollout |
| `role` | User role (ADMIN, MANAGER, …) | Role-based gating |
| `plan` | _(optional, add to session)_ | Plan-tier gating |

---

## Creating a Flag in GrowthBook UI

1. **Features → Add Feature**
2. Key: `area.flag-name` (match the convention above)
3. Type: `Boolean` (use `String`/`JSON` for multivariate experiments)
4. Default value: `true` (ON by default; set `false` to start dark)
5. Add targeting rules as needed:
   - **Org rollout**: Attribute `orgId` → Force `true` for specific org IDs
   - **Percentage rollout**: Add a % rule (hashes on `userId`)
   - **Kill switch**: Set default to `false`, add no rules → all traffic OFF

---

## Usage

### Server-side (API routes, Server Actions)

```typescript
import { evalFeature } from "@/lib/feature-flags/server";

const enabled = await evalFeature("invoices.gst-pdf-template", {
  userId: user.id,
  orgId: user.organizationId,
  role: user.role,
});

if (!enabled) {
  // fallback behaviour
}
```

Every `evalFeature` call emits a Pino log line tagged with `requestId` (satisfies observability requirement):

```json
{ "level": "debug", "flag": "invoices.gst-pdf-template", "result": true,
  "userId": "...", "orgId": "...", "requestId": "abc-123", "msg": "feature.eval" }
```

### Client-side (React components)

```tsx
import { useFeature, FeatureGate } from "@/lib/feature-flags/client";

// Hook
function MyComponent() {
  const enabled = useFeature("portal.invoices");
  return enabled ? <InvoicesView /> : null;
}

// Declarative gate
<FeatureGate flag="portal.invoices" fallback={<ComingSoon />}>
  <InvoicesView />
</FeatureGate>
```

### Mobile (React Native / Expo)

```typescript
import { useFeatureFlag } from "../providers/FeatureFlagsProvider";

function MyScreen() {
  const showBeta = useFeatureFlag("jobs.beta-checklist");
  return showBeta ? <BetaChecklist /> : <StandardChecklist />;
}
```

---

## How to Roll Back

1. Open **app.growthbook.io → Features → `invoices.gst-pdf-template`**
2. Set default value to **`false`** (or add a kill-switch rule)
3. Save — propagates in ≤60 s, no redeploy needed

---

## Observability

- **Server-side**: each `evalFeature()` call logs `"feature.eval"` at `DEBUG` level via Pino
  — includes `flag`, `result`, `userId`, `orgId`, and `requestId` from AsyncLocalStorage
- **Client-side**: GrowthBook devtools available in development (`enableDevMode: true`)
- Enable debug logging: `LOG_LEVEL=debug` in `.env.local`

---

## Fail-safe Behaviour

| Scenario | Behaviour |
|----------|-----------|
| GrowthBook CDN unreachable | Stale in-memory cache used (30 s TTL) |
| App cold start, no cache | All flags return `false` (OFF) |
| Mobile offline | AsyncStorage cache used; CDN fetch skipped |
| `NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY` not set | All flags return `false` (OFF) |
| Invalid JSON in serialized features | All flags return `false` (OFF) |
