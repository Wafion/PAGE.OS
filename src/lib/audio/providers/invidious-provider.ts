import type { AudioSourceProvider } from "../provider-types";
import type { ReadingAudioContext, TrackMetadata } from "../types";
import { GENRE_SEARCH_TERMS } from "../provider-types";
import { fuzzyMatchGenre } from "../resolver";
import { isProviderHealthy, markProviderHealthy, markProviderUnhealthy } from "../cache";

const INSTANCES = [
  "inv.thepixora.com",
  "yt.chocolatemoo53.com",
];

type InvidiousVideo = {
  videoId: string;
  title: string;
  author: string;
  lengthSeconds: number;
  videoThumbnails?: { url: string; quality: string }[];
  description?: string;
  descriptionHtml?: string;
  viewCount?: number;
};

export class InvidiousProvider implements AudioSourceProvider {
  readonly name = "invidious";

  private async fetchFromInstance(instance: string, query: string): Promise<InvidiousVideo[]> {
    const params = new URLSearchParams({
      q: query,
      type: "video",
      page: "1",
      sort: "relevance",
    });

    const res = await fetch(`https://${instance}/api/v1/search?${params}`, {
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      throw new Error(`Invidious ${instance} returned ${res.status}`);
    }

    const data = (await res.json()) as InvidiousVideo[];
    return data ?? [];
  }

  async search(context: ReadingAudioContext): Promise<TrackMetadata[]> {
    if (!isProviderHealthy(this.name)) {
      console.log("[Invidious] Skipping: marked unhealthy");
      return [];
    }

    const mapped = this.resolveGenre(context);
    if (!mapped) {
      console.log("[Invidious] No genre matched for subjects:", context.genres);
      return [];
    }

    const keywords = GENRE_SEARCH_TERMS[mapped] ?? [];
    if (keywords.length === 0) return [];

    const query = keywords.slice(0, 3).join(" ");
    console.log(`[Invidious] Searching "${query}" (genre=${mapped})`);
    const seen = new Set<string>();
    const tracks: TrackMetadata[] = [];

    for (const instance of INSTANCES) {
      try {
        console.log(`[Invidious] Trying ${instance}...`);
        const results = await this.fetchFromInstance(instance, query);
        console.log(`[Invidious] ${instance} returned ${results.length} results`);
        for (const v of results) {
          if (seen.has(v.videoId)) continue;
          seen.add(v.videoId);
          if (!v.videoId || !v.title) continue;
          tracks.push(this.toTrack(v, mapped));
        }
        if (tracks.length > 0) {
          markProviderHealthy(this.name);
          console.log(`[Invidious] Returning ${tracks.length} tracks from ${instance}`);
          return tracks;
        }
      } catch (e) {
        console.log(`[Invidious] ${instance} failed:`, e);
        continue;
      }
    }

    console.log("[Invidious] All instances failed, marking unhealthy");
    markProviderUnhealthy(this.name);
    return [];
  }

  private resolveGenre(context: ReadingAudioContext): string | null {
    const seen = new Set<string>();
    for (const raw of context.genres) {
      const normalized = raw.trim().toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      const mapped = fuzzyMatchGenre(normalized);
      if (mapped && GENRE_SEARCH_TERMS[mapped]) return mapped;
    }
    return null;
  }

  private toTrack(v: InvidiousVideo, genre: string): TrackMetadata {
    return {
      id: `yt-${v.videoId}`,
      title: v.title ?? "Untitled",
      creator: v.author ?? "Unknown",
      provider: this.name,
      license: "Creative Commons (Invidious)",
      duration: v.lengthSeconds ?? 0,
      thumbnail: `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`,
      playbackType: "youtube",
      videoID: v.videoId,
      sourceURL: `https://youtube.com/watch?v=${v.videoId}`,
      tags: [genre, ...(v.description ? this.extractTags(v.description) : [])],
      score: 0,
    };
  }

  private extractTags(description: string): string[] {
    return (description.match(/#\w+/g) ?? []).map((t) => t.slice(1));
  }
}
