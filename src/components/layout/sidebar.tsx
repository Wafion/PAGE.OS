"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Power,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/auth-provider";
import { useReaderSettings } from "@/context/reader-settings-provider";
import { cn } from "@/lib/utils";
import { navigationItems } from "@/components/layout/navigation-items";

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { uiMode } = useReaderSettings();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <div className="pageos-menu-frame h-full">
      <div className="pageos-menu-header">
        <div className="pageos-menu-brand-row">
          <div>
            <p className="pageos-menu-kicker">
              {uiMode === "lounge" ? "Library lounge" : uiMode === "motion" ? "Motion edition" : "Terminal grid"}
            </p>
            <Link href="/" className="pageos-menu-brand">
              PAGE.OS
            </Link>
          </div>
          <span className="pageos-menu-chip">{uiMode === "lounge" ? "Shelf map" : uiMode === "motion" ? "Signal map" : "v1.0"}</span>
        </div>
        <div className="pageos-menu-copy">
          <h2>{uiMode === "lounge" ? "Navigation Room" : "Gateway Panel"}</h2>
          <p>
            {uiMode === "lounge"
              ? "Move through books, artwork, settings, and reader spaces."
              : uiMode === "motion"
                ? "A fluid index for books, images, and open knowledge."
                : "Jump between open knowledge routes, operator controls, and runtime pages."}
          </p>
        </div>
      </div>

      <div className="pageos-menu-status">
        <div>
          <span className="pageos-menu-status-label">
            {uiMode === "lounge" ? "Reader status" : "Operator status"}
          </span>
          <strong>{user ? user.displayName || "Signed in reader" : "Guest session"}</strong>
        </div>
        <p>
          {user
            ? uiMode === "lounge"
              ? "Your preferences and bookmarks are being remembered."
              : "Authenticated operator with synced state."
            : uiMode === "lounge"
              ? "Sign in to carry your room, books, and bookmarks with you."
              : "Anonymous session. Authentication unlocks synced persistence."}
        </p>
      </div>

      <nav className="pageos-menu-nav">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const label = uiMode === "lounge" ? item.loungeLabel : uiMode === "motion" ? item.motionLabel : item.classicLabel;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("pageos-menu-item", isActive && "active")}
            >
              <div className="pageos-menu-item-icon">
                <item.icon className="h-4 w-4" />
              </div>
              <div className="pageos-menu-item-copy">
                <div className="pageos-menu-item-top">
                  <strong>{label}</strong>
                  <span>{item.code}</span>
                </div>
                <p>{item.detail}</p>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="pageos-menu-footer">
        {user ? (
          <Button
            variant="ghost"
            className="pageos-menu-action w-full justify-start gap-3"
            onClick={handleSignOut}
          >
            <Power className="h-4 w-4 text-destructive" />
            <span>{uiMode === "lounge" ? "Leave the room" : "Terminate session"}</span>
          </Button>
        ) : (
          <Button variant="ghost" asChild className="pageos-menu-action w-full justify-start gap-3">
            <Link href="/profile">
              <LogIn className="h-4 w-4 text-terminal-accent" />
              <span>{uiMode === "lounge" ? "Sign in to save your room" : "Authenticate operator"}</span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
