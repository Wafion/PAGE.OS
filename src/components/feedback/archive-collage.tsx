"use client";

import React from "react";
import type { FeedbackCategory } from "./feedback-category-selector";

interface ArchiveCollageProps {
  className?: string;
  selectedCategory?: FeedbackCategory;
  onSelectCategory?: (category: FeedbackCategory) => void;
}

export function ArchiveCollage({
  className = "",
}: ArchiveCollageProps) {
  return (
    <div
      className={`relative select-none pointer-events-none ${className}`}
      style={{ width: 595, height: 377 }}
      aria-label="Archival paper collage"
    >
      {/* 1. Celestial archive card */}
      <div
        className="absolute transition-transform duration-300 hover:scale-[1.015] hover:z-20 pointer-events-auto"
        style={{
          left: 225,
          top: 55,
          width: 375,
          height: 242,
          zIndex: 1,
          transform: "rotate(1.5deg)",
        }}
      >
        <img
          src="/assets/feedback/pageos-celestial-archive.webp"
          alt="Celestial moon archive sheet"
          width={375}
          height={242}
          draggable={false}
          className="w-full h-full object-contain drop-shadow-sm select-none"
        />
      </div>

      {/* 2. Mountain engraving sheet */}
      <div
        className="absolute group transition-transform duration-300 hover:rotate-0 hover:scale-[1.01] hover:z-20 pointer-events-auto"
        style={{
          left: 28,
          top: 225,
          width: 395,
          height: 249,
          zIndex: 2,
          transform: "rotate(-1.2deg)",
        }}
      >
        <img
          src="/assets/feedback/pageos-mountain-archive.webp"
          alt="Mountain engraving sheet"
          width={395}
          height={249}
          draggable={false}
          className="w-full h-full object-contain drop-shadow-sm select-none"
        />
      </div>

      {/* 3. Botanical grid sheet */}
      <div
        className="absolute group transition-transform duration-300 hover:scale-[1.015] hover:z-20 pointer-events-auto"
        style={{
          left: 215,
          top: 215,
          width: 370,
          height: 241,
          zIndex: 3,
          transform: "rotate(-1deg)",
        }}
      >
        <img
          src="/assets/feedback/pageos-botanical-grid.webp"
          alt="Botanical sketch on grid paper"
          width={370}
          height={241}
          draggable={false}
          className="w-full h-full object-contain drop-shadow-sm select-none"
        />
      </div>

      {/* 4. Lavender note */}
      <div
        className="absolute group transition-transform duration-300 hover:rotate-[-2deg] hover:scale-[1.02] hover:z-20 pointer-events-auto"
        style={{
          left: -18,
          top: 105,
          width: 175,
          height: 178,
          zIndex: 4,
          transform: "rotate(-3.5deg)",
        }}
      >
        <img
          src="/assets/feedback/pageos-paper-notes.webp"
          alt="Muted lavender note"
          width={175}
          height={178}
          draggable={false}
          className="w-full h-full object-contain drop-shadow-sm select-none"
        />
      </div>

      {/* 5. Globe card */}
      <div
        className="absolute group transition-transform duration-300 hover:rotate-[-1.5deg] hover:scale-[1.015] hover:z-20 pointer-events-auto"
        style={{
          left: 32,
          top: 10,
          width: 295,
          height: 236,
          zIndex: 5,
          transform: "rotate(-2.5deg)",
          transformOrigin: "center center",
        }}
      >
        <img
          src="/assets/feedback/pageos-paper-globe.webp"
          alt="PAGE.OS globe card"
          width={295}
          height={236}
          draggable={false}
          className="w-full h-full object-contain drop-shadow-md select-none"
        />
      </div>
    </div>
  );
}
