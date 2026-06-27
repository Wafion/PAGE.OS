import type { TrackMetadata, ReadingAudioContext } from "./types";

export interface AudioSourceProvider {
  readonly name: string;
  search(context: ReadingAudioContext): Promise<TrackMetadata[]>;
}

export type GenreSearchTerms = Record<string, string[]>;

export const GENRE_SEARCH_TERMS: GenreSearchTerms = {
  fantasy: [
    "forest ambience",
    "magic ambience",
    "medieval ambience",
    "wind ambience",
    "enchanted forest",
    "fantasy atmosphere",
  ],
  "science-fiction": [
    "space ambience",
    "spaceship",
    "sci-fi drone",
    "electronics",
    "futuristic ambience",
    "cyberpunk atmosphere",
  ],
  mystery: [
    "rain ambience",
    "dark ambience",
    "creaking",
    "detective ambience",
    "noir atmosphere",
    "suspense",
  ],
  romance: [
    "soft piano",
    "romantic ambience",
    "coffee shop ambience",
    "cafe atmosphere",
    "gentle rain",
    "warm ambience",
  ],
  horror: [
    "dark ambience",
    "whispers",
    "creepy wind",
    "abandoned building",
    "haunted atmosphere",
    "dissonant drone",
  ],
  history: [
    "castle ambience",
    "village ambience",
    "battlefield ambience",
    "ancient ambience",
    "medieval atmosphere",
    "old tavern",
  ],
  adventure: [
    "jungle ambience",
    "river",
    "birds",
    "wind",
    "ocean waves",
    "mountain ambience",
    "exploration atmosphere",
  ],
};
