"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { useAuth } from "@/context/auth-provider";
import { useReaderSettings } from "@/context/reader-settings-provider";
import { auth } from "@/lib/firebase";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  PanelLeft,
  Power,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { navigationItems } from "@/components/layout/navigation-items";

export function SidebarPopup() {
  const [open, setOpen] = useState(false);
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

  const menuTitle = uiMode === "lounge" ? "Navigation Room" : uiMode === "motion" ? "Field Notes" : "Gateway Panel";
  const menuBadge = uiMode === "lounge" ? "Library lounge" : uiMode === "motion" ? "Motion edition" : "Terminal grid";
  const menuSubtitle =
    uiMode === "lounge"
      ? "Move through the shelves, settings, and reader spaces."
      : uiMode === "motion"
        ? "A visual index of books, images, and open knowledge."
        : "Jump between system routes, operator controls, and runtime pages.";
  const userLabel = user ? user.displayName || "Signed in reader" : "Guest session";
  const userMeta = user
    ? uiMode === "lounge"
      ? "Your preferences and bookmarks are being remembered."
      : uiMode === "motion"
        ? "Your reading trail is being remembered."
        : "Authenticated operator with synced state."
    : uiMode === "lounge"
      ? "Sign in to carry your room, books, and bookmarks with you."
      : uiMode === "motion"
        ? "Sign in to keep your trail across the field."
        : "Anonymous session. Authentication unlocks synced persistence.";

  return (
    <div className="pageos-sidebar-trigger fixed top-4 left-4 z-50">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="pageos-menu-trigger transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Open Navigation</span>
          </Button>
        </SheetTrigger>

        <SheetContent
          side="left"
          className="pageos-menu-shell w-[320px] max-w-[92vw] border-0 bg-transparent p-0 shadow-none sm:w-[380px] [&>button]:hidden"
        >
          <SheetTitle className="sr-only">{menuTitle}</SheetTitle>
          <div className="pageos-menu-frame">
            <div className="pageos-menu-header">
              <div className="pageos-menu-brand-row">
                <div>
                  <p className="pageos-menu-kicker">{menuBadge}</p>
                  <Link href="/" className="pageos-menu-brand" onClick={() => setOpen(false)}>
                    PAGE.OS
                  </Link>
                </div>
                  <span className="pageos-menu-chip">{uiMode === "lounge" ? "Shelf map" : uiMode === "motion" ? "Issue 004" : "v1.0"}</span>
              </div>
              <div className="pageos-menu-copy">
                <h2>{menuTitle}</h2>
                <p>{menuSubtitle}</p>
              </div>
            </div>

            <div className="pageos-menu-status">
              <div>
                <span className="pageos-menu-status-label">
                    {uiMode === "lounge" ? "Reader status" : uiMode === "motion" ? "Trail status" : "Operator status"}
                </span>
                <strong>{userLabel}</strong>
              </div>
              <p>{userMeta}</p>
            </div>

            <nav className="pageos-menu-nav">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href;
                    const label = uiMode === "lounge" ? item.loungeLabel : uiMode === "motion" ? item.motionLabel : item.classicLabel;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
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
                      <small className="pageos-menu-item-location">{item.location}</small>
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
                  onClick={() => {
                    handleSignOut();
                    setOpen(false);
                  }}
                >
                  <Power className="h-4 w-4 text-destructive" />
                    <span>{uiMode === "lounge" ? "Leave the room" : uiMode === "motion" ? "Leave the field" : "Terminate session"}</span>
                </Button>
              ) : (
                <Button variant="ghost" asChild className="pageos-menu-action w-full justify-start gap-3">
                  <Link href="/profile" onClick={() => setOpen(false)}>
                    <LogIn className="h-4 w-4 text-accent" />
                    <span>{uiMode === "lounge" ? "Sign in to save your room" : uiMode === "motion" ? "Sign in to save your trail" : "Authenticate operator"}</span>
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
