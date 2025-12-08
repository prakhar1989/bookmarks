"use client";
import { use } from "react";
import { Header } from "app/header";
import { BookmarksList } from "app/bookmarks-list";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = use(params);

  return (
    <div className="flex flex-1 flex-col">
      <Header />
      <main className="mx-auto w-full flex-1 max-w-6xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">@{username}</h1>
          <p className="text-muted-foreground">Public Bookmarks</p>
        </div>

        <BookmarksList
          endpoint={`/api/users/${username}/bookmarks`}
          readOnly={true}
        />
      </main>
    </div>
  );
}
