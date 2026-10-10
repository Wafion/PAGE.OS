'use client';

import * as React from 'react';
import type { MediaItem } from './types';
import { GalleryFeed } from './components';
import { MediaDetailDialog } from './detail-dialog';
import { useGalleryFeed } from './useGalleryFeed';

export default function InfinitePage() {
  const [selectedItem, setSelectedItem] = React.useState<MediaItem | null>(null);
  const galleryFeed = useGalleryFeed(true);

  return (
    <div
      className="flex-1 flex flex-col min-h-0 art-feed-page h-[100dvh]"
      style={{ background: '#111111' }}
    >
      <GalleryFeed
        {...galleryFeed}
        onSelect={setSelectedItem}
        isDetailOpen={selectedItem !== null}
      />
      <MediaDetailDialog
        item={selectedItem}
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
          }
        }}
      />
    </div>
  );
}
