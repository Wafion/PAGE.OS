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
  selectedCategory,
  onSelectCategory,
}: ArchiveCollageProps) {
  return (
    <div
      className={`relative select-text ${className}`}
      style={{ width: 595, height: 377 }}
      aria-label="Archival paper collage"
    >
      {/* 1. Celestial archive card */}
      <div
        className="absolute transition-transform duration-300 hover:scale-[1.015] hover:z-20 pointer-events-none"
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
        className="absolute group transition-transform duration-300 hover:rotate-0 hover:scale-[1.01] hover:z-20"
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
        {/* Real selectable editorial quote */}
        <div
          className="absolute font-mono text-[7.5px] leading-[1.32] text-[#2c2824] tracking-wide pointer-events-auto select-text font-medium opacity-0 hover:opacity-100 transition-opacity"
          style={{ left: 34, top: 24 }}
        >
          <p>For a better</p>
          <p>reading tomorrow.</p>
        </div>
      </div>

      {/* 3. Botanical grid sheet */}
      <div
        className="absolute group transition-transform duration-300 hover:scale-[1.015] hover:z-20 pointer-events-none"
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

      {/* 4. Lavender note with selectable & interactive tags */}
      <div
        className="absolute group transition-transform duration-300 hover:rotate-[-2deg] hover:scale-[1.02] hover:z-20"
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
        {/* Interactive clickable category hit targets aligned precisely over the master artwork */}
        <div className="absolute inset-0 pointer-events-auto select-text font-mono text-[7px] tracking-[0.14em]">
          {/* 1. IDEAS hit target */}
          <button
            type="button"
            onClick={() => onSelectCategory?.("suggestion")}
            className={`absolute flex items-center transition-all duration-150 cursor-pointer rounded-[2px] px-1 -mx-1 ${
              selectedCategory === "suggestion"
                ? "bg-white/15 text-white font-bold"
                : "text-transparent hover:bg-white/10"
            }`}
            style={{ left: 18, top: 52, width: 48, height: 11 }}
            title="Select Ideas / Suggestion"
          >
            <span className="sr-only">IDEAS</span>
            {selectedCategory === "suggestion" && (
              <span className="text-[6.5px] text-white drop-shadow-sm font-bold pl-0.5">
                IDEAS •
              </span>
            )}
          </button>

          {/* 2. FEEDBACK hit target */}
          <button
            type="button"
            onClick={() => onSelectCategory?.("feedback")}
            className={`absolute flex items-center transition-all duration-150 cursor-pointer rounded-[2px] px-1 -mx-1 ${
              selectedCategory === "feedback"
                ? "bg-white/15 text-white font-bold"
                : "text-transparent hover:bg-white/10"
            }`}
            style={{ left: 18, top: 71, width: 64, height: 11 }}
            title="Select General Feedback"
          >
            <span className="sr-only">FEEDBACK</span>
            {selectedCategory === "feedback" && (
              <span className="text-[6.5px] text-white drop-shadow-sm font-bold pl-0.5">
                FEEDBACK •
              </span>
            )}
          </button>

          {/* 3. BUG REPORTS hit target */}
          <button
            type="button"
            onClick={() => onSelectCategory?.("bug_report")}
            className={`absolute flex items-center transition-all duration-150 cursor-pointer rounded-[2px] px-1 -mx-1 ${
              selectedCategory === "bug_report"
                ? "bg-white/15 text-white font-bold"
                : "text-transparent hover:bg-white/10"
            }`}
            style={{ left: 18, top: 81, width: 78, height: 11 }}
            title="Select Bug Report"
          >
            <span className="sr-only">BUG REPORTS</span>
            {selectedCategory === "bug_report" && (
              <span className="text-[6.5px] text-white drop-shadow-sm font-bold pl-0.5">
                BUG REPORTS •
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 5. Globe card */}
      <div
        className="absolute group transition-transform duration-300 hover:rotate-[-1.5deg] hover:scale-[1.015] hover:z-20"
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
        {/* Real selectable HTML typography aligned over the globe */}
        <div
          className="absolute inset-0 flex flex-col justify-between pointer-events-auto select-text opacity-0 hover:opacity-100 transition-opacity"
          style={{ padding: "18px 16px 14px 16px" }}
        >
          <div>
            <div className="flex justify-between items-baseline font-mono text-[9.5px] font-bold tracking-[0.16em] text-[#1f1d1b]">
              <span>PAGE.OS</span>
              <span className="text-[7.5px] font-normal text-[#6b6761]">001</span>
            </div>
            <div className="font-mono text-[6.8px] font-semibold leading-[1.3] text-[#34312c] tracking-wider mt-1.5">
              A LIBRARY<br />
              FOR A MORE CURIOUS<br />
              WORLD.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
