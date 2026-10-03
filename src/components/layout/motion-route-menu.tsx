"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { navigationItems } from "@/components/layout/navigation-items";
import { usePathname } from "next/navigation";
import { AudioControls } from "@/components/audio/audio-controls";

export function MotionRouteMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("motion-menu-open");
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.classList.remove("motion-menu-open");
    };
  }, [open]);

  const KNOWN_ROUTES = new Set([
    "/",
    "/infinite",
    "/library",
    "/profile",
    "/settings",
    "/legal",
    "/legal/dmca",
    "/statistics",
  ]);

  const isUnmatched = (path: string | null): boolean => {
    if (!path) return false;
    if (KNOWN_ROUTES.has(path)) return false;
    if (path.startsWith("/read")) return false;
    if (path.startsWith("/infinite")) return false;
    if (path.startsWith("/api/")) return false;
    return true;
  };

  const [isNotFound, setIsNotFound] = useState(() => {
    if (isUnmatched(pathname)) return true;
    if (typeof document !== "undefined") {
      return (
        document.body.dataset.pageosNotFound === "true" ||
        Boolean(document.querySelector(".pageos-not-found"))
      );
    }
    return false;
  });

  useEffect(() => {
    const checkNotFound = () => {
      const notFound =
        isUnmatched(pathname) ||
        document.body.dataset.pageosNotFound === "true" ||
        Boolean(document.querySelector(".pageos-not-found"));
      setIsNotFound(notFound);
    };
    checkNotFound();
    const observer = new MutationObserver(checkNotFound);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-pageos-not-found"],
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [pathname]);

  const isReader = pathname.startsWith("/read");
  const isLibrary = pathname === "/library";
  const hideAudioPill = isReader || isLibrary || isNotFound;
  const hideLogo = pathname !== "/";

  const isDarkSection = pathname === "/infinite" || pathname.startsWith("/read") || isNotFound;
  const logoColor = isNotFound ? "#ffffff" : isDarkSection ? "#f4efe7" : "#0b0b0c";
  const logoShadow = isNotFound
    ? "0 2px 14px rgba(0,0,0,0.75)"
    : isDarkSection
    ? "0 1px 4px rgba(0,0,0,0.8)"
    : "0 1px 2px rgba(255,255,255,0.7)";

  return (
    <>
      {!hideLogo && (
        <nav
          className="motion-vinyl-nav"
          aria-label="Primary"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 60,
            color: logoColor,
            textShadow: logoShadow,
            pointerEvents: "none",
          }}
        >
          <Link href="/" className="motion-vinyl-logo" aria-label="PAGE.OS home" style={{ pointerEvents: "auto" }}>P/OS</Link>
        </nav>
      )}

      {!hideAudioPill && (
        <div className="motion-audio-pill" aria-label="Ambient music controls">
          <AudioControls />
        </div>
      )}

      <div className="motion-route-menu">
        <button
          type="button"
          className={`motion-vinyl-menu motion-route-menu-toggle ${open ? "is-active" : ""}`}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="motion-route-menu"
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>

        <div id="motion-route-menu" className={`motion-vinyl-mobile-menu ${open ? "is-open" : ""}`}>
          <nav aria-label="Page routes">
            <ul>
              {navigationItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={pathname === item.href ? "is-current" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {item.motionLabel}
                    <small>{item.location}</small>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="motion-vinyl-mobile-rule" />
            <Link href="/library" className="motion-vinyl-drop" onClick={() => setOpen(false)}>
              Open the shelf
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}







