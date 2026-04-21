"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "./header";
import { Bootloader } from "@/components/bootloader";
import { useReaderSettings } from "@/context/reader-settings-provider";
import { SidebarPopup } from "@/components/ui/sidebar/popup";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { showBootAnimation } = useReaderSettings();
  const [isBooting, setIsBooting] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    try {
      const hasBooted = sessionStorage.getItem("pageos-booted");
      if (hasBooted === "true" || !showBootAnimation) {
        setIsBooting(false);
      }
    } catch (error) {
      console.warn("Could not read sessionStorage for boot status, skipping animation.", error);
      setIsBooting(false);
    }
  }, [showBootAnimation]);

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
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SidebarPopup />
      <AppHeader />
      <main className="flex-1 animate-fade-in">{children}</main>
    </div>
  );
}
