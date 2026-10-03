"use client";

import { useEffect, useRef } from "react";

const backgroundVideoUrl = "/assets/pageos-404-background.mp4";

export default function NotFound() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    document.body.dataset.pageosNotFound = "true";
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
    <main className="pageos-not-found" aria-labelledby="pageos-not-found-title">
      <video
        ref={videoRef}
        className="pageos-not-found-video"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      >
        <source src={backgroundVideoUrl} type="video/mp4" />
      </video>

      <div className="pageos-not-found-logo" aria-label="PAGE.OS">
        <span aria-hidden="true">PAGE.OS</span>
      </div>

      <div className="pageos-not-found-content">
        <h1 id="pageos-not-found-title">404</h1>
        <hr aria-hidden="true" />
        <p>This page has drifted beyond the library. Let&apos;s find our way back.</p>
      </div>
    </main>
  );
}
