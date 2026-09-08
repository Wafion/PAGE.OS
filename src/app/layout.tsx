import type { Metadata } from "next";
import { JetBrains_Mono, Orbitron, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import MainLayout from "@/components/layout/main-layout";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/context/theme-provider";
import { ReaderSettingsProvider } from "@/context/reader-settings-provider";
import { AuthProvider } from "@/context/auth-provider";
import { AudioProvider } from "@/context/audio-provider";
import { NowPlayingBar } from "@/components/audio/now-playing-bar";
import { CookieConsentBanner } from "@/components/cookie-consent";

const fontHeadline = Orbitron({
  subsets: ["latin"],
  variable: "--font-headline",
});

const fontBody = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-body",
});

const fontReader = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-reader",
});

const siteUrl = "https://pageos.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PageOS",
    template: "%s | PageOS",
  },
  description:
    "PageOS is a terminal-aesthetic e-reader and public-domain culture discovery platform. Browse, search, and read timeless works from Project Gutenberg, Standard Ebooks, and the Open Archive.",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "PageOS",
    title: "PageOS",
    description:
      "Read public-domain books in a terminal-steeped reading room. PageOS is a minimal, keyboard-driven e-reader and public-domain culture discovery platform.",
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "PageOS — read the public domain in a terminal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PageOS",
    description:
      "Read public-domain books in a terminal-steeped reading room. PageOS is a minimal, keyboard-driven e-reader and public-domain culture discovery platform.",
    images: [`${siteUrl}/og-image.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-body antialiased",
          fontHeadline.variable,
          fontBody.variable,
          fontReader.variable
        )}
      >
        <ThemeProvider>
          <AuthProvider>
            <ReaderSettingsProvider>
              <AudioProvider>
                <MainLayout>{children}</MainLayout>
                <NowPlayingBar />
              </AudioProvider>
              <Toaster />
              <CookieConsentBanner />
            </ReaderSettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
