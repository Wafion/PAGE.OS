'use client';

import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function DmcaPage() {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 animate-fade-in">
        <div className="relative bg-card/70 backdrop-blur-sm ring-1 ring-accent/20 rounded-lg overflow-hidden border border-border/50">
            <div className="absolute inset-0 pointer-events-none bg-scanner bg-repeat animate-scanner z-0 opacity-50" />
            <div className="relative z-10 p-6 h-full flex flex-col">
                <header className="mb-6">
                    <h1 className="font-headline text-2xl text-accent/80 tracking-wider animate-pulse flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6" />
                        <span>▍ DMCA.POLICY</span>
                    </h1>
                     <p className="text-xs text-muted-foreground/80 mt-2">
                        <strong>Last updated:</strong> June 28, 2025 &nbsp;&nbsp;|&nbsp;&nbsp;
                        <strong>Effective for:</strong> PAGE.OS
                    </p>
                </header>
                
                <div className="space-y-6 text-sm text-muted-foreground/80 overflow-y-auto pr-2 font-body leading-relaxed">
                    <p>
                        PAGE.OS is committed to respecting the intellectual property rights of authors, publishers, and content creators. While PAGE.OS does not host or store any copyrighted material, we aggregate and display content that is publicly available across the internet for educational and archival purposes.
                    </p>
                    <p>
                        This policy outlines our procedures for responding to notices under the <strong className="text-foreground/90">Digital Millennium Copyright Act (DMCA)</strong> and applies to all users and third parties who interact with this platform.
                    </p>

                    <section className="space-y-2">
                        <h2 className="font-headline text-lg text-accent/90 tracking-wider">📌 1. No Hosting of Copyrighted Material</h2>
                        <p>
                            PAGE.OS does <strong className="text-foreground/90">not host, store, or modify</strong> any copyrighted files or data. All content displayed is accessed via publicly available web sources or indexes.
                        </p>
                        <p>
                            We act solely as a <strong className="text-foreground/90">search and reading interface</strong>, similar in function to a search engine.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-headline text-lg text-accent/90 tracking-wider">📩 2. Submitting a DMCA Takedown Notice</h2>
                        <p>
                            If you are a copyright owner (or legally authorized to act on behalf of one), and you believe that your work is being linked or displayed in a way that constitutes copyright infringement, please send a <strong className="text-foreground/90">written DMCA notice</strong> containing the following:
                        </p>
                        <ol className="list-decimal list-inside space-y-2 pl-4">
                            <li><strong className="text-foreground/90">Identification of the copyrighted work</strong> you claim has been infringed.</li>
                            <li><strong className="text-foreground/90">A direct URL</strong> or link to the page(s) on PAGE.OS where the infringing content appears.</li>
                            <li>Your <strong className="text-foreground/90">name</strong>, <strong className="text-foreground/90">company (if applicable)</strong>, <strong className="text-foreground/90">email address</strong>, and <strong className="text-foreground/90">phone number</strong>.</li>
                            <li>A statement that you have a <strong className="text-foreground/90">good faith belief</strong> that the disputed use is not authorized by you, your agent, or the law.</li>
                            <li>A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on their behalf.</li>
                            <li>Your <strong className="text-foreground/90">physical or electronic signature</strong>.</li>
                        </ol>
                        <p className="border border-destructive/50 bg-destructive/10 p-3 rounded-md text-destructive-foreground/80 mt-4">
                            ⚠️ Note: We <strong className="text-destructive-foreground">do not process vague or incomplete DMCA notices.</strong>
                        </p>
                        <p className="mt-4">Please send all takedown requests to:</p>
                        <p>
                            <strong className="text-foreground/90">📧 Email:</strong> <a href="mailto:pageos.help@gmail.com" className="text-accent hover:underline">pageos.help@gmail.com</a>
                        </p>
                    </section>
                    
                    <section className="space-y-2">
                        <h2 className="font-headline text-lg text-accent/90 tracking-wider">🛠️ 3. What Happens After We Receive a Notice</h2>
                        <p>Upon receiving a <strong className="text-foreground/90">valid DMCA notice</strong>, we will:</p>
                        <ul className="list-disc list-inside space-y-2 pl-4">
                            <li>Promptly <strong className="text-foreground/90">review</strong> the request.</li>
                            <li><strong className="text-foreground/90">Remove or disable access</strong> to the allegedly infringing content.</li>
                            <li>Optionally notify the source site (if known) or the user involved (if applicable).</li>
                        </ul>
                        <p>If the content is not hosted by PAGE.OS but instead fetched from an external site, we will <strong className="text-foreground/90">forward</strong> the notice to the origin domain when possible.</p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-headline text-lg text-accent/90 tracking-wider">📤 4. Counter-Notification (Optional)</h2>
                        <p>If you believe your content was removed in error, you may file a <strong className="text-foreground/90">counter-notification</strong>. Please request instructions via our DMCA email.</p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="font-headline text-lg text-accent/90 tracking-wider">⚖️ 5. Legal Liability</h2>
                        <p>PAGE.OS operates under the <strong className="text-foreground/90">safe harbor provisions</strong> of the DMCA (17 U.S.C. § 512). Compliance with takedown requests does <strong className="text-foreground/90">not constitute admission of wrongdoing</strong> or ownership of any content.</p>
                        <p>We reserve the right to block repeat offenders, disable access to abusive sources, or take other action in line with DMCA regulations.</p>
                    </section>
                    
                    <section className="space-y-2">
                         <h2 className="font-headline text-lg text-accent/90 tracking-wider">✅ Summary</h2>
                        <p>PAGE.OS is a decentralized text interface. We do <strong className="text-foreground/90">not condone piracy</strong>, nor do we store or control the content linked through our platform.</p>
                        <p>We respect authorship, attribution, and intellectual property, and will act in good faith upon receiving proper DMCA notices.</p>
                    </section>
                </div>
            </div>
        </div>
    </div>
  );
}
