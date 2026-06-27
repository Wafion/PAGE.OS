import type { TrackMetadata } from "./types";

type CacheEntry = {
  data: TrackMetadata[];
  expiry: number;
};

const TTL = 1000 * 60 * 30;
const HEALTH_TTL = 1000 * 60 * 5;

const store = new Map<string, CacheEntry>();
const healthStore = new Map<string, { healthy: boolean; nextRetry: number }>();

export function cacheGet(key: string): TrackMetadata[] | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function cacheSet(key: string, data: TrackMetadata[]): void {
  store.set(key, { data, expiry: Date.now() + TTL });
}

export function cacheClear(): void {
  store.clear();
  healthStore.clear();
}

export function markProviderHealthy(provider: string): void {
  healthStore.set(provider, { healthy: true, nextRetry: 0 });
}

export function markProviderUnhealthy(provider: string): void {
  healthStore.set(provider, { healthy: false, nextRetry: Date.now() + HEALTH_TTL });
}

export function isProviderHealthy(provider: string): boolean {
  const entry = healthStore.get(provider);
  if (!entry) return true;
  if (!entry.healthy && Date.now() > entry.nextRetry) {
    healthStore.delete(provider);
    return true;
  }
  return entry.healthy;
}
