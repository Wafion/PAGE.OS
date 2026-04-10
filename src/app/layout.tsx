import type { Metadata } from "next";
import { JetBrains_Mono, Orbitron, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import MainLayout from "@/components/layout/main-layout";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/context/theme-provider";
import { ReaderSettingsProvider } from "@/context/reader-settings-provider";
import { AuthProvider } from "@/context/auth-provider";

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

export const metadata: Metadata = {
  title: "PageOS",
  description: "A terminal-themed e-reader application.",
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
          <ReaderSettingsProvider>
            <AuthProvider>
              <MainLayout>{children}</MainLayout>
              <Toaster />
            </AuthProvider>
          </ReaderSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
