"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "./header";
import { Bootloader } from "@/components/bootloader";
import { useReaderSettings } from "@/context/reader-settings-provider";
import { SidebarPopup } from "@/components/ui/sidebar/popup";
import { MotionRouteMenu } from "./motion-route-menu";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { showBootAnimation, uiMode } = useReaderSettings();
  const [isBooting, setIsBooting] = useState(true);
  const pathname = usePathname();
  const isInfinitePage = pathname.startsWith("/infinite");

  useEffect(() => {
    if (uiMode === "lounge" || uiMode === "motion") {
      setIsBooting(false);
      return;
    }
    try {
      const hasBooted = sessionStorage.getItem("pageos-booted");
      if (hasBooted === "true" || !showBootAnimation) {
        setIsBooting(false);
      }
    } catch (error) {
      console.warn("Could not read sessionStorage for boot status, skipping animation.", error);
      setIsBooting(false);
    }
  }, [showBootAnimation, uiMode]);

  useEffect(() => {
    const handleChunkError = (event: PromiseRejectionEvent | ErrorEvent) => {
      const error = "reason" in event ? event.reason : event.error;
      const message = error?.message || "";
      if (
        error?.name === "ChunkLoadError" ||
        message.includes("Loading chunk") ||
        message.includes("ChunkLoadError")
      ) {
        console.warn("ChunkLoadError detected, reloading page to fetch latest chunks...", error);
        window.location.reload();
      }
    };

    window.addEventListener("unhandledrejection", handleChunkError);
    window.addEventListener("error", handleChunkError);

    return () => {
      window.removeEventListener("unhandledrejection", handleChunkError);
      window.removeEventListener("error", handleChunkError);
    };
  }, []);

  const handleBootComplete = () => {
    try {
      sessionStorage.setItem("pageos-booted", "true");
    } catch (error) {
      console.warn("Could not set sessionStorage for boot status.", error);
    }
    setIsBooting(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    let link = document.getElementById("dynamic-favicon") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = "dynamic-favicon";
      link.rel = "icon";
      document.head.appendChild(link);
    }
    
    if (uiMode === "motion") {
      link.type = "image/png";
      link.href = "/favicon-motion.png";
    } else {
      link.type = "image/x-icon";
      link.href = "/favicon.ico";
    }
  }, [uiMode]);

  if (isBooting) {
    return <Bootloader onComplete={handleBootComplete} />;
  }

  if (pathname.startsWith("/read")) {
    return (
      <main className="pageos-app-shell pageos-reader-shell" data-page-route={pathname}>
        {uiMode === "motion" ? <MotionRouteMenu /> : <SidebarPopup />}
        {children}
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {uiMode === "motion" ? <MotionRouteMenu /> : <SidebarPopup />}
      <AppHeader />
      <main
        key={pathname}
        data-page-route={pathname}
        className={`${uiMode === "motion" ? "pageos-route-stage" : ""} flex-1${isInfinitePage ? " flex min-h-0 flex-col" : ""}`}
      >
        {children}
      </main>
    </div>
  );
}






