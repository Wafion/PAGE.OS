export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface ChunkCoord {
  cx: number;
  cy: number;
}

export interface MediaItem {
  id?: string;
  url: string;
  width: number;
  height: number;
  title: string;
  creator: string;
  year: string;
  type: "artwork" | "book";
  source?: string;
  sourceName?: string;
  sourceUrl?: string;
  detailUrl?: string;
  description?: string;
  tags?: string[];
  genres?: string[];
  language?: string;
  firstPublished?: string;
  fileFormats?: string[];
  pages?: string;
  isbn?: string;
  medium?: string;
  dimensions?: string;
  location?: string;
  collection?: string;
  accessionNumber?: string;
  creditLine?: string;
  attribution?: string;
  rightsLabel?: string;
}
