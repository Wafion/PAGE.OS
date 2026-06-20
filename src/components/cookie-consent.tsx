"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Button } from "@/components/ui/button";
import { enableOptionalAnalytics } from "@/lib/firebase";

const CONSENT_KEY = "pageos-cookie-consent";
const CONSENT_VERSION = "2026-06-16";

type CookieConsent = {
  necessary: true;
  optional: boolean;
  acceptedAt: string;
  version: string;
};

function readConsent(): CookieConsent | null {
  try {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    return stored ? (JSON.parse(stored) as CookieConsent) : null;
  } catch (error) {
    console.warn("Could not read cookie consent.", error);
    return null;
  }
}

function saveConsent(optional: boolean): CookieConsent {
  const consent: CookieConsent = {
    necessary: true,
    optional,
    acceptedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  };

  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent("pageos-cookie-consent-updated", { detail: consent }));
  return consent;
}

function ConsentAwareSpeedInsights() {
  const [optionalAllowed, setOptionalAllowed] = useState(false);

  useEffect(() => {
    const syncConsent = () => {
      const consent = readConsent();
      setOptionalAllowed(Boolean(consent?.optional));
    };

    syncConsent();
    window.addEventListener("pageos-cookie-consent-updated", syncConsent);
    window.addEventListener("storage", syncConsent);

    return () => {
      window.removeEventListener("pageos-cookie-consent-updated", syncConsent);
      window.removeEventListener("storage", syncConsent);
    };
  }, []);

  useEffect(() => {
    if (!optionalAllowed) {
      return;
    }

    void enableOptionalAnalytics().catch((error) => {
      console.warn("Could not enable optional analytics.", error);
    });
  }, [optionalAllowed]);

  return optionalAllowed ? <SpeedInsights /> : null;
}

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(!readConsent());
  }, []);

  const handleChoice = useCallback((optional: boolean) => {
    try {
      saveConsent(optional);
    } catch (error) {
      console.warn("Could not save cookie consent.", error);
    }

    setIsVisible(false);
  }, []);

  return (
    <>
      <ConsentAwareSpeedInsights />
      {isVisible ? (
        <section
          aria-label="Cookie consent"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-4xl rounded-lg border border-accent/25 bg-background/95 p-4 shadow-2xl shadow-black/30 backdrop-blur md:inset-x-6 md:bottom-6"
        >
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-accent">
                <Cookie className="h-4 w-4" />
                <h2 className="font-headline text-sm tracking-wider">COOKIE.CONTROL</h2>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                PAGE.OS uses essential storage for login, reader settings, theme, source
                preferences, and your cookie choice. Optional analytics help us understand
                performance and usage patterns.
              </p>
              <Link href="/legal" className="mt-2 inline-flex text-xs text-accent hover:underline">
                Read privacy and cookie policy
              </Link>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:justify-end">
              <Button
                type="button"
                variant="outline"
                className="border-accent/40 text-accent hover:bg-accent/10 hover:text-accent"
                onClick={() => handleChoice(false)}
              >
                <ShieldCheck className="h-4 w-4" />
                Essential only
              </Button>
              <Button type="button" onClick={() => handleChoice(true)}>
                <SlidersHorizontal className="h-4 w-4" />
                Accept all
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground md:static"
                onClick={() => handleChoice(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close cookie notice</span>
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
