export async function register() {
  const { assertDataResidency } = await import("@/lib/compliance/data-residency");
  assertDataResidency();
}
