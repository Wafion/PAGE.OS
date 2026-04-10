"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReaderSettings } from "@/context/reader-settings-provider";

// === Boot Sequence ===
const bootSequence = [
  { text: "[ INITIATING BOOTLOADER ]", delay: 80 },
  { text: "> PAGEOS v1.0 — TERMINAL READER ENVIRONMENT", delay: 120 },
  { text: "> Made with ❤️ by Celeron", delay: 100, isAccent: true },
  { text: "> MEMLINK PROTOCOL: ACTIVE", delay: 200 },
  { text: "> LINKING NODE(S): GUTENDEX | Web ", delay: 150, isAccent: true },
  { text: "> MEMORY STREAM STATUS: ONLINE", delay: 150 },
  { text: "> DECODER ENGINE: READY", delay: 200, isAccent: true },
  { text: "progress", delay: 100 },
  { text: "> DECOMPRESSING SHELL ENVIRONMENT... OK", delay: 180 },
  { text: "> SESSION ID: Exploror-ALPHA-001", delay: 150 },
  { text: "> WELCOME TO PAGEOS", delay: 300, isAccent: true },
];

// === Progress Bar Line ===
const ProgressBar = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 15;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [onComplete]);

  const filled = Math.floor(progress / 10);
  const empty = 10 - filled;

  return (
    <p>
      {`> RETRIEVING BOOK INDEX [`}
      <span className="text-accent">{"▓".repeat(filled)}</span>
      <span>{"░".repeat(empty)}</span>
      {`] ${Math.floor(progress)}%`}
    </p>
  );
};

// === Typewriter Effect ===
const TypedLine = ({ text, onComplete }: { text: string; onComplete: () => void }) => {
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    const chars = [...text];
    const interval = setInterval(() => {
      setTypedText((prev) => {
        if (chars.length === 0) {
          clearInterval(interval);
          onComplete();
          return prev;
        }
        return prev + chars.shift();
      });
    }, 30);

    return () => clearInterval(interval);
  }, [text, onComplete]);

  return (
    <span>
      {typedText}
      <span className="cursor-blink ml-1 inline-block h-5 w-2.5 translate-y-1 bg-white" />
    </span>
  );
};

// === Bootloader Component ===
export function Bootloader({ onComplete }: { onComplete: () => void }) {
  const { showBootAnimation } = useReaderSettings();
  const [lines, setLines] = useState<
    { text: string; isAccent?: boolean; isTyping?: boolean; id: number }[]
  >([]);
  const sequenceIndex = useRef(0);
  const hasBootCompleted = useRef(false);
  const hasStarted = useRef(false);

  const runNextLine = useCallback(() => {
    const index = sequenceIndex.current;
    if (index >= bootSequence.length) {
      // Finished all lines
      setTimeout(() => {
        if (!hasBootCompleted.current) {
          hasBootCompleted.current = true;
          onComplete();
        }
      }, 1000);
      return;
    }

    const item = bootSequence[index];
    sequenceIndex.current += 1;

    setLines((prev) =>
      prev.map((l) => ({ ...l, isTyping: false })).concat({
        ...item,
        isTyping: true,
        id: Date.now(),
      })
    );
  }, [onComplete]);

  // === Boot Sequence Starter ===
  useEffect(() => {
    if (!showBootAnimation) {
      onComplete();
      return;
    }

    if (!hasStarted.current) {
      hasStarted.current = true;
      runNextLine();
    }
  }, [showBootAnimation, runNextLine]);

  // === Skip on Click ===
  const handleSkip = () => {
    if (hasBootCompleted.current) return;
    hasBootCompleted.current = true;
    onComplete();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black font-body text-white cursor-pointer"
        onClick={handleSkip}
      >
        <div className="w-full max-w-3xl p-8">
          {lines.map(({ text, isAccent, isTyping, id }) => {
            if (text === "progress") {
              return <ProgressBar key={id} onComplete={runNextLine} />;
            }
            return (
              <p key={id} className={isAccent ? "text-accent" : ""}>
                {isTyping ? (
                  <TypedLine text={text} onComplete={runNextLine} />
                ) : (
                  text
                )}
              </p>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
