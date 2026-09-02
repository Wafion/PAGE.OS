"use client";

import React from "react";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { LogIn, MonitorCog, Settings, User } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import { useReaderSettings } from "@/context/reader-settings-provider";
import { auth } from "@/lib/firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { AudioControls } from "@/components/audio/audio-controls";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { user } = useAuth();
  const { uiMode, setUiMode } = useReaderSettings();
  const [scrolled, setScrolled] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Collapse when user scrolls again
  React.useEffect(() => {
    if (!expanded) return;
    const onScroll = () => setExpanded(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [expanded]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const controls = (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-2 border-accent/40 text-xs text-accent hover:bg-accent/10 hover:text-accent"
        onClick={() => setUiMode(uiMode === "lounge" ? "classic" : "lounge")}
      >
        <MonitorCog className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{uiMode === "lounge" ? "Classic UI" : "Library Lounge"}</span>
        <span className="sm:hidden">UI</span>
      </Button>

      <AudioControls />

      <ThemeToggleButton className="border-accent/40 text-accent hover:bg-accent/10 hover:text-accent" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-accent/50">
            {user ? (
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                <AvatarFallback>
                  <User className="h-3.5 w-3.5 text-accent" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <User className="h-4 w-4 text-accent" />
            )}
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="border-border/50 bg-background">
          {user ? (
            <>
              <DropdownMenuLabel>{user.displayName || "Operator"}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:bg-destructive/20 focus:text-destructive"
              >
                Logout
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuLabel>Guest Operator</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  <span>Login / Register</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  // Collapsed floating pill when scrolled
  if (scrolled) {
    return (
      <div className="fixed top-3 right-4 z-50 md:right-6">
        <div
          className={cn(
            "flex items-center gap-2 rounded-full border border-border/50 bg-background/90 px-2 py-1.5 backdrop-blur-md shadow-lg transition-all duration-300",
            expanded ? "opacity-100" : "opacity-90"
          )}
        >
          {expanded ? (
            <>
              {controls}
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setExpanded(true)}
            >
              {user ? (
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                  <AvatarFallback>
                    <User className="h-3.5 w-3.5 text-accent" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Settings className="h-4 w-4 text-accent" />
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Full header at top — fixed above the viewport glass (z-16) with transparent bg
  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center gap-3 px-4 md:px-6" style={{ background: 'transparent' }}>
      <div className="flex-1" />
      {controls}
    </header>
  );
}
