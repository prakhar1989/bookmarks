"use client";

import { useEffect, useState, Suspense } from "react";
import { SearchFilter } from "@/components/bookmarks/search-filter";
import { BookmarksList } from "./bookmarks-list";
import { AddBookmarkForm } from "./add-bookmark";
import { AddBookmarkModal } from "./add-bookmark-modal";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Tag {
  id: string;
  name: string;
  bookmarkCount: number;
}

export function BookmarksPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch("/api/tags");
        if (response.ok) {
          const data = await response.json();
          setTags(data.tags);
        }
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      }
    };

    fetchTags();
  }, []);

  return (
    <>
      <main className="mx-auto w-full flex-1 max-w-6xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <SearchFilter tags={tags} />
            <Suspense
              fallback={
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-40 bg-gray-100 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              }
            >
              <BookmarksList />
            </Suspense>
          </div>
          <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
            <AddBookmarkForm />
          </div>
        </div>
      </main>

      {/* Mobile FAB - Only visible on small screens */}
      <div className="fixed bottom-6 right-6 z-50 lg:hidden">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform shadow-primary/20"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Mobile Modal */}
      <AddBookmarkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
