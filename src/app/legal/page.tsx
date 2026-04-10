
'use client';

import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const legalLines = [
  'PAGE.OS is a decentralized interface for exploring publicly available web texts.',
  'It does not host, store, or modify any copyrighted content.',
  'All content accessed through this platform is fetched via open web sources, and any transmission of copyrighted material is purely incidental to external indexing.',
  'We are not the copyright holders of any book or media shown.',
  'PAGE.OS does not condone piracy or unauthorized distribution of intellectual property.',
  'If you believe your rights have been infringed, please contact the origin domain directly.',
  'This system acts purely as a transmission node — akin to a search engine — designed for archival exploration and educational access.',
  'No legal liability is assumed or implied.',
];

export default function LegalPage() {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 animate-fade-in">
        <div className="relative bg-card/70 backdrop-blur-sm ring-1 ring-accent/20 rounded-lg overflow-hidden border border-border/50">
            <div className="absolute inset-0 pointer-events-none bg-scanner bg-repeat animate-scanner z-0 opacity-50" />
            <div className="relative z-10 p-6 h-full flex flex-col">
                <h1 className="font-headline text-2xl text-accent/80 tracking-wider animate-pulse flex items-center gap-2 mb-6">
                    <Shield className="h-6 w-6" />
                    <span>▍ LEGAL.TRANSMISSION</span>
                </h1>
                <div className="space-y-4 text-sm text-muted-foreground/70 overflow-y-auto pr-2">
                    {legalLines.map((line, index) => (
                        <p key={index} data-line-id={index} className="leading-relaxed font-body">
                        {line}
                        </p>
                    ))}
                    <div className="pt-6 border-t border-border/20 mt-6">
                        <p className="font-medium text-foreground/90 mb-2">For copyright-related inquiries, please see our DMCA Policy.</p>
                        <Button asChild variant="outline" className="border-accent/50 text-accent hover:bg-accent/10 hover:text-accent">
                            <Link href="/legal/dmca">View DMCA Policy</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
