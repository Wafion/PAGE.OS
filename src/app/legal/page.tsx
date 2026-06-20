"use client";

import Link from "next/link";
import { Cookie, Database, RotateCcw, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const legalLines = [
  "PAGE.OS is a decentralized interface for exploring publicly available web texts.",
  "It does not host, store, or modify any copyrighted content.",
  "All content accessed through this platform is fetched via open web sources, and any transmission of copyrighted material is purely incidental to external indexing.",
  "We are not the copyright holders of any book or media shown.",
  "PAGE.OS does not condone piracy or unauthorized distribution of intellectual property.",
  "If you believe your rights have been infringed, please contact the origin domain directly.",
  "This system acts purely as a transmission node, akin to a search engine, designed for archival exploration and educational access.",
  "No legal liability is assumed or implied.",
];

const essentialCookies = [
  "Authentication session data needed to keep signed-in users connected.",
  "Reader settings such as theme, interface mode, source preferences, auto-scroll, and boot animation choices.",
  "Local recommendation cache and book/source preferences used to make the app respond faster.",
  "Cookie consent status so PAGE.OS remembers whether you selected essential-only or all cookies.",
];

const optionalCookies = [
  "Firebase Analytics events that help us understand aggregate product usage when a measurement ID is configured.",
  "Vercel Speed Insights signals that help us diagnose page speed and real-world performance.",
];

const privacyLines = [
  "PAGE.OS may process account information when you sign in, including the profile details returned by the authentication provider and preferences saved to your account.",
  "Reader activity and interface preferences may be stored locally in your browser so the app can restore your experience between visits.",
  "Optional analytics are used only in aggregate to improve stability, performance, and product decisions. They are not required to read, search, or manage your library.",
  "PAGE.OS does not sell personal information. Data may be handled by service providers used to run the app, including Firebase and Vercel.",
];

const resetCookieChoice = () => {
  try {
    window.localStorage.removeItem("pageos-cookie-consent");
    window.location.reload();
  } catch (error) {
    console.warn("Could not reset cookie choice.", error);
  }
};

export default function LegalPage() {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 animate-fade-in">
      <div className="relative overflow-hidden rounded-lg border border-border/50 bg-card/70 ring-1 ring-accent/20 backdrop-blur-sm">
        <div className="absolute inset-0 z-0 pointer-events-none bg-scanner bg-repeat opacity-50 animate-scanner" />
        <div className="relative z-10 flex h-full flex-col p-6">
          <h1 className="mb-6 flex items-center gap-2 font-headline text-2xl tracking-wider text-accent/80 animate-pulse">
            <Shield className="h-6 w-6" />
            <span>LEGAL.TRANSMISSION</span>
          </h1>
          <div className="space-y-4 overflow-y-auto pr-2 text-sm text-muted-foreground/70">
            {legalLines.map((line, index) => (
              <p key={index} data-line-id={index} className="font-body leading-relaxed">
                {line}
              </p>
            ))}
            <div className="mt-6 border-t border-border/20 pt-6">
              <p className="mb-2 font-medium text-foreground/90">
                For copyright-related inquiries, please see our DMCA Policy.
              </p>
              <Button
                asChild
                variant="outline"
                className="border-accent/50 text-accent hover:bg-accent/10 hover:text-accent"
              >
                <Link href="/legal/dmca">View DMCA Policy</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-border/50 bg-card/70 ring-1 ring-accent/20 backdrop-blur-sm">
        <div className="absolute inset-0 z-0 pointer-events-none bg-scanner bg-repeat opacity-40 animate-scanner" />
        <div className="relative z-10 grid gap-8 p-6">
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-headline text-xl tracking-wider text-accent/80">
              <Cookie className="h-5 w-5" />
              PRIVACY.COOKIE_POLICY
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground/75">
              PAGE.OS uses a small amount of browser storage to operate the reader,
              remember your preferences, and keep signed-in features working. Optional
              analytics are only enabled after you choose Accept all in the cookie notice.
            </p>
          </div>

          <section className="space-y-3 text-sm leading-7 text-muted-foreground/75">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
              <Shield className="h-4 w-4 text-accent" />
              Privacy policy
            </h3>
            {privacyLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-lg border border-border/50 bg-background/40 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground/90">
                <Database className="h-4 w-4 text-accent" />
                Essential storage
              </h3>
              <ul className="space-y-3 text-sm leading-6 text-muted-foreground/75">
                {essentialCookies.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-border/50 bg-background/40 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground/90">
                <Sparkles className="h-4 w-4 text-accent" />
                Optional analytics
              </h3>
              <ul className="space-y-3 text-sm leading-6 text-muted-foreground/75">
                {optionalCookies.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>

          <section className="space-y-3 text-sm leading-7 text-muted-foreground/75">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
              <Shield className="h-4 w-4 text-accent" />
              Your choices
            </h3>
            <p>
              Select Essential only to allow only storage needed to run PAGE.OS.
              Select Accept all to also allow optional analytics. You can change
              your choice by resetting it here; the consent banner will appear
              again after the page reloads.
            </p>
            <Button
              type="button"
              variant="outline"
              className="border-accent/50 text-accent hover:bg-accent/10 hover:text-accent"
              onClick={resetCookieChoice}
            >
              <RotateCcw className="h-4 w-4" />
              Reset cookie choice
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
