"use client";

import Link from "next/link";
import Image from "next/image";
import { useStackApp, useUser } from "@stackframe/stack";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  const user = useUser();
  const app = useStackApp();

  return (
    <header className="sticky top-0 z-20 border-b glass backdrop-blur-xl py-4 transition-all duration-300 hover:shadow-lg">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-4 animate-fade-in-up">
          <Image
            src="/stashly-icon.svg"
            alt="Stashly"
            width={48}
            height={48}
            className="h-12 w-12 transition-transform duration-300 hover:scale-110"
          />
          <div>
            <div className="text-lg font-black uppercase tracking-[0.25em] text-primary font-mono">
              Stashly
            </div>
          </div>
        </div>
        {user ? (
          <div className="flex items-center gap-5 animate-fade-in-up stagger-1">
            <div className="text-right hidden sm:block">
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-mono font-light">
                Signed in as
              </p>
              <p className="text-sm font-semibold text-foreground">
                {user.displayName ?? user.primaryEmail ?? "you"}
              </p>
            </div>
            <ThemeToggle />
            <Button
              asChild
              size="sm"
              variant="outline"
              className="transition-all duration-300 hover:scale-105 hover:shadow-md"
            >
              <Link href={app.urls.signOut}>Sign Out</Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 animate-fade-in-up stagger-1">
            <ThemeToggle />
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="transition-all duration-300 hover:scale-105"
            >
              <Link href={app.urls.signIn}>Sign In</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <Link href={app.urls.signUp}>Get Started</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
