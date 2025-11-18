"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { BookmarkCard } from "@/components/bookmarks/bookmark-card";
import { Button } from "@/components/ui/button";

interface Tag {
  id: string;
  name: string;
}

interface Bookmark {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  summaryShort: string | null;
  status: "pending" | "processed" | "failed";
  createdAt: string;
  tags: Tag[];
  faviconUrl?: string | null;
}

interface BookmarksListResponse {
  bookmarks: Bookmark[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface BookmarksListProps {
  endpoint?: string;
  readOnly?: boolean;
}

export function BookmarksList({
  endpoint = "/api/bookmarks",
  readOnly = false,
}: BookmarksListProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<BookmarksListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        const q = searchParams.get("q");
        const tag = searchParams.get("tag");
        const page = searchParams.get("page") || "1";

        if (q) params.set("q", q);
        if (tag) params.set("tag", tag);
        params.set("page", page);
        params.set("pageSize", "10");

        // Handle dynamic endpoint that might already have params or path params
        const separator = endpoint.includes("?") ? "&" : "?";
        const response = await fetch(
          `${endpoint}${separator}${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch bookmarks");
        }

        const result: BookmarksListResponse = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarks();
  }, [searchParams, endpoint]);

  const handleDelete = async (id: string) => {
    if (readOnly) return;

    try {
      const response = await fetch(`/api/bookmarks/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete bookmark");
      }

      // Optimistically update UI by removing the bookmark
      setData((prevData) => {
        if (!prevData) return null;
        return {
          ...prevData,
          bookmarks: prevData.bookmarks.filter((b) => b.id !== id),
          total: prevData.total - 1,
        };
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete bookmark",
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-700 dark:text-red-300">Error: {error}</p>
      </div>
    );
  }

  if (!data || data.bookmarks.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-400">No bookmarks yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.bookmarks.map((bookmark) => (
        <BookmarkCard
          key={bookmark.id}
          {...bookmark}
          onDelete={readOnly ? undefined : handleDelete}
          readOnly={readOnly}
        />
      ))}

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            disabled={data.page === 1}
            className="px-4 py-2 text-white rounded-md disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(data.page - 1));
              router.push(`${pathname}?${params.toString()}`);
            }}
          >
            Previous
          </Button>
          <span className="px-4 py-2">
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            disabled={data.page === data.totalPages}
            className="px-4 py-2 text-white rounded-md disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("page", String(data.page + 1));
              router.push(`${pathname}?${params.toString()}`);
            }}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
