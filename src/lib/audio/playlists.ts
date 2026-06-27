import type { Playlist, TrackMetadata } from "./types";

let _idCounter = 0;

function makeTrack(path: string): TrackMetadata {
  _idCounter++;
  return {
    id: `local-${_idCounter}`,
    title: "",
    creator: "",
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
