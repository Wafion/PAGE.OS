"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/theme-provider";
import { cn } from "@/lib/utils";

type ThemeToggleButtonProps = {
  className?: string;
  compact?: boolean;
};

export function ThemeToggleButton({
  className,
  compact = false,
}: ThemeToggleButtonProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon" : "sm"}
      className={cn(
        compact ? "h-9 w-9 rounded-full" : "h-8 gap-2 rounded-full px-3 text-xs",
        className,
      )}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!compact && <span>{isDark ? "Light" : "Dark"}</span>}
    </Button>
  );
}
