"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Tag } from "@/components/bookmarks/tag";

interface TagData {
  id: string;
  name: string;
  bookmarkCount: number;
}

interface SearchFilterProps {
  tags: TagData[];
}

const MAX_TAGS_TO_SHOW = 10;

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

  const clearSearch = () => {
    setSearchQuery("");
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground transition-all duration-300 group-focus-within:text-primary group-focus-within:scale-110" />
        <Input
          type="text"
          placeholder="Search... (github.com, agents, etc.)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-8 h-14 text-base transition-all duration-300 focus:scale-[1.02] focus:shadow-xl"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-all duration-200 group-focus-within:scale-110"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
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
          {tags.slice(0, MAX_TAGS_TO_SHOW).map((tag, index) => (
            <Tag
              key={tag.id}
              name={tag.name}
              count={tag.bookmarkCount}
              onClick={() => setSelectedTag(tag.name)}
              isSelected={selectedTag === tag.name}
              animationDelay={`${0.1 + index * 0.05}s`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
