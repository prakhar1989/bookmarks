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
    <div className="space-y-6 animate-fade-in-up">
      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground transition-all duration-300 group-focus-within:text-primary group-focus-within:scale-110" />
        <Input
          type="text"
          placeholder="Search bookmarks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-14 text-base glass transition-all duration-300 focus:scale-[1.02] focus:shadow-xl"
        />
      </div>

      {/* Tag Filter */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setSelectedTag("")}
            className={`px-4 py-2 text-sm font-mono font-semibold rounded-lg transition-all duration-300 hover:scale-105 ${
              selectedTag === ""
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
            }`}
          >
            All Tags
          </button>
          {tags.slice(0, 20).map((tag, index) => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(tag.name)}
              className={`px-4 py-2 text-sm font-mono font-semibold rounded-lg hover:scale-105 ${
                selectedTag === tag.name
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
              }`}
              style={{ animationDelay: `${0.1 + index * 0.05}s` }}
            >
              {tag.name}{" "}
              <span className="opacity-70">({tag.bookmarkCount})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
