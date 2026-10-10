"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Search,
  ChevronDown,
  LayoutGrid,
  List as ListIcon,
  MoreHorizontal,
  BookOpen,
  Info,
  Trash2,
  Share2,
  Check,
  LoaderCircle,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, setPersistence, browserLocalPersistence } from "firebase/auth";
import {
  getLibraryBooks,
  removeBookFromLibrary,
  generateBookId,
  LibraryBook,
} from "@/services/userData";
import { useBookBriefing } from "@/context/book-briefing-provider";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SearchResult } from "@/adapters/sourceManager";

type FilterType = "all" | "reading" | "completed" | "unread" | "gutenberg";

export function MotionLibrary() {
  const { user } = useAuth();
  const router = useRouter();
  const { showBriefing } = useBookBriefing();
  const { toast } = useToast();

  const [books, setBooks] = useState<(LibraryBook & { progress?: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load user saved books from Firebase Firestore
  useEffect(() => {
    let isMounted = true;

    async function loadBooks() {
      if (!user) {
        setBooks([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const userBooks = await getLibraryBooks(user.uid);
        if (isMounted) {
          setBooks(userBooks || []);
        }
      } catch (err) {
        console.error("Error loading library books from Firebase:", err);
        if (isMounted) {
          setBooks([]);
          toast({
            title: "Library unavailable",
            description: "Could not load your saved books from the cloud.",
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadBooks();

    return () => {
      isMounted = false;
    };
  }, [user, toast]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (
        error?.code !== "auth/popup-closed-by-user" &&
        error?.code !== "auth/cancelled-popup-request"
      ) {
        console.error("Error signing in with Google: ", error);
        toast({
          title: "Sign in failed",
          description: "Could not complete sign in. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // Keyboard shortcut: / or Cmd+K / Ctrl+K focuses the search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" && (e.target as HTMLElement)?.tagName !== "INPUT" && (e.target as HTMLElement)?.tagName !== "TEXTAREA") ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter and search logic
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      // Search matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = book.title?.toLowerCase().includes(q);
        const matchAuthor = book.authors?.toLowerCase().includes(q);
        if (!matchTitle && !matchAuthor) return false;
      }

      // Status / Category filtering
      const prog = book.progress ?? 0;
      if (filter === "reading") {
        return prog > 0 && prog < 100;
      }
      if (filter === "completed") {
        return prog >= 100;
      }
      if (filter === "unread") {
        return prog === 0;
      }
      if (filter === "gutenberg") {
        return book.source === "gutendex";
      }

      return true;
    });
  }, [books, searchQuery, filter]);

  // Reader navigation
  const openInReader = (book: LibraryBook & { progress?: number }) => {
    const cleanId = String(book.id).replace(/^gutendex-/, "");
    const params = new URLSearchParams();
    params.set("source", book.source || "gutendex");
    params.set("id", cleanId);
    params.set("title", book.title || "");
    params.set("authors", book.authors || "");
    if (book.formats) {
      params.set("formats", JSON.stringify(book.formats));
    }
    params.set("direct", "true");
    const targetUrl = `/read?${params.toString()}`;
    try {
      router.push(targetUrl);
    } catch {
      window.location.assign(targetUrl);
    }
  };

  // Remove book from library
  const handleRemoveBook = async (book: LibraryBook) => {
    try {
      if (user) {
        const bookUniqueId = book.id.startsWith(`${book.source}_`)
          ? book.id
          : generateBookId({ source: book.source, id: String(book.id) });
        await removeBookFromLibrary(user.uid, bookUniqueId);
      }
      setBooks((prev) => prev.filter((b) => b.id !== book.id));
      toast({
        title: "Removed from Library",
        description: `“${book.title}” has been removed from your shelf.`,
      });
    } catch (e) {
      console.error("Failed to remove book:", e);
      toast({
        title: "Could not remove book",
        variant: "destructive",
      });
    }
  };

  // Share book
  const handleShareBook = (book: LibraryBook) => {
    const cleanId = String(book.id).replace(/^gutendex-/, "");
    const url = `${window.location.origin}/read?source=${book.source}&id=${cleanId}&title=${encodeURIComponent(book.title)}&authors=${encodeURIComponent(book.authors || "")}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link Copied",
        description: `Direct reader link for “${book.title}” copied to clipboard.`,
      });
    }).catch(() => {
      toast({
        title: "Link Copied",
        description: url,
      });
    });
  };

  const getCoverUrl = (book: LibraryBook) => {
    if (book.formats?.["image/jpeg"]) {
      return book.formats["image/jpeg"];
    }
    if (book.source === "gutendex" && book.id) {
      const cleanId = String(book.id).replace(/^gutendex-/, "");
      return `https://www.gutenberg.org/cache/epub/${cleanId}/pg${cleanId}.cover.medium.jpg`;
    }
    return "";
  };

  const filterLabels: Record<FilterType, string> = {
    all: "All Books",
    reading: "Currently Reading",
    completed: "Completed",
    unread: "Unread",
    gutenberg: "Project Gutenberg",
  };

  return (
    <div className="motion-bookshelf-shell min-h-screen pb-20 select-none">
      {/* Directional Sunlight & Dappled Window Foliage Shadow */}
      <div className="motion-bookshelf-sunlight" aria-hidden="true" />

      {/* TOP TOOLBAR */}
      <header className="relative z-20 px-6 sm:px-10 lg:px-14 pt-7 pb-8 max-w-[1680px] mx-auto">
        <div className="flex items-center justify-between gap-4 md:gap-8">
          
          {/* LEFT: Wordmark */}
          <div className="shrink-0">
            <Link
              href="/"
              className="text-2xl sm:text-3xl italic tracking-tighter text-[#161413] hover:opacity-85 transition-opacity"
              style={{ fontFamily: "var(--font-motion), Georgia, serif" }}
              aria-label="PAGE.OS Home"
            >
              P/OS
            </Link>
          </div>

          {/* CENTER: Wide Pill Search Bar */}
          <div className="flex-1 max-w-xl mx-auto">
            <div className="motion-pill-search relative flex items-center h-10 sm:h-11 px-4 rounded-full">
              <Search className="w-4 h-4 text-[#8a8378] shrink-0 mr-3" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your books..."
                className="w-full bg-transparent border-0 outline-none text-[13px] sm:text-sm !text-[#181614] placeholder:!text-[#8a8378]/80 font-sans"
              />
              <span className="hidden sm:inline-flex items-center justify-center text-[10px] text-[#8a8378] tracking-widest border border-[#302a24]/10 rounded px-1.5 py-0.5 ml-2 font-mono">
                /K
              </span>
            </div>
          </div>

          {/* RIGHT: Controls (All Books dropdown + Grid & List View Toggles) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {!user ? (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="motion-toolbar-btn flex items-center gap-2 h-9 sm:h-10 px-4 rounded-full text-xs font-sans font-medium text-[#181614] hover:bg-black/5"
              >
                {isSigningIn ? (
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin text-[#8a8378]" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-[#8a8378]" />
                )}
                <span>{isSigningIn ? "Signing In..." : "Sign In"}</span>
              </button>
            ) : (
              <>
                {/* Filter Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="motion-toolbar-btn flex items-center gap-2 h-9 sm:h-10 px-3.5 sm:px-4 rounded-full text-xs font-sans font-medium text-[#181614]"
                    >
                      <span>{filterLabels[filter]}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-[#8a8378]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-[#f7f2ea]/95 backdrop-blur-md border border-[#3a3028]/12 text-[#181614] rounded-xl p-1.5 shadow-xl">
                    <DropdownMenuItem
                      onClick={() => setFilter("all")}
                      className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg cursor-pointer ${filter === "all" ? "bg-black/5 font-semibold" : "hover:bg-black/5"}`}
                    >
                      All Books
                      {filter === "all" && <Check className="w-3.5 h-3.5 text-[#181614]" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setFilter("reading")}
                      className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg cursor-pointer ${filter === "reading" ? "bg-black/5 font-semibold" : "hover:bg-black/5"}`}
                    >
                      Currently Reading
                      {filter === "reading" && <Check className="w-3.5 h-3.5 text-[#181614]" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setFilter("completed")}
                      className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg cursor-pointer ${filter === "completed" ? "bg-black/5 font-semibold" : "hover:bg-black/5"}`}
                    >
                      Completed
                      {filter === "completed" && <Check className="w-3.5 h-3.5 text-[#181614]" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setFilter("unread")}
                      className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg cursor-pointer ${filter === "unread" ? "bg-black/5 font-semibold" : "hover:bg-black/5"}`}
                    >
                      Unread
                      {filter === "unread" && <Check className="w-3.5 h-3.5 text-[#181614]" />}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-black/10 my-1" />
                    <DropdownMenuItem
                      onClick={() => setFilter("gutenberg")}
                      className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg cursor-pointer ${filter === "gutenberg" ? "bg-black/5 font-semibold" : "hover:bg-black/5"}`}
                    >
                      Project Gutenberg
                      {filter === "gutenberg" && <Check className="w-3.5 h-3.5 text-[#181614]" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Grid View Toggle */}
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`motion-toolbar-btn flex items-center justify-center w-9 sm:w-10 h-9 sm:h-10 rounded-lg ${viewMode === "grid" ? "active text-[#161413]" : "text-[#8a8378]"}`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>

                {/* List View Toggle */}
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`motion-toolbar-btn flex items-center justify-center w-9 sm:w-10 h-9 sm:h-10 rounded-lg ${viewMode === "list" ? "active text-[#161413]" : "text-[#8a8378]"}`}
                  aria-label="List view"
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT COMPOSITION */}
      <main className="relative z-10 px-6 sm:px-10 lg:px-14 max-w-[1680px] mx-auto mt-2">
        <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-10">
          
          {/* LEFT NARROW INTRO COLUMN */}
          <div className="w-full lg:w-48 xl:w-56 shrink-0 pt-1 lg:pt-2">
            <p className="text-[11px] font-sans font-semibold tracking-[0.24em] text-[#8a8378] uppercase mb-3">
              LIBRARY
            </p>
            <h1
              className="text-4xl sm:text-5xl xl:text-[3.5rem] font-normal tracking-tight text-[#141211] leading-[0.95] mb-4"
              style={{ fontFamily: "var(--font-motion), Georgia, serif" }}
            >
              <span>Your</span>
              <br />
              <span>Books.</span>
            </h1>
            <p className="text-[12.5px] sm:text-[13px] text-[#787166] leading-relaxed max-w-[200px] font-sans">
              “All the places you&apos;ve been, in one place.”
            </p>
          </div>

          {/* RIGHT BOOKSHELF OR LOGIN PROMPT */}
          <div className="flex-1 w-full min-w-0">
            {!user ? (
              <div className="max-w-xl py-6 sm:py-10">
                <div className="rounded-2xl border border-[#3a3028]/15 bg-[#f8f4ee]/85 backdrop-blur-md p-7 sm:p-10 shadow-sm text-center sm:text-left">
                  <div className="w-12 h-12 rounded-xl bg-[#2a2420] text-[#f4eee6] flex items-center justify-center mx-auto sm:mx-0 mb-5 shadow-sm">
                    <BookOpen className="w-6 h-6" />
                  </div>

                  <h2
                    className="text-2xl sm:text-3xl font-normal text-[#161413] tracking-tight mb-2.5"
                    style={{ fontFamily: "var(--font-motion), Georgia, serif" }}
                  >
                    Sign in to save your readings
                  </h2>

                  <p className="text-xs sm:text-sm text-[#787166] font-sans leading-relaxed mb-6">
                    Your library is your personal archive. Sign in to save books to your shelf, track your reading progress, and sync across all your devices.
                  </p>

                  <div className="space-y-2.5 mb-8 font-sans text-xs text-[#5c544a]">
                    <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3a3028]" />
                      <span>Save books from our open public domain catalog</span>
                    </div>
                    <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3a3028]" />
                      <span>Resume reading exactly where you left off</span>
                    </div>
                    <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3a3028]" />
                      <span>Keep your personal library synced in the cloud</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                      type="button"
                      disabled={isSigningIn}
                      onClick={handleSignIn}
                      className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-full bg-[#181614] text-[#f8f4ee] font-sans text-xs font-medium hover:bg-black/80 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isSigningIn ? (
                        <>
                          <LoaderCircle className="w-4 h-4 animate-spin" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.2 9 5 12 5z"/>
                            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                            <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"/>
                            <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.2-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
                          </svg>
                          <span>Sign in with Google</span>
                        </>
                      )}
                    </button>

                    <Link
                      href="/"
                      className="flex items-center justify-center px-5 py-3 rounded-full border border-[#3a3028]/20 text-[#181614] font-sans text-xs font-medium hover:bg-black/5 transition-colors text-center"
                    >
                      Browse Open Library
                    </Link>
                  </div>
                </div>
              </div>
            ) : isLoading ? (
              /* LOADING SKELETON */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 lg:gap-x-6 gap-y-9 sm:gap-y-11">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[2/3] w-full rounded-[3.5px] bg-[#3a3028]/10" />
                    <div className="mt-2.5 h-3.5 w-3/4 rounded bg-[#3a3028]/10" />
                    <div className="mt-1 h-2.5 w-1/2 rounded bg-[#3a3028]/10" />
                  </div>
                ))}
              </div>
            ) : books.length === 0 ? (
              /* EMPTY LIBRARY FOR LOGGED-IN USER */
              <div className="max-w-xl py-6 sm:py-10">
                <div className="rounded-2xl border border-[#3a3028]/15 bg-[#f8f4ee]/85 backdrop-blur-md p-7 sm:p-10 shadow-sm text-center sm:text-left">
                  <div className="w-12 h-12 rounded-xl bg-[#2a2420] text-[#f4eee6] flex items-center justify-center mx-auto sm:mx-0 mb-5 shadow-sm">
                    <BookOpen className="w-6 h-6" />
                  </div>

                  <h2
                    className="text-2xl sm:text-3xl font-normal text-[#161413] tracking-tight mb-2.5"
                    style={{ fontFamily: "var(--font-motion), Georgia, serif" }}
                  >
                    Your shelf is empty
                  </h2>

                  <p className="text-xs sm:text-sm text-[#787166] font-sans leading-relaxed mb-6">
                    You haven&apos;t saved any books yet. As you read books from our open collection, click the bookmark icon or begin reading to have them saved to your personal shelf.
                  </p>

                  <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#181614] text-[#f8f4ee] font-sans text-xs font-medium hover:bg-black/80 transition-colors shadow-sm"
                  >
                    <span>Discover Books to Read</span>
                  </Link>
                </div>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <p className="text-base text-[#787166] font-sans">
                  No books found matching “{searchQuery}”.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setFilter("all");
                  }}
                  className="mt-4 px-4 py-2 rounded-full border border-black/15 text-xs text-[#161413] hover:bg-black/5 font-sans"
                >
                  Clear search & filters
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* GRID VIEW: 6 columns on wide desktop */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 lg:gap-x-6 gap-y-9 sm:gap-y-11">
                {filteredBooks.map((book) => {
                  const coverUrl = getCoverUrl(book);
                  const progressValue = book.progress ?? 0;

                  return (
                    <div key={`${book.source}-${book.id}`} className="motion-book-wrapper group">
                      {/* Cover Container */}
                      <div className="motion-book-cover-container relative">
                        {/* 3-Dot Contextual Action Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="motion-book-action-btn"
                              aria-label={`Actions for ${book.title}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-[#f8f4ee]/95 backdrop-blur-md border border-[#3a3028]/12 text-[#181614] rounded-xl p-1.5 shadow-xl">
                            <DropdownMenuItem
                              onClick={() => openInReader(book)}
                              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg cursor-pointer hover:bg-black/5"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-[#181614]" />
                              <span>{progressValue > 0 ? "Continue Reading" : "Start Reading"}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => showBriefing(book as SearchResult)}
                              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg cursor-pointer hover:bg-black/5"
                            >
                              <Info className="w-3.5 h-3.5 text-[#181614]" />
                              <span>View Synopsis</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleShareBook(book)}
                              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg cursor-pointer hover:bg-black/5"
                            >
                              <Share2 className="w-3.5 h-3.5 text-[#181614]" />
                              <span>Share Book Link</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-black/10 my-1" />
                            <DropdownMenuItem
                              onClick={() => handleRemoveBook(book)}
                              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg cursor-pointer text-red-600 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove from Shelf</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Interactive Click to Reader */}
                        <div
                          className="w-full h-full cursor-pointer"
                          onClick={() => openInReader(book)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openInReader(book);
                            }
                          }}
                        >
                          {coverUrl ? (
                            <Image
                              src={coverUrl}
                              alt={book.title}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                              className="object-cover"
                              loading="lazy"
                            />
                          ) : (
                            /* Typographic Fallback Cover */
                            <div className="w-full h-full p-4 flex flex-col justify-between bg-[#2a2420] text-[#f4eee6]">
                              <div className="border border-[#f4eee6]/20 p-2.5 h-full flex flex-col justify-between">
                                <p
                                  className="text-xs uppercase tracking-widest text-[#f4eee6]/80 text-center mt-2 line-clamp-3"
                                  style={{ fontFamily: "var(--font-motion), serif" }}
                                >
                                  {book.title}
                                </p>
                                <p className="text-[10px] text-[#f4eee6]/60 text-center font-sans">
                                  {book.authors || "Classic"}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Metadata underneath cover */}
                      <div className="mt-2.5">
                        {/* Title */}
                        <h3
                          onClick={() => openInReader(book)}
                          className="font-sans font-medium text-[13px] text-[#1a1816] truncate cursor-pointer hover:opacity-75 transition-opacity"
                          title={book.title}
                        >
                          {book.title}
                        </h3>

                        {/* Author */}
                        <p className="font-sans text-[11px] text-[#867f74] truncate mt-0.5">
                          {book.authors || "Unknown"}
                        </p>

                        {/* Reading Progress Track & Percentage */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="motion-progress-track">
                            <div
                              className="motion-progress-fill"
                              style={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }}
                            />
                          </div>
                          <span className="text-[10.5px] font-sans font-medium text-[#867f74] shrink-0 min-w-[26px] text-right">
                            {Math.round(progressValue)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* LIST VIEW: Minimal editorial rows */
              <div className="divide-y divide-black/8 border-t border-b border-black/8">
                {filteredBooks.map((book) => {
                  const coverUrl = getCoverUrl(book);
                  const progressValue = book.progress ?? 0;

                  return (
                    <div
                      key={`list-${book.source}-${book.id}`}
                      className="py-3.5 flex items-center justify-between gap-4 hover:bg-black/[0.02] px-2 rounded-lg transition-colors cursor-pointer"
                      onClick={() => openInReader(book)}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Cover thumbnail */}
                        <div className="relative w-10 h-14 shrink-0 rounded-[2.5px] overflow-hidden bg-[#2b2623] shadow-sm">
                          {coverUrl ? (
                            <Image src={coverUrl} alt={book.title} fill className="object-cover" sizes="40px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-white/70 bg-[#2a2420]">
                              Book
                            </div>
                          )}
                        </div>

                        {/* Title and Author */}
                        <div className="min-w-0">
                          <h3 className="font-sans font-medium text-sm text-[#181614] truncate">
                            {book.title}
                          </h3>
                          <p className="font-sans text-xs text-[#8a8378] truncate">
                            {book.authors || "Unknown author"}
                          </p>
                        </div>
                      </div>

                      {/* Progress and Actions */}
                      <div className="flex items-center gap-6 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <div className="hidden sm:flex items-center gap-3 w-40">
                          <div className="motion-progress-track">
                            <div
                              className="motion-progress-fill"
                              style={{ width: `${Math.min(100, Math.max(0, progressValue))}%` }}
                            />
                          </div>
                          <span className="text-xs text-[#8a8378] font-sans font-medium w-8 text-right">
                            {Math.round(progressValue)}%
                          </span>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="p-1.5 rounded-md hover:bg-black/5 text-[#8a8378] hover:text-[#181614]"
                              aria-label="Actions"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-[#f8f4ee]/95 backdrop-blur-md border border-[#3a3028]/12 text-[#181614] rounded-xl p-1.5 shadow-xl">
                            <DropdownMenuItem
                              onClick={() => openInReader(book)}
                              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg cursor-pointer hover:bg-black/5"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Open in Reader</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => showBriefing(book as SearchResult)}
                              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg cursor-pointer hover:bg-black/5"
                            >
                              <Info className="w-3.5 h-3.5" />
                              <span>View Synopsis</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleShareBook(book)}
                              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg cursor-pointer hover:bg-black/5"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Share Link</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-black/10 my-1" />
                            <DropdownMenuItem
                              onClick={() => handleRemoveBook(book)}
                              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg cursor-pointer text-red-600 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove from Shelf</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
