import type { TrackMetadata } from "./types";

export function scoreTrack(track: TrackMetadata, keywords: string[]): TrackMetadata {
  let score = 0;
  const title = track.title.toLowerCase();
  const creator = track.creator.toLowerCase();
  const tags = track.tags.map((t) => t.toLowerCase());
  const kwLower = keywords.map((k) => k.toLowerCase());

  for (const kw of kwLower) {
    if (title.includes(kw)) score += 10;
    for (const tag of tags) {
      if (tag.includes(kw)) score += 5;
    }
    if (creator.includes(kw)) score += 3;
  }

  if (track.duration >= 60) score += 8;
  if (track.duration >= 180) score += 5;
  if (track.duration >= 600) score += 3;
  if (track.duration < 15) score -= 20;

  const license = track.license.toLowerCase();
  if (license.includes("cc0") || license === "creative commons 0") {
    score += 15;
  } else if (license.includes("cc by") || license.includes("attribution")) {
    score += 10;
  } else if (license.includes("creative commons")) {
    score += 5;
  }

  if (track.tags.some((t) => /ambien|ambience|ambient|atmosphere|mood/i.test(t))) score += 8;
  if (track.tags.some((t) => /loop|drone|pad/i.test(t))) score += 5;
  if (track.tags.some((t) => /spoken|voice|speech|dialogue|vocal/i.test(t))) score -= 15;
  if (track.tags.some((t) => /livestream|podcast|interview/i.test(t))) score -= 20;

  if (track.thumbnail) score += 2;

  return { ...track, score };
}

export function rankTracks(tracks: TrackMetadata[], keywords: string[]): TrackMetadata[] {
  const seen = new Map<string, TrackMetadata>();
  for (const track of tracks) {
    const existing = seen.get(track.id);
    const scored = scoreTrack(track, keywords);
    if (!existing || scored.score > existing.score) {
      seen.set(track.id, scored);
    }
  }

  return [...seen.values()].sort((a, b) => b.score - a.score);
}
