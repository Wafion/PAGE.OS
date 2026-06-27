export function pickRandom<T>(items: readonly T[], avoidKey?: string | null, keyFn?: (item: T) => string): T {
  if (items.length === 0) {
    throw new Error("Cannot pick from empty array");
  }

  if (items.length === 1) {
    return items[0];
  }

  const candidates = avoidKey != null && keyFn
    ? items.filter((item) => keyFn(item) !== avoidKey)
    : [...items];

  if (candidates.length === 0) {
    return items[0];
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeGenre(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function trackUrl(track: { url: string }): string {
  return track.url;
}
