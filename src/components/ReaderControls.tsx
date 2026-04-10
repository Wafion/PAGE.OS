import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReaderControls({
  onPrev,
  onNext,
  isFirst,
  isLast,
  progressLabel,
  pageLabel,
}: {
  onPrev: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
  progressLabel: string;
  pageLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 border border-accent/20 bg-background/90 px-4 py-3 shadow-lg backdrop-blur">
      <Button onClick={onPrev} disabled={isFirst} variant="ghost" size="icon">
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <div className="min-w-[180px] text-center">
        <div className="font-headline text-xs tracking-widest text-accent">{pageLabel}</div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {progressLabel}
        </div>
      </div>
      <Button onClick={onNext} disabled={isLast} variant="ghost" size="icon">
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
