"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FeedbackCategorySelector,
  type FeedbackCategory,
} from "./feedback-category-selector";

interface FeedbackFormProps {
  onClose?: () => void;
  selectedCategory?: FeedbackCategory;
  onSelectCategory?: (cat: FeedbackCategory) => void;
}

export function FeedbackForm({
  onClose,
  selectedCategory,
  onSelectCategory,
}: FeedbackFormProps) {
  const router = useRouter();
  const [internalCategory, setInternalCategory] = useState<FeedbackCategory>("suggestion");
  const category = selectedCategory ?? internalCategory;

  const handleCategoryChange = (cat: FeedbackCategory) => {
    setInternalCategory(cat);
    onSelectCategory?.(cat);
  };
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!message.trim()) {
      setErrorMessage("Please enter a message before sending.");
      return;
    }

    if (message.length > 2000) {
      setErrorMessage("Message exceeds 2,000 characters.");
      return;
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setErrorMessage("Please provide a valid email address or leave blank.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          message: message.trim(),
          email: email.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send message. Please try again.");
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to submit message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div
        className="w-[328px] h-[438px] bg-[#1d5cf9] rounded-[14px] p-3.5 flex flex-col justify-between shadow-2xl relative select-none"
        style={{ minWidth: 328, maxWidth: 328, minHeight: 438, maxHeight: 438 }}
      >
        <div className="flex justify-between items-center text-[#00125f] font-mono text-[9.5px] font-bold tracking-widest">
          <span>SEND A MESSAGE</span>
          <span>001</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 my-auto">
          <div className="w-10 h-10 rounded-full bg-[#161616] text-[#f7e75e] flex items-center justify-center mb-3 border border-white/20">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 className="text-white font-mono text-[12.5px] font-medium mb-1.5">
            Message Received
          </h3>
          <p className="text-white/80 font-mono text-[9.5px] leading-relaxed">
            Thank you for sharing your thoughts. Every message helps shape the future of PAGE.OS.
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => {
              setIsSubmitted(false);
              setMessage("");
              setSubject("");
            }}
            className="flex-1 h-[34px] bg-[#f7e75e] hover:bg-[#ffe93b] text-black font-sans font-bold text-[10.5px] rounded-[7px] flex items-center justify-center transition-colors"
          >
            Send Another Message
          </button>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="w-[34px] h-[34px] shrink-0 bg-[#f93131] hover:bg-[#ff2020] text-black rounded-full flex items-center justify-center transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-[328px] h-[438px] bg-[#1d5cf9] rounded-[14px] p-3.5 flex flex-col justify-between shadow-2xl relative select-none"
      style={{ minWidth: 328, maxWidth: 328, minHeight: 438, maxHeight: 438 }}
    >
      {/* Header */}
      <div>
        <div className="flex justify-between items-center text-[#00125f] font-mono text-[9.5px] font-bold tracking-widest">
          <span>SEND A MESSAGE</span>
          <span>001</span>
        </div>

        <div className="text-[#8ebeff] font-mono text-[10px] mt-2 mb-1.5 font-normal">
          What’s this about?
        </div>

        {/* Categories */}
        <FeedbackCategorySelector
          selectedCategory={category}
          onSelectCategory={handleCategoryChange}
        />
      </div>

      {/* Input Fields */}
      <div className="flex flex-col gap-1.5 my-auto">
        {/* Subject */}
        <div>
          <label
            htmlFor="feedback-subject"
            className="block text-[#8ebeff] font-mono text-[9.5px] mb-0.5"
          >
            Subject
          </label>
          <input
            id="feedback-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="A short summary of your message..."
            maxLength={200}
            className="w-full h-[30px] bg-[#171717] text-white placeholder:text-[#757575] font-mono text-[9.5px] px-2.5 rounded-[5px] outline-none border border-black/20 focus:border-white/30 transition-colors"
          />
        </div>

        {/* Your Message */}
        <div>
          <label
            htmlFor="feedback-message"
            className="block text-[#8ebeff] font-mono text-[9.5px] mb-0.5"
          >
            Your Message
          </label>
          <textarea
            id="feedback-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={"Write your message here...\n\nFeel free to be as detailed as you like."}
            maxLength={2000}
            rows={3}
            className="w-full h-[80px] bg-[#171717] text-white placeholder:text-[#757575] font-mono text-[9.5px] p-2 rounded-[5px] outline-none border border-black/20 focus:border-white/30 transition-colors resize-none leading-relaxed"
          />
          <div className="text-right text-[#5b8eec] font-mono text-[8px] -mt-0.5">
            {message.length} / 2000
          </div>
        </div>

        {/* Optional Email */}
        <div>
          <label
            htmlFor="feedback-email"
            className="block text-[#8ebeff] font-mono text-[9.5px] mb-0.5"
          >
            Optional
          </label>
          <div className="relative flex items-center bg-[#171717] rounded-[5px] h-[30px] px-2 border border-black/20 focus-within:border-white/30 transition-colors">
            <svg
              className="w-3.5 h-3.5 text-neutral-400 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email (optional)"
              className="w-full bg-transparent text-white placeholder:text-[#757575] font-mono text-[9.5px] px-1.5 outline-none"
            />
          </div>
          <p className="text-[#001768] font-mono text-[7.5px] mt-0.5 leading-tight">
            Leave this if you&apos;d like a reply. Otherwise, you can stay anonymous.
          </p>
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="text-red-200 bg-red-950/70 border border-red-500/40 rounded px-2 py-1 text-[8.5px] font-mono -mt-1 mb-1">
          {errorMessage}
        </div>
      )}

      {/* Bottom Controls */}
      <div className="flex gap-2 items-center">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 h-[34px] bg-[#f7e75e] hover:bg-[#ffe93b] active:scale-[0.98] disabled:opacity-60 text-black font-sans font-bold text-[10.5px] rounded-[7px] flex items-center justify-center gap-1.5 transition-all shadow-sm"
        >
          {isSubmitting ? (
            <span>Sending...</span>
          ) : (
            <>
              <svg
                className="w-3.5 h-3.5 fill-black -rotate-45"
                viewBox="0 0 24 24"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
              <span>Send Message</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="w-[34px] h-[34px] shrink-0 bg-[#f93131] hover:bg-[#ff2020] active:scale-[0.96] text-black rounded-full flex items-center justify-center transition-all shadow-sm"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </form>
  );
}
