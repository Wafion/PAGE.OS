"use client";

import { useEffect, useRef } from "react";

const backgroundVideoUrl = "/assets/pageos-404-background.mp4";

export function NotFoundClient() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    document.body.dataset.pageosNotFound = "true";
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.defaultMuted = true;
    }
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pauseForReducedMotion = () => {
      if (mediaQuery.matches) {
        videoRef.current?.pause();
      } else if (videoRef.current?.paused) {
        void videoRef.current.play().catch(() => undefined);
      }
    };

    pauseForReducedMotion();
    mediaQuery.addEventListener("change", pauseForReducedMotion);

    return () => {
      mediaQuery.removeEventListener("change", pauseForReducedMotion);
      delete document.body.dataset.pageosNotFound;
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className="pageos-not-found-video"
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
    >
      <source src={backgroundVideoUrl} type="video/mp4" />
    </video>
  );
}
