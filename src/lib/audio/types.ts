export type ReadingAudioContext = {
  genres: string[];
  title?: string;
  author?: string;
  language?: string;
};

export type PlaybackType = "html" | "youtube";

export type TrackMetadata = {
  id: string;
  title: string;
  creator: string;
  provider: string;
  license: string;
  duration: number;
  thumbnail?: string;
  playbackType: PlaybackType;
  streamURL?: string;
  videoID?: string;
  sourceURL: string;
  tags: string[];
  score: number;
};

export type Playlist = TrackMetadata[];

export type AudioState = {
  enabled: boolean;
  volume: number;
  playing: boolean;
  currentTrack: TrackMetadata | null;
  currentPlaylist: Playlist;
  playlistLabel: string;
};

export const GENRE_MAP: Record<string, string> = {
  fantasy: "fantasy",
  "science fiction": "science-fiction",
  "science-fiction": "science-fiction",
  "sci-fi": "science-fiction",
  mystery: "mystery",
  detective: "mystery",
  crime: "mystery",
  romance: "romance",
  horror: "horror",
  gothic: "horror",
  history: "history",
  "historical fiction": "history",
  historical: "history",
  adventure: "adventure",
  thriller: "mystery",
  "sensation fiction": "mystery",
};
