/**
 * Runtime assertion that the database host matches the expected region.
 * Called from instrumentation.ts on app startup.
 * Only enforced in production (NODE_ENV === "production").
 */
export function assertDataResidency() {
  const expectedRegion = process.env.EXPECTED_DB_REGION;
  if (!expectedRegion || process.env.NODE_ENV !== "production") return;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("Data residency check failed: DATABASE_URL is not set");
  }

  // Parse hostname from postgresql:// URL by swapping the scheme to http.
  const host = new URL(dbUrl.replace(/^postgresql(s)?:\/\//, "http$1://")).hostname;
  if (!host.includes(expectedRegion)) {
    throw new Error(
      `Data residency violation: DB host "${host}" does not match expected region "${expectedRegion}". ` +
        "Aborting startup to prevent cross-border data processing."
    );
  }
}
