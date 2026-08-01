
'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileJson2, FileText } from 'lucide-react';
import { useReaderSettings } from '@/context/reader-settings-provider';

export type WebFallbackResult = {
  id?: string;
  title: string;
  link: string;
  type: 'pdf' | 'txt';
  sourceName?: string;
  rightsLabel?: string;
  detailUrl?: string;
};

const FiletypeIcon = ({ type }: { type: 'pdf' | 'txt' }) => {
  switch (type) {
    case 'pdf':
      return <FileJson2 className="h-5 w-5 text-accent" />;
    case 'txt':
      return <FileText className="h-5 w-5 text-accent" />;
  }
};

export function WebFallbackResults({ results }: { results: WebFallbackResult[] }) {
  const { uiMode } = useReaderSettings();

  if (results.length === 0) {
    return null;
  }

  return (
    <section className={uiMode === 'lounge' ? 'library-web-results' : 'col-span-full'}>
      <h2 className="font-headline text-lg text-accent/80 mb-4 border-b border-dashed border-border pb-2">
        {uiMode === 'lounge' ? 'Open archive texts' : '// OPEN_ARCHIVE_RESULTS'}
      </h2>
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="font-headline text-accent/80">
            {uiMode === 'lounge' ? 'More public knowledge to discover' : 'Open Knowledge Links Found'}
          </CardTitle>
          <CardDescription>
            {uiMode === 'lounge'
              ? 'These results come from open archives. TXT files open in the reader. PDFs open in a new tab.'
              : 'Direct files from open archives. TXT files open in the reader. PDF files open in a new tab.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {results.map((result, index) => {
              const isTxt = result.type === 'txt';
              const Wrapper = isTxt ? Link : 'a';
              const href = isTxt
                ? `/read?source=web&id=${encodeURIComponent(result.id || result.link)}&url=${encodeURIComponent(result.link)}&title=${encodeURIComponent(result.title)}&authors=${encodeURIComponent(result.sourceName || 'Open archive')}`
                : result.link;
              const linkProps = isTxt ? {} : { target: '_blank', rel: 'noopener noreferrer' };

              return (
                <li key={index} className="rounded-md border border-border/30 p-4 transition-colors hover:bg-input/50">
                  <Wrapper href={href} {...linkProps} className="group block">
                    <div className="flex items-start gap-4">
                      <FiletypeIcon type={result.type} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-foreground group-hover:text-accent group-hover:underline">
                            {result.title || 'Untitled'}
                          </p>
                          <Badge variant="outline" className="border-accent/50 text-accent/80 text-xs">
                            {result.type.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground/70 mt-2 truncate group-hover:text-accent/80">
                          {result.link}
                        </p>
                      </div>
                    </div>
                  </Wrapper>
                  {(result.sourceName || result.rightsLabel || result.detailUrl) && (
                    <p className="mt-3 pl-9 text-xs text-muted-foreground">
                      {[result.sourceName, result.rightsLabel].filter(Boolean).join(' / ')}
                      {result.detailUrl && (
                        <>
                          {' '}
                          <a
                            href={result.detailUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent/80 underline-offset-4 hover:underline"
                          >
                            source record
                          </a>
                        </>
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

