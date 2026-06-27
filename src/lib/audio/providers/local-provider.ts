import type { AudioSourceProvider } from "../provider-types";
import type { ReadingAudioContext, TrackMetadata } from "../types";
import { fuzzyMatchGenre } from "../resolver";
import { PLAYLISTS, DEFAULT_PLAYLIST } from "../playlists";

export class LocalProvider implements AudioSourceProvider {
  readonly name = "local";

  async search(context: ReadingAudioContext): Promise<TrackMetadata[]> {
    const seen = new Set<string>();
    for (const raw of context.genres) {
      const normalized = raw.trim().toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      const mapped = fuzzyMatchGenre(normalized);
      if (mapped && PLAYLISTS[mapped]) {
        return [...PLAYLISTS[mapped]];
      }
    }
    return [...DEFAULT_PLAYLIST];
  }
}
