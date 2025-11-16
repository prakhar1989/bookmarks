"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  bookmarkCount: number;
}

interface SearchFilterProps {
  tags: Tag[];
}

export function SearchFilter({ tags }: SearchFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedTag, setSelectedTag] = useState(searchParams.get("tag") || "");

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (searchQuery) {
        params.set("q", searchQuery);
      } else {
        params.delete("q");
      }

      if (selectedTag) {
        params.set("tag", selectedTag);
      } else {
        params.delete("tag");
      }

      router.push(`/?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedTag, router, searchParams]);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search bookmarks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tag Filter */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag("")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              selectedTag === ""
                ? "bg-primary text-primary-foreground"
                : "bg-orange-100 text-orange-700 hover:bg-orange-200"
            }`}
          >
            All Tags
          </button>
          {tags.slice(0, 20).map((tag) => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(tag.name)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedTag === tag.name
                  ? "bg-primary text-primary-foreground"
                  : "bg-orange-100 text-orange-700 hover:bg-orange-200"
              }`}
            >
              {tag.name} ({tag.bookmarkCount})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
