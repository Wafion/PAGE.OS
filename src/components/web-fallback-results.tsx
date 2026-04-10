
'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FileJson2 } from 'lucide-react';

export type WebFallbackResult = {
  title: string;
  link: string;
  type: 'pdf' | 'txt';
};

const FiletypeIcon = ({ type }: { type: 'pdf' | 'txt' }) => {
    switch (type) {
        case 'pdf': return <FileJson2 className="h-5 w-5 text-accent" />;
        case 'txt': return <FileText className="h-5 w-5 text-accent" />;
    }
}

export function WebFallbackResults({ results }: { results: WebFallbackResult[] }) {
  if (results.length === 0) {
    return null;
  }

  return (
    <section className="col-span-full">
      <h2 className="font-headline text-lg text-accent/80 mb-4 border-b border-dashed border-border pb-2">
        // WEB_FALLBACK_RESULTS
      </h2>
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="font-headline text-accent/80">External Links Found</CardTitle>
          <CardDescription>
            The following are unverified links from Brave Search. TXT files will open in the reader. PDF files will open in a new tab.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {results.map((result, index) => {
              const isTxt = result.type === 'txt';
              const Wrapper = isTxt ? Link : 'a';
              const href = isTxt
                ? `/read?source=web&url=${encodeURIComponent(result.link)}&title=${encodeURIComponent(result.title)}`
                : result.link;
              
              const linkProps = isTxt
                ? {}
                : { target: '_blank', rel: 'noopener noreferrer' };

              return (
                <li key={index} className="rounded-md border border-border/30 p-4 transition-colors hover:bg-input/50">
                  <Wrapper href={href} {...linkProps} className="group">
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
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
