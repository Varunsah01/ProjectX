export const fallbackTimeSlots = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "12:00 - 14:00",
  "14:00 - 16:00",
  "16:00 - 18:00",
] as const;

export function listMockJobTimeSlots() {
  return [...fallbackTimeSlots];
}

function hashSeed(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return hash;
}

// The current backend exposes only a scheduled date, not a service window.
// Keep this fallback isolated so it can be removed cleanly when real slot
// data is added to the mobile API.
export function getMockJobTimeSlot(seed: string) {
  return fallbackTimeSlots[hashSeed(seed) % fallbackTimeSlots.length];
}
