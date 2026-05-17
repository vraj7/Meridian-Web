"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { LogoMark, LogoWordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHydrated } from "@/hooks/use-hydrated";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";
import { useIndiaSettingsStore } from "@/stores/india-settings-store";
import { QuotePairToggle } from "@/components/layout/quote-pair-toggle";

export function Header() {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const cryptoDemo = useCryptoSettingsStore((s) => s.demoMode);
  const indiaDemo = useIndiaSettingsStore((s) => s.demoMode);
  const onIndia = pathname.startsWith("/india");
  const demoMode = onIndia ? indiaDemo : cryptoDemo;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-3 lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="h-6 w-6" />
            <LogoWordmark />
          </Link>
          {hydrated && demoMode ? (
            <Badge variant="outline" className="text-[10px] font-normal">
              Demo
            </Badge>
          ) : null}
        </div>
        <div className="hidden lg:block" aria-hidden />
        <div className="flex items-center gap-2">
          {!onIndia ? <QuotePairToggle /> : null}
          {hydrated && demoMode ? (
            <Badge variant="outline" className="hidden lg:inline-flex text-[10px] font-normal">
              Demo
            </Badge>
          ) : null}
          {hydrated ? (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-md"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          ) : (
            <div className="h-9 w-9 shrink-0" aria-hidden />
          )}
        </div>
      </div>
    </header>
  );
}
