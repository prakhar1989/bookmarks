"use client";

import Link from "next/link";
import { Header } from "app/header";
import { useUser, useStackApp } from "@stackframe/stack";
import { Button } from "@/components/ui/button";
import { BookmarksPage } from "./bookmarks-page";

export default function Home() {
  const user = useUser();
  const app = useStackApp();

  let content = null;
  if (user) {
    content = <BookmarksPage />;
  } else {
    content = (
      <main className="mx-auto w-full flex-1 max-w-4xl px-4 py-24">
        <div className="glass rounded-3xl px-12 py-20 text-center shadow-2xl shadow-primary/10 animate-scale-in">
          <p className="text-sm uppercase tracking-[0.35em] text-muted-foreground font-mono font-light animate-fade-in-up">
            Welcome
          </p>
          <h1 className="mt-6 text-4xl font-black text-foreground leading-tight animate-fade-in-up stagger-1">
            Sign in to start organizing your bookmarks.
          </h1>
          <p className="my-8 text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto animate-fade-in-up stagger-2">
            Save links, automatically extract content, and search with
            AI-powered summaries and tags.
          </p>
          <Button
            asChild
            size="lg"
            className="transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <Link href={app.urls.signUp}>Get Started</Link>
          </Button>
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
