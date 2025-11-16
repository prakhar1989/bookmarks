"use client";

import Link from "next/link";
import Image from "next/image";
import { useStackApp, useUser } from "@stackframe/stack";
import { Button } from "@/components/ui/button";

export function Header() {
  const user = useUser();
  const app = useStackApp();

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Image
            src="/stashly-icon.svg"
            alt="Stashly"
            width={40}
            height={40}
            className="h-10 w-10"
          />
          <div>
            <div className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
              Stashly
            </div>
            <p className="text-lg font-semibold text-foreground">
              AI-Powered Bookmarking
            </p>
          </div>
        </div>
        {user ? (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Signed in as
              </p>
              <p className="text-sm font-medium text-foreground">
                {user.primaryEmail}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={app.urls.signOut}>Sign Out</Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href={app.urls.signIn}>Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={app.urls.signUp}>Get Started</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
