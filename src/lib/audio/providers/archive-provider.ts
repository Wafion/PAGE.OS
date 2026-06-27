import type { AudioSourceProvider } from "../provider-types";
import type { ReadingAudioContext, TrackMetadata } from "../types";
import { GENRE_SEARCH_TERMS } from "../provider-types";
import { fuzzyMatchGenre } from "../resolver";
import { isProviderHealthy, markProviderHealthy, markProviderUnhealthy } from "../cache";

type ArchiveDoc = {
  identifier: string;
  title?: string;
  creator?: string;
  description?: string;
  downloads?: number;
  format?: string[];
};

type ArchiveResponse = {
  response: {
    numFound: number;
    docs: ArchiveDoc[];
  };
};

export class ArchiveProvider implements AudioSourceProvider {
  readonly name = "archive";

  async search(context: ReadingAudioContext): Promise<TrackMetadata[]> {
    if (!isProviderHealthy(this.name)) return [];

    const mapped = this.resolveGenre(context);
    if (!mapped) return [];

    const keywords = GENRE_SEARCH_TERMS[mapped] ?? [];
    if (keywords.length === 0) return [];

    const query = keywords.slice(0, 3).join(" ");
    const safeQuery = query.replace(/[^a-zA-Z0-9\s]/g, "").trim();

    if (!safeQuery) return [];

    try {
      const params = new URLSearchParams({
        q: `${safeQuery} AND mediatype:(audio)`,
        fl: "identifier,title,creator,description,downloads,format",
        rows: "15",
        page: "1",
        output: "json",
      });

      const res = await fetch(
        `https://archive.org/advancedsearch.php?${params}`,
        { signal: AbortSignal.timeout(8000) },
      );

      if (!res.ok) {
        markProviderUnhealthy(this.name);
        return [];
      }

      const data = (await res.json()) as ArchiveResponse;
      const docs = data.response?.docs ?? [];
      const tracks: TrackMetadata[] = [];

      for (const doc of docs) {
        if (!doc.identifier || !doc.title) continue;
        const url = `https://archive.org/download/${doc.identifier}/${doc.identifier}.mp3`;
        tracks.push(this.toTrack(doc, url, mapped));
      }

      if (tracks.length > 0) {
        markProviderHealthy(this.name);
        return tracks;
      }

      markProviderUnhealthy(this.name);
      return [];
    } catch {
      markProviderUnhealthy(this.name);
      return [];
    }
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

  private toTrack(doc: ArchiveDoc, url: string, genre: string): TrackMetadata {
    return {
      id: `archive-${doc.identifier}`,
      title: doc.title ?? "Untitled",
      creator: doc.creator ?? "Unknown",
      provider: this.name,
      license: "Various (Archive.org)",
      duration: 0,
      playbackType: "html",
      streamURL: url,
      sourceURL: `https://archive.org/details/${doc.identifier}`,
      tags: [genre, ...(doc.description ? this.extractTags(doc.description) : [])],
      score: 0,
    };
  }

  private extractTags(description: string): string[] {
    return (description.match(/#\w+/g) ?? []).map((t) => t.slice(1));
  }
}
