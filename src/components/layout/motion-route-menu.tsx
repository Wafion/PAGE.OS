"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { navigationItems } from "@/components/layout/navigation-items";
import { usePathname } from "next/navigation";
import { AudioControls } from "@/components/audio/audio-controls";

export function MotionRouteMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const readerHref = pathname === "/profile" ? "/read?readerMode=lounge" : "/read";

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

  return (
    <>
      <nav className="motion-vinyl-nav" aria-label="Primary" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 60, color: pathname.startsWith('/read') ? '#f4efe7' : '#0b0b0c' }}>
        <Link href="/" className="motion-vinyl-logo" aria-label="PAGE.OS home">P/OS</Link>
        <div className="motion-vinyl-links">
          {navigationItems.slice(0, 3).map(item => (
             <Link key={item.href} href={item.href}>{item.motionLabel}</Link>
          ))}
        </div>
        <div className="motion-vinyl-actions">
           <AudioControls />
        </div>
      </nav>

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






