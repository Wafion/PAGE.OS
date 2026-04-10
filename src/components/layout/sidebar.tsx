"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Library,
  Settings,
  User,
  Power,
  LogIn,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/auth-provider";

const menuItems = [
  { href: "/", label: "System Feed", icon: Home },
  { href: "/library", label: "Archive", icon: Library },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/legal", label: "Legal", icon: Shield },
];

export function AppSidebar() {
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
    <div className="flex h-full flex-col font-mono text-sm text-terminal-foreground">
      {/* Header */}
      <div className="border-b border-terminal-border p-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-headline text-2xl text-terminal-accent glow">
            PageOS
          </Link>
          <span className="text-xs text-muted">v1.0</span>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 transition-all ${
                isActive
                  ? "bg-terminal-accent/10 text-terminal-accent font-medium"
                  : "hover:bg-terminal-border/10 hover:text-terminal-accent"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-terminal-border p-4">
        {user ? (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={handleSignOut}
          >
            <Power className="h-4 w-4 text-destructive" />
            <span>Logout</span>
          </Button>
        ) : (
          <Button variant="ghost" asChild className="w-full justify-start gap-2">
            <Link href="/profile">
              <LogIn className="h-4 w-4 text-terminal-accent" />
              <span>Login</span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
