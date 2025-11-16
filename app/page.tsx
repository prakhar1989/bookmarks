"use client";

import { Header } from "app/header";
import { useUser } from "@stackframe/stack";
import { BookmarksPage } from "./bookmarks-page";

export default function Home() {
  const user = useUser();

  let content = null;
  if (user) {
    content = <BookmarksPage />;
  } else {
    content = (
      <main className="mx-auto w-full flex-1 max-w-3xl px-4 py-16">
        <div className="rounded-3xl border border-dashed border-border/80 bg-background/80 px-8 py-12 text-center shadow-sm shadow-black/5">
          <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">
            Welcome
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">
            Sign in to start organizing your bookmarks.
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Save links, automatically
            extract content, and search with AI-powered summaries and tags.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      {content}
    </div>
  );
}
