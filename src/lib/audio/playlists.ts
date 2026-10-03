import type { Playlist, TrackMetadata } from "./types";

let _idCounter = 0;

function makeTrack(path: string): TrackMetadata {
  _idCounter++;
  // Derive an honest display name from the file ("ambient_01.mp3" -> "Ambient 01")
  // so UI never falls back to "Untitled by Unknown".
  const file = path.split('/').pop() ?? '';
  const match = file.match(/^([a-z]+)_(\d+)\.mp3$/i);
  const title = match
    ? `${match[1][0].toUpperCase()}${match[1].slice(1)} ${match[2]}`
    : file.replace(/\.mp3$/i, '');
  return {
    id: `local-${_idCounter}`,
    title,
    creator: "PAGE.OS ambience",
    provider: "local",
    license: "CC0",
    duration: 0,
    playbackType: "html",
    streamURL: path,
    sourceURL: "",
    tags: ["ambient"],
    score: 0,
  };
}

function buildPaths(genre: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return `/music/${genre}/${genre}_${n}.mp3`;
  });
}

export const LOCAL_PATHS: Record<string, string[]> = {
  default: buildPaths("ambient", 1),
};

export const PLAYLISTS: Record<string, Playlist> = Object.fromEntries(
  Object.entries(LOCAL_PATHS).map(([key, paths]) => [
    key,
    paths.map(makeTrack),
  ]),
);

export const DEFAULT_PLAYLIST: Playlist = PLAYLISTS.default;
