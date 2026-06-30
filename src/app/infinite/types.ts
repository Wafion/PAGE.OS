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
  url: string;
  width: number;
  height: number;
  title: string;
  creator: string;
  year: string;
  type: string;
}