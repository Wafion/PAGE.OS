"use client";

import React from "react";

export type FeedbackCategory =
  | "suggestion"
  | "bug_report"
  | "feedback"
  | "just_saying_hi"
  | "other";

interface FeedbackCategorySelectorProps {
  selectedCategory: FeedbackCategory;
  onSelectCategory: (cat: FeedbackCategory) => void;
}

export function FeedbackCategorySelector({
  selectedCategory,
  onSelectCategory,
}: FeedbackCategorySelectorProps) {
  const row1: Array<{
    id: FeedbackCategory;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "suggestion",
      title: "Suggestion",
      subtitle: "Ideas & features",
      icon: (
        <svg
          className="w-3.5 h-3.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
          <path d="M9 18h6" />
          <path d="M10 22h4" />
        </svg>
      ),
    },
    {
      id: "bug_report",
      title: "Bug Report",
      subtitle: "Issues & errors",
      icon: (
        <svg
          className="w-3.5 h-3.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      id: "feedback",
      title: "General Feedback",
      subtitle: "Your thoughts",
      icon: (
        <svg
          className="w-3.5 h-3.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
  ];

  const row2: Array<{
    id: FeedbackCategory;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "just_saying_hi",
      title: "Just Saying Hi",
      subtitle: "Appreciation",
      icon: (
        <svg
          className="w-3.5 h-3.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      ),
    },
    {
      id: "other",
      title: "Other",
      subtitle: "Miscellaneous",
      icon: (
        <svg
          className="w-3.5 h-3.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="8" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="16" cy="12" r="1.5" fill="currentColor" />
        </svg>
      ),
    },
  ];

  const renderTile = (item: {
    id: FeedbackCategory;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
  }) => {
    const isSelected = selectedCategory === item.id;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelectCategory(item.id)}
        className={`group relative flex items-center gap-1 rounded-[7px] px-1.5 py-1 text-left transition-all outline-none ${
          isSelected
            ? "bg-[#161616] text-white border border-white/20 shadow-sm"
            : "bg-transparent border border-[#0c359e] text-[#001768] hover:bg-black/5"
        }`}
        style={{ height: 36 }}
      >
        <div
          className={`shrink-0 flex items-center justify-center ${
            isSelected ? "text-white" : "text-[#001768]"
          }`}
        >
          {item.icon}
        </div>
        <div className="flex flex-col min-w-0 leading-tight">
          <span
            className={`font-sans text-[8.5px] font-semibold tracking-tight truncate whitespace-nowrap ${
              isSelected ? "text-white" : "text-[#001768]"
            }`}
          >
            {item.title}
          </span>
          <span
            className={`font-sans text-[7px] tracking-tight truncate whitespace-nowrap ${
              isSelected ? "text-neutral-400" : "text-[#001768]/80"
            }`}
          >
            {item.subtitle}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* Row 1: 3 tiles */}
      <div className="grid grid-cols-3 gap-1">{row1.map(renderTile)}</div>

      {/* Row 2: 2 tiles */}
      <div className="grid grid-cols-2 gap-1">{row2.map(renderTile)}</div>
    </div>
  );
}
