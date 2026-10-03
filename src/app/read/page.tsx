
'use client';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { LoaderCircle } from 'lucide-react';

const Reader = dynamic(() => import('./Reader'), {
  ssr: false,
  loading: () => <ReaderFallback />,
});

function ReaderFallback() {
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center gap-4 bg-background text-foreground">
      <LoaderCircle className="h-6 w-6 animate-spin text-accent" />
      <span>Initializing Memory Stream...</span>
    </div>
  );
}

export default function ReaderPage() {
  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background">
      <Suspense fallback={<ReaderFallback />}>
        <Reader />
      </Suspense>
    </div>
  );
}
