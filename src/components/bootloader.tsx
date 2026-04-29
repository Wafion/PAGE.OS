"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ChevronRight, LogIn, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useReaderSettings } from "@/context/reader-settings-provider";
import { useAuth } from "@/context/auth-provider";

const bootSequence = [
  { text: "[ INITIATING BOOTLOADER ]", delay: 80 },
  { text: "> PAGEOS v1.0 - TERMINAL READER ENVIRONMENT", delay: 120 },
  { text: "> Made with care by Celeron", delay: 100, isAccent: true },
  { text: "> MEMLINK PROTOCOL: ACTIVE", delay: 200 },
  { text: "> LINKING NODE(S): GUTENDEX | WEB", delay: 150, isAccent: true },
  { text: "> MEMORY STREAM STATUS: ONLINE", delay: 150 },
  { text: "> DECODER ENGINE: READY", delay: 200, isAccent: true },
  { text: "progress", delay: 100 },
  { text: "> DECOMPRESSING SHELL ENVIRONMENT... OK", delay: 180 },
  { text: "> SESSION ID: Explorer-ALPHA-001", delay: 150 },
  { text: "> WELCOME TO PAGEOS", delay: 300, isAccent: true },
];

const loungeBooks = [
  { className: "lounge-boot-book-1", palette: "crimson" },
  { className: "lounge-boot-book-2", palette: "ink" },
  { className: "lounge-boot-book-3", palette: "amber" },
  { className: "lounge-boot-book-4", palette: "forest" },
  { className: "lounge-boot-book-5", palette: "plum" },
  { className: "lounge-boot-book-6", palette: "night" },
  { className: "lounge-boot-book-7", palette: "copper" },
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
  const router = useRouter();
  const { user } = useAuth();
  const [isEntering, setIsEntering] = useState(false);

  const handleEnter = useCallback(() => {
    setIsEntering(true);
    window.setTimeout(() => {
      onComplete();
    }, 280);
  }, [onComplete]);

  const handleSignIn = useCallback(() => {
    setIsEntering(true);
    window.setTimeout(() => {
      onComplete();
      router.push("/profile");
    }, 220);
  }, [onComplete, router]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        animate={{ opacity: isEntering ? 0 : 1 }}
        transition={{ duration: 0.45 }}
        className="lounge-boot-screen"
        onClick={handleEnter}
      >
        <div className="lounge-boot-card" onClick={(event) => event.stopPropagation()}>
          <div className="lounge-boot-brand">
            <span>PAGE.OS</span>
            <Sparkles className="h-4 w-4" />
          </div>

          <div className="lounge-boot-copy">
            <p className="library-kicker">Quietly built for readers</p>
            <h1>Step into the Lounge</h1>
            <p>
              A calmer shelf for public-domain books, web finds, and long-form
              reading.
            </p>
          </div>

          <div className="lounge-boot-orbit-shell" aria-hidden="true">
            <motion.div
              className="lounge-boot-orbit-ring"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 22, ease: "linear" }}
            >
              {loungeBooks.map((book, index) => (
                <motion.div
                  key={book.className}
                  className={`lounge-boot-book ${book.className} ${book.palette}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1, rotate: index % 2 ? 10 : -10 }}
                  transition={{ delay: index * 0.1, duration: 0.6, ease: "easeOut" }}
                />
              ))}
            </motion.div>

            <motion.div
              className="lounge-boot-center"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <BookOpen className="h-7 w-7" />
              <span>Open a slower page</span>
              <small>Tap a book or enter below</small>
            </motion.div>
          </div>

          <div className="lounge-boot-actions">
            <Button
              type="button"
              className="library-primary-action h-12 px-5"
              onClick={handleEnter}
            >
              Enter the Lounge <ChevronRight className="h-4 w-4" />
            </Button>
            {!user && (
              <Button
                type="button"
                variant="outline"
                className="library-secondary-action h-12 px-5"
                onClick={handleSignIn}
              >
                Sign in <LogIn className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="lounge-boot-footer">
            <div>
              <strong>Created by Celeron</strong>
              <span>Designed for quiet reading sessions and better wandering.</span>
            </div>
            <div>
              <strong>Powered by Gutenberg + Brave</strong>
              <span>Tap anywhere to continue, or sign in to sync your shelf.</span>
            </div>
          </div>
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
