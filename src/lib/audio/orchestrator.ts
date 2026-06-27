import type { AudioSourceProvider } from "./provider-types";
import type { ReadingAudioContext, Playlist, TrackMetadata } from "./types";
import { resolveGenreToKeywords, resolvePlaylist } from "./resolver";
import { rankTracks } from "./ranking";
import { cacheGet, cacheSet } from "./cache";
import { InvidiousProvider } from "./providers/invidious-provider";
import { ArchiveProvider } from "./providers/archive-provider";

let _providers: AudioSourceProvider[] | null = null;

function getProviders(): AudioSourceProvider[] {
  if (!_providers) {
    _providers = [
      new InvidiousProvider(),
      new ArchiveProvider(),
    ];
  }
  return _providers;
}

export function setProviders(providers: AudioSourceProvider[]): void {
  _providers = providers;
}

export function getAudioSourceProviders(): AudioSourceProvider[] {
  return getProviders();
}

export async function resolveContextToPlaylist(context: ReadingAudioContext): Promise<Playlist> {
  const keywords = resolveGenreToKeywords(context);
  if (!keywords) {
    console.log("[Audio] No genre keywords found for subjects:", context.genres);
    return resolvePlaylist(context);
  }
  console.log("[Audio] Genre keywords resolved:", keywords);

  const cacheKey = `playlist:${keywords.join(",")}`;
  const cached = cacheGet(cacheKey);
  if (cached && cached.length > 0) {
    console.log("[Audio] Returning cached playlist:", cached.length, "tracks");
    return cached;
  }

  const providers = getProviders();
  console.log("[Audio] Running providers:", providers.map((p) => p.name));
  const results = await Promise.allSettled(
    providers.map((p) => p.search(context)),
  );

  const allTracks: TrackMetadata[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      console.log(`[Audio] Provider returned ${result.value.length} tracks`);
      if (result.value.length > 0) {
        allTracks.push(...result.value);
      }
    } else {
      console.log("[Audio] Provider rejected:", result.reason);
    }
  }

  if (allTracks.length === 0) {
    console.log("[Audio] All providers empty, falling back to local");
    return resolvePlaylist(context);
  }

  const ranked = rankTracks(allTracks, keywords);
  const top = ranked.slice(0, 10);
  console.log("[Audio] Returning top", top.length, "tracks, first:", top[0]?.title);

  cacheSet(cacheKey, top);
  return top;
}
