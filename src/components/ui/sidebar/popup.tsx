"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { useAuth } from "@/context/auth-provider";
import { useReaderSettings } from "@/context/reader-settings-provider";
import { auth } from "@/lib/firebase";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  PanelLeft,
  Home,
  Library,
  Settings,
  User,
  Power,
  LogIn,
  Shield,
  Infinity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    href: "/",
    classicLabel: "System Feed",
    loungeLabel: "Front Shelf",
    detail: "Discover books, prompts, and live shelves.",
    code: "01",
    icon: Home,
  },
  {
    href: "/library",
    classicLabel: "Archive",
    loungeLabel: "Reading Collection",
    detail: "Return to saved books, bookmarks, and history.",
    code: "02",
    icon: Library,
  },
  {
    href: "/infinite",
    classicLabel: "Discover",
    loungeLabel: "Deep Space",
    detail: "Explore artworks and ideas across time and space.",
    code: "03",
    icon: Infinity,
  },
  {
    href: "/profile",
    classicLabel: "Profile",
    loungeLabel: "Reader Card",
    detail: "Identity, sync status, and account memory.",
    code: "04",
    icon: User,
  },
  {
    href: "/settings",
    classicLabel: "Settings",
    loungeLabel: "Room Controls",
    detail: "Theme, reader behavior, and source controls.",
    code: "05",
    icon: Settings,
  },
  {
    href: "/legal",
    classicLabel: "Legal",
    loungeLabel: "House Rules",
    detail: "Usage terms, privacy, and content policies.",
    code: "06",
    icon: Shield,
  },
];

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

  const menuTitle = uiMode === "lounge" ? "Navigation Room" : "Gateway Panel";
  const menuBadge = uiMode === "lounge" ? "Library lounge" : "Terminal grid";
  const menuSubtitle =
    uiMode === "lounge"
      ? "Move through the shelves, settings, and reader spaces."
      : "Jump between system routes, operator controls, and runtime pages.";
  const userLabel = user ? user.displayName || "Signed in reader" : "Guest session";
  const userMeta = user
    ? uiMode === "lounge"
      ? "Your preferences and bookmarks are being remembered."
      : "Authenticated operator with synced state."
    : uiMode === "lounge"
      ? "Sign in to carry your room, books, and bookmarks with you."
      : "Anonymous session. Authentication unlocks synced persistence.";

  return (
    <div className="fixed top-4 left-4 z-50">
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
          <div className="pageos-menu-frame">
            <div className="pageos-menu-header">
              <div className="pageos-menu-brand-row">
                <div>
                  <p className="pageos-menu-kicker">{menuBadge}</p>
                  <Link href="/" className="pageos-menu-brand" onClick={() => setOpen(false)}>
                    PAGE.OS
                  </Link>
                </div>
                <span className="pageos-menu-chip">{uiMode === "lounge" ? "Shelf map" : "v1.0"}</span>
              </div>
              <div className="pageos-menu-copy">
                <h2>{menuTitle}</h2>
                <p>{menuSubtitle}</p>
              </div>
            </div>

            <div className="pageos-menu-status">
              <div>
                <span className="pageos-menu-status-label">
                  {uiMode === "lounge" ? "Reader status" : "Operator status"}
                </span>
                <strong>{userLabel}</strong>
              </div>
              <p>{userMeta}</p>
            </div>

            <nav className="pageos-menu-nav">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                const label = uiMode === "lounge" ? item.loungeLabel : item.classicLabel;

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
                  <span>{uiMode === "lounge" ? "Leave the room" : "Terminate session"}</span>
                </Button>
              ) : (
                <Button variant="ghost" asChild className="pageos-menu-action w-full justify-start gap-3">
                  <Link href="/profile" onClick={() => setOpen(false)}>
                    <LogIn className="h-4 w-4 text-accent" />
                    <span>{uiMode === "lounge" ? "Sign in to save your room" : "Authenticate operator"}</span>
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
