"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { useAuth } from "@/context/auth-provider";
import { auth } from "@/lib/firebase";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  PanelLeft,
  Home,
  Library,
  Settings,
  User,
  Power,
  LogIn,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/", label: "System Feed", icon: Home },
  { href: "/library", label: "Archive", icon: Library },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/legal", label: "Legal", icon: Shield },
];

export function SidebarPopup() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <div className="fixed top-4 left-4 z-50">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-sm border border-dashed",
              "text-accent bg-white/70 border-border",
              "dark:bg-black/40 dark:text-terminal dark:border-terminal-border",
              "transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            )}
          >
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Open Navigation</span>
          </Button>
        </SheetTrigger>

        <SheetContent
          side="left"
          className={cn(
            "w-[260px] sm:w-[300px] shadow-xl border-r font-mono text-sm p-4",
            "bg-white text-black border-border",
            "dark:bg-terminal dark:text-terminal-foreground dark:border-terminal-border"
          )}
        >
          {/* Header */}
          <div className="border-b pb-4 mb-4">
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="font-headline text-2xl text-terminal-accent"
                onClick={() => setOpen(false)}
              >
                PageOS
              </Link>
              <span className="text-xs text-muted-foreground">v1.0</span>
            </div>
          </div>

          {/* Menu */}
          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2",
                    isActive
                      ? "bg-terminal-accent/10 text-terminal-accent font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t pt-4 mt-4">
            {user ? (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => {
                  handleSignOut();
                  setOpen(false);
                }}
              >
                <Power className="h-4 w-4 text-destructive" />
                <span>Logout</span>
              </Button>
            ) : (
              <Button variant="ghost" asChild className="w-full justify-start gap-2">
                <Link href="/profile" onClick={() => setOpen(false)}>
                  <LogIn className="h-4 w-4 text-terminal-accent" />
                  <span>Login</span>
                </Link>
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
