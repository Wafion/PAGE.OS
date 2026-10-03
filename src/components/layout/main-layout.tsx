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

  const handleBootComplete = () => {
    try {
      sessionStorage.setItem("pageos-booted", "true");
    } catch (error) {
      console.warn("Could not set sessionStorage for boot status.", error);
    }
    setIsBooting(false);
  };

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


