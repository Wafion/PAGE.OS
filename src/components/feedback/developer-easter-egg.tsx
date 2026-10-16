"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ArrowRight, X, Sparkles } from "lucide-react";

export function DeveloperEasterEgg() {
  const router = useRouter();
  const pathname = usePathname();
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [keystrokeBuffer, setKeystrokeBuffer] = useState("");
  const clickCountRef = useRef(0);
  const clickResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Do not show the easter egg on the feedback page itself
  const isAlreadyOnFeedback =
    pathname.startsWith("/community/feedback") || pathname === "/feedback";

  // 1. Keystroke Sequence Listener ("d-e-v" or "letter")
  useEffect(() => {
    if (isAlreadyOnFeedback) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Handle Escape to dismiss secret modal if open
      if (e.key === "Escape" && showSecretModal) {
        setShowSecretModal(false);
        return;
      }

      // Handle Enter to proceed if secret modal is open
      if (e.key === "Enter" && showSecretModal) {
        setShowSecretModal(false);
        router.push("/community/feedback");
        return;
      }

      // Only track alphabetic keys
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        setKeystrokeBuffer((prev) => {
          const next = (prev + e.key.toLowerCase()).slice(-8);
          if (
            next.endsWith("dev") ||
            next.endsWith("letter") ||
            next.endsWith("despatch")
          ) {
            setShowSecretModal(true);
            return "";
          }
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAlreadyOnFeedback, showSecretModal, router]);

  // 2. Triple-Click Listener on Brand Logos
  useEffect(() => {
    if (isAlreadyOnFeedback) return;

    const handleBrandClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest(
        ".pageos-menu-brand, .motion-vinyl-logo, .pageos-menu-chip"
      );
      if (!target) return;

      clickCountRef.current += 1;
      if (clickResetTimerRef.current) {
        clearTimeout(clickResetTimerRef.current);
      }

      if (clickCountRef.current >= 3) {
        clickCountRef.current = 0;
        setShowSecretModal(true);
      } else {
        clickResetTimerRef.current = setTimeout(() => {
          clickCountRef.current = 0;
        }, 1200);
      }
    };

    window.addEventListener("click", handleBrandClick);
    return () => {
      window.removeEventListener("click", handleBrandClick);
      if (clickResetTimerRef.current) {
        clearTimeout(clickResetTimerRef.current);
      }
    };
  }, [isAlreadyOnFeedback]);

  if (isAlreadyOnFeedback || !showSecretModal) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setShowSecretModal(false)}
    >
      <div
        className="relative w-full max-w-[420px] bg-[#161616] text-[#f1f0ef] border border-[#f7e75e]/30 rounded-xl p-6 shadow-2xl overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 25px rgba(247, 231, 94, 0.15)",
        }}
      >
        {/* Header / Kicker */}
        <div className="flex items-center justify-between text-[10px] text-[#A09C9B] tracking-[0.2em] uppercase pb-3 border-b border-white/10">
          <span className="flex items-center gap-1.5 text-[#f7e75e]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SECRET PASSAGEWAY</span>
          </span>
          <span>// 001</span>
        </div>

        {/* Content */}
        <div className="py-5">
          <h2 className="text-lg font-serif text-[#F1F0EF] mb-2 leading-tight">
            You found the developer’s desk.
          </h2>
          <p className="text-xs text-[#A09C9B] leading-relaxed mb-4">
            A quiet space for open thoughts between readers and the creator of PAGE.OS. Share ideas, report bugs, or just leave a note.
          </p>

          <div className="bg-[#0e0e0e] border border-white/10 rounded-lg p-3 text-[11px] text-[#706E6C] flex items-center justify-between">
            <span>Code sequence verified:</span>
            <span className="text-[#f7e75e] font-bold">DESPATCH // UNLOCKED</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setShowSecretModal(false)}
            className="px-3 py-2 text-[#706E6C] hover:text-[#f1f0ef] transition-colors rounded"
          >
            Keep Reading (Esc)
          </button>

          <button
            type="button"
            onClick={() => {
              setShowSecretModal(false);
              router.push("/community/feedback");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#f7e75e] text-black font-semibold rounded hover:bg-[#ffe83f] transition-all active:scale-[0.98] shadow-md"
          >
            <span>Enter Room</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Close icon */}
        <button
          type="button"
          aria-label="Close"
          onClick={() => setShowSecretModal(false)}
          className="absolute top-4 right-4 text-[#706E6C] hover:text-[#f1f0ef] transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
