"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArchiveCollage } from "./archive-collage";
import { FeedbackForm } from "./feedback-form";
import type { FeedbackCategory } from "./feedback-category-selector";

const CATEGORY_INDEX_ITEMS: Array<{
  index: string;
  label: string;
  category: FeedbackCategory;
}> = [
  { index: "001", label: "IDEAS", category: "suggestion" },
  { index: "002", label: "BUG REPORTS", category: "bug_report" },
  { index: "003", label: "FEEDBACK", category: "feedback" },
  { index: "004", label: "FEATURE REQUESTS", category: "suggestion" },
  { index: "005", label: "GENERAL", category: "other" },
];

export function MessageToDeveloperView() {
  const [selectedCategory, setSelectedCategory] =
    useState<FeedbackCategory>("suggestion");
  const [activeItemIndex, setActiveItemIndex] = useState<string>("001");
  const [scale, setScale] = useState<number>(1);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const handleSelectCategory = (cat: FeedbackCategory, index?: string) => {
    setSelectedCategory(cat);
    if (index) {
      setActiveItemIndex(index);
    } else {
      if (cat === "suggestion") setActiveItemIndex("001");
      else if (cat === "bug_report") setActiveItemIndex("002");
      else if (cat === "feedback") setActiveItemIndex("003");
      else if (cat === "other") setActiveItemIndex("005");
      else setActiveItemIndex("");
    }
  };

  useEffect(() => {
    setIsMounted(true);

    const computeScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Base design stage dimensions
      const baseW = 1024;
      const baseH = 682;

      // Optimized padding to scale up generously without clipping
      const paddingX = vw >= 1920 ? 60 : vw >= 1440 ? 40 : 24;
      const paddingY = vh >= 1080 ? 40 : vh >= 900 ? 30 : 20;

      const scaleX = (vw - paddingX) / baseW;
      const scaleY = (vh - paddingY) / baseH;

      // Fit within both dimensions
      const target = Math.min(scaleX, scaleY);

      // Clamp scale: from 0.85 on small screens up to 2.2 on 4k displays
      const nextScale = Math.max(0.85, Math.min(target, 2.2));
      setScale(nextScale);
    };

    computeScale();
    window.addEventListener("resize", computeScale);
    return () => window.removeEventListener("resize", computeScale);
  }, []);

  return (
    <div
      className="w-full min-h-screen bg-[#121212] flex items-center justify-center overflow-auto p-2 sm:p-4 select-text"
      style={{
        background: "radial-gradient(circle at 50% 30%, #171717 0%, #101010 100%)",
      }}
    >
      {/* Dynamic Sizing Container */}
      <div
        className="relative flex items-center justify-center shrink-0 transition-transform duration-100 ease-out"
        style={{
          width: isMounted ? Math.round(1024 * scale) : 1024,
          height: isMounted ? Math.round(682 * scale) : 682,
        }}
      >
        {/* Primary Reference Stage: 1024x682 scaled via transform */}
        <div
          className="relative w-[1024px] h-[682px] shrink-0 bg-[#161616] overflow-hidden rounded-md shadow-2xl border border-white/[0.04]"
          style={{
            width: 1024,
            height: 682,
            transform: isMounted ? `scale(${scale})` : "none",
            transformOrigin: "center center",
          }}
        >
          {/* Breadcrumb */}
          <div
            className="absolute font-mono text-[9px] text-[#706E6C] tracking-[0.18em] select-text"
            style={{ left: 161, top: 57 }}
          >
            //{" "}
            <Link
              href="/"
              className="hover:text-[#F1F0EF] transition-colors underline decoration-white/20 underline-offset-2"
              title="Return to PAGE.OS Home"
            >
              PAGE.OS
            </Link>{" "}
            / COMMUNITY / FEEDBACK
          </div>

          {/* Main Editorial Headline */}
          <div
            className="absolute select-text"
            style={{
              left: 160,
              top: 83,
              fontFamily: "var(--font-motion), 'Bodoni Moda', Didot, Georgia, serif",
            }}
          >
            <h1 className="text-[55px] font-normal leading-[0.88] tracking-[-0.035em] m-0 p-0">
              <span className="block text-[#F1F0EF]">Message to</span>
              <span className="block">
                <span className="text-[#F1F0EF]">the </span>
                <span className="text-[#E0DBF9]">Developer</span>
              </span>
            </h1>
          </div>

          {/* Upper-Right Interactive Category Selection Index */}
          <div
            className="absolute font-mono text-[9px] text-[#6E6B6A] leading-[1.6] tracking-[0.14em]"
            style={{ left: 713, top: 83 }}
          >
            {CATEGORY_INDEX_ITEMS.map((item) => {
              const isActive = activeItemIndex === item.index;
              return (
                <button
                  key={item.index}
                  type="button"
                  onClick={() => handleSelectCategory(item.category, item.index)}
                  className={`block w-full text-left transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? "text-[#F1F0EF] font-bold"
                      : "hover:text-[#B8B4B2]"
                  }`}
                  title={`Select ${item.label}`}
                >
                  <span className={isActive ? "text-[#E0DBF9]" : "opacity-60"}>
                    {item.index}
                  </span>
                  &nbsp;&nbsp;&nbsp;
                  <span>{item.label}</span>
                  {isActive && <span className="text-[#E0DBF9] ml-1.5">•</span>}
                </button>
              );
            })}
          </div>

          {/* Upper-Right Archival Annotation */}
          <div
            className="absolute font-mono text-[9px] text-[#6E6B6A] leading-[1.5] tracking-[0.14em] select-text"
            style={{ left: 890, top: 84 }}
          >
            <div className="w-6 h-[1px] bg-[#6E6B6A] mb-3.5" />
            <div>A SMALL CORNER</div>
            <div>FOR YOUR THOUGHTS</div>
            <div className="mt-3.5">// 2026</div>
          </div>

          {/* Two-Column Descriptive Copy */}
          {/* Left Column */}
          <div
            className="absolute font-mono text-[9.5px] text-[#A09C9B] leading-[1.38] select-text"
            style={{ left: 161, top: 204, width: 220 }}
          >
            <p className="mb-2.5">
              <span className="underline decoration-1 underline-offset-2">PAGE.OS</span> is a growing project, and your<br />
              thoughts help shape what comes next.
            </p>
            <p>
              Share your ideas, feedback, bug reports,<br />
              feature requests, or just say hello –<br />
              I read every message.
            </p>
          </div>

          {/* Vertical Divider */}
          <div
            className="absolute w-[1px] bg-white/15"
            style={{ left: 397, top: 204, height: 58 }}
          />

          {/* Right Column */}
          <div
            className="absolute font-mono text-[9.5px] text-[#A09C9B] leading-[1.38] select-text"
            style={{ left: 423, top: 204, width: 220 }}
          >
            <p className="mb-2.5">
              This is a space for open conversation<br />
              between readers and the developer.
            </p>
            <p>
              Whether it’s a suggestion, an issue, a<br />
              question, or your appreciation, every<br />
              message is part of <span className="underline decoration-1 underline-offset-2">PAGE.OS</span>’s journey.
            </p>
          </div>

          {/* Lower Left Paper Collage with Selection Assets */}
          <div className="absolute" style={{ left: 58, top: 280 }}>
            <ArchiveCollage
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => handleSelectCategory(cat)}
            />
          </div>

          {/* Blue Form Panel with Selection Integration */}
          <div className="absolute" style={{ left: 672, top: 196 }}>
            <FeedbackForm
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => handleSelectCategory(cat)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
