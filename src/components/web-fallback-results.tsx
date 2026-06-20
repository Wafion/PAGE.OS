
'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileJson2 } from 'lucide-react';
import { useReaderSettings } from '@/context/reader-settings-provider';

export type WebFallbackResult = {
  title: string;
  link: string;
  type: 'pdf';
};

const FiletypeIcon = () => <FileJson2 className="h-5 w-5 text-accent" />;

export function WebFallbackResults({ results }: { results: WebFallbackResult[] }) {
  const { uiMode } = useReaderSettings();

  if (results.length === 0) {
    return null;
  }

  return (
    <section className={uiMode === 'lounge' ? 'library-web-results' : 'col-span-full'}>
      <h2 className="font-headline text-lg text-accent/80 mb-4 border-b border-dashed border-border pb-2">
        {uiMode === 'lounge' ? 'PDFs and web books' : '// WEB_FALLBACK_RESULTS'}
      </h2>
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="font-headline text-accent/80">
            {uiMode === 'lounge' ? 'More places to discover' : 'External Links Found'}
          </CardTitle>
          <CardDescription>
            {uiMode === 'lounge'
              ? 'These results come from web search. PDFs open in a new tab.'
              : 'The following are unverified links from Brave Search.PDF files will open in a new tab.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {results.map((result, index) => {
              return (
                <li key={index} className="rounded-md border border-border/30 p-4 transition-colors hover:bg-input/50">
                  <a
                    href={result.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <div className="flex items-start gap-4">
                      <FiletypeIcon />
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
                  </a>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

