export interface MediaItem {
  url: string;
  width: number;
  height: number;
  title: string;
  creator: string;
  year: string;
  type: string;
  source?: 'met' | 'wiki';
}