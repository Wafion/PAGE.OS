"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Sparkles } from "lucide-react";
import { useReaderSettings } from "@/context/reader-settings-provider";

const bootSequence = [
  { text: "[ INITIATING BOOTLOADER ]", delay: 80 },
  { text: "> PAGEOS v1.0 - TERMINAL READER ENVIRONMENT", delay: 120 },
  { text: "> Made with 💖 and care by Celeron", delay: 100, isAccent: true },
  { text: "> MEMLINK PROTOCOL: ACTIVE", delay: 200 },
  { text: "> LINKING NODE(S): GUTENDEX | WEB", delay: 150, isAccent: true },
  { text: "> MEMORY STREAM STATUS: ONLINE", delay: 150 },
  { text: "> DECODER ENGINE: READY", delay: 200, isAccent: true },
  { text: "progress", delay: 100 },
  { text: "> DECOMPRESSING SHELL ENVIRONMENT... OK", delay: 180 },
  { text: "> SESSION ID: Explorer-ALPHA-001", delay: 150 },
  { text: "> WELCOME TO PAGEOS", delay: 300, isAccent: true },
];

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
      {"> RETRIEVING BOOK INDEX ["}
      <span className="text-accent">{"#".repeat(filled)}</span>
      <span>{"-".repeat(empty)}</span>
      {`] ${Math.floor(progress)}%`}
    </p>
  );
};

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

function LoungeBootloader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const hasCompleted = useRef(false);

  const finish = useCallback(() => {
    if (hasCompleted.current) {
      return;
    }

    hasCompleted.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 7, 100);
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(finish, 450);
        }

        return next;
      });
    }, 115);

    return () => clearInterval(interval);
  }, [finish]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45 }}
        className="lounge-boot-screen"
        onClick={finish}
      >
        <div className="lounge-boot-card">
          <div className="lounge-boot-brand">
            <span>PAGE.OS</span>
            <Sparkles className="h-4 w-4" />
          </div>

          <div className="lounge-boot-orbit" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((item) => (
              <motion.div
                key={item}
                className={`lounge-boot-book lounge-boot-book-${item + 1}`}
                initial={{ opacity: 0, y: 16, rotate: 0 }}
                animate={{ opacity: 1, y: 0, rotate: item % 2 ? 8 : -8 }}
                transition={{ delay: item * 0.12, duration: 0.55, ease: "easeOut" }}
              />
            ))}
            <motion.div
              className="lounge-boot-center"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <BookOpen className="h-7 w-7" />
              <span>Opening the Lounge</span>
            </motion.div>
          </div>

          <div className="lounge-boot-progress" aria-label="Loading Library Lounge">
            <div style={{ width: `${progress}%` }} />
          </div>
          <p className="lounge-boot-caption">
            Curating shelves, chapters, and saved preferences...
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function Bootloader({ onComplete }: { onComplete: () => void }) {
  const { showBootAnimation, uiMode } = useReaderSettings();
  const [lines, setLines] = useState<
    { text: string; isAccent?: boolean; isTyping?: boolean; id: number }[]
  >([]);
  const sequenceIndex = useRef(0);
  const hasBootCompleted = useRef(false);
  const hasStarted = useRef(false);

  const runNextLine = useCallback(() => {
    const index = sequenceIndex.current;
    if (index >= bootSequence.length) {
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
      prev.map((line) => ({ ...line, isTyping: false })).concat({
        ...item,
        isTyping: true,
        id: Date.now(),
      }),
    );
  }, [onComplete]);

  useEffect(() => {
    if (!showBootAnimation) {
      onComplete();
      return;
    }

    if (uiMode === "lounge") {
      return;
    }

    if (!hasStarted.current) {
      hasStarted.current = true;
      runNextLine();
    }
  }, [showBootAnimation, runNextLine, onComplete, uiMode]);

  const handleSkip = () => {
    if (hasBootCompleted.current) {
      return;
    }

    hasBootCompleted.current = true;
    onComplete();
  };

  if (uiMode === "lounge") {
    return <LoungeBootloader onComplete={onComplete} />;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center bg-black font-body text-white"
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
