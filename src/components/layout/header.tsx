"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-provider";
import { signOut } from "firebase/auth";
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

import {
  User,
  LogIn,
} from "lucide-react";

export function AppHeader() {
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 px-4 backdrop-blur-sm md:px-6">
      {/* You can optionally place breadcrumbs or title here */}
      <div className="flex-1" />

      {/* 👤 User Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-accent/50">
            {user ? (
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                <AvatarFallback>
                  <User className="h-4 w-4 text-accent" />
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
    </header>
  );
}
