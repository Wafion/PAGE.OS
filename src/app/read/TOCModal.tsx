'use client';

import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { TOCEntry } from '@/hooks/useBookLoader';

type TOCModalProps = {
  toc: TOCEntry[];
  activeSector: number;
  onClose: () => void;
  onSelect: (sectorIndex: number) => void;
};

export default function TOCModal({
  toc,
  activeSector,
  onClose,
  onSelect,
}: TOCModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-2xl overflow-hidden border border-accent/20 bg-[#07120f] text-foreground shadow-[0_0_25px_#00ffc822]"
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ type: 'spring', stiffness: 240, damping: 24 }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-accent/15 bg-accent/5 px-5 py-4">
            <div>
              <p className="font-headline text-xs tracking-[0.3em] text-accent">
                TRANSMISSION INDEX
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Jump by chapter instead of guessing the next paragraph block.
              </p>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              aria-label="Close chapter index"
              className="text-muted-foreground hover:text-accent"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-4 py-4">
            <div className="space-y-2">
              {toc.map((entry, index) => {
                const nextEntry = toc[index + 1];
                const isActive =
                  activeSector >= entry.sectorIndex &&
                  (!nextEntry || activeSector < nextEntry.sectorIndex);

                return (
                  <button
                    key={`${entry.title}-${entry.sectorIndex}`}
                    onClick={() => {
                      onSelect(entry.sectorIndex);
                      onClose();
                    }}
                    className={`w-full border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-accent/50 bg-accent/10 text-accent'
                        : 'border-transparent bg-white/0 text-muted-foreground hover:border-accent/20 hover:bg-accent/5 hover:text-foreground'
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
                      Chapter {String(entry.chapterIndex + 1).padStart(2, '0')} / {entry.pageCount} pages
                    </div>
                    <div className="mt-1 font-headline text-sm">{entry.title}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
