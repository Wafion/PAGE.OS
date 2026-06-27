import type { ReadingAudioContext, Playlist } from "./types";
import { GENRE_MAP } from "./types";
import { PLAYLISTS, DEFAULT_PLAYLIST } from "./playlists";
import { GENRE_SEARCH_TERMS } from "./provider-types";
import { normalizeGenre } from "./utils";

const MULTI_WORD_KEYS = Object.keys(GENRE_MAP).filter((k) => k.includes(" "));

export function fuzzyMatchGenre(subject: string): string | null {
  const exact = GENRE_MAP[subject];
  if (exact) return exact;

  const lower = subject.toLowerCase();

  for (const key of MULTI_WORD_KEYS) {
    if (lower.includes(key)) {
      return GENRE_MAP[key];
    }
  }

  const words = lower.split(/\s+/);
  for (const word of words) {
    const mapped = GENRE_MAP[word];
    if (mapped) return mapped;
  }

  return null;
}

function resolveMappedGenre(
  context: ReadingAudioContext,
  getResult: (mapped: string) => unknown,
): unknown {
  const seen = new Set<string>();

  for (const raw of context.genres) {
    const normalized = normalizeGenre(raw);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const mapped = fuzzyMatchGenre(normalized);
    if (mapped) {
      const result = getResult(mapped);
      if (result) return result;
    }
  }

  return null;
}

export function resolveGenreToKeywords(context: ReadingAudioContext): string[] | null {
  return resolveMappedGenre(context, (mapped) => {
    const keywords = GENRE_SEARCH_TERMS[mapped];
    return keywords ?? null;
  }) as string[] | null;
}

export function resolvePlaylist(context: ReadingAudioContext): Playlist {
  const result = resolveMappedGenre(context, (mapped) => {
    const playlist = PLAYLISTS[mapped];
    return playlist ? [...playlist] : null;
  });
  return (result as Playlist) ?? [...DEFAULT_PLAYLIST];
}
