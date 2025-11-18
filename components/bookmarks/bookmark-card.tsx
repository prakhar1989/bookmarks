"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Favicon } from "./favicon";
import { Tag } from "./tag";
import {
  ExternalLink,
  AlertCircle,
  Clock,
  CheckCircle,
  Trash2,
  Share2,
  Check,
} from "lucide-react";

interface TagData {
  id: string;
  name: string;
}

interface BookmarkCardProps {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  summaryShort: string | null;
  status: "pending" | "processed" | "failed";
  createdAt: Date | string;
  tags: TagData[];
  faviconUrl?: string | null;
  onDelete?: (id: string) => void;
}

export function BookmarkCard({
  id,
  url,
  title,
  description,
  summaryShort,
  status,
  createdAt,
  tags,
  faviconUrl,
  onDelete,
  readOnly = false,
}: BookmarkCardProps & { readOnly?: boolean }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const displayTitle = title || url;
  const displayUrl = new URL(url).hostname.replace("www.", "");

  const handleTagClick = (tagName: string) => {
    router.push(`/?tag=${encodeURIComponent(tagName)}`);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const bookmarkUrl = `${window.location.origin}/b/${id}`;

    try {
      await navigator.clipboard.writeText(bookmarkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  return (
    <Card className="p-6 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:scale-[1.02] hover:-translate-y-1 group animate-fade-in-up">
      <div className="flex items-start gap-4">
        {/* Favicon */}
        <div className="flex-shrink-0 mt-1.5 transition-transform duration-300 group-hover:scale-110">
          {faviconUrl ? (
            <Favicon src={faviconUrl} className="w-6 h-6" />
          ) : (
            <div className="w-6 h-6 bg-muted/50 rounded-md" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <Link
            href={`/b/${id}`}
            className="font-bold text-xl hover:text-primary transition-all duration-300 line-clamp-2 block"
          >
            {displayTitle}
          </Link>

          {/* URL */}
          <div className="flex items-center gap-2.5 mt-2 text-sm text-muted-foreground font-mono">
            <span className="truncate">{displayUrl}</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 hover:text-primary transition-all duration-300 hover:scale-125"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Description or Summary */}
          {(description || summaryShort) && (
            <p className="mt-3 text-base text-foreground/80 line-clamp-2 leading-relaxed">
              {description || summaryShort}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map((tag) => (
                <Tag
                  key={tag.id}
                  name={tag.name}
                  onClick={() => handleTagClick(tag.name)}
                />
              ))}
            </div>
          )}

          {/* Status and Date */}
          <div className="flex items-center justify-between mt-5 text-sm text-muted-foreground">
            <div className="flex items-center">
              <div className="flex items-center gap-1.5">
                {status === "pending" && (
                  <>
                    <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400 animate-pulse" />
                    <span className="text-yellow-600 dark:text-yellow-400 font-mono font-medium">
                      Processing...
                    </span>
                  </>
                )}
                {status === "failed" && (
                  <>
                    <AlertCircle className="w-4 h-4 text-destructive animate-pulse" />
                    <span className="text-destructive font-mono font-medium">
                      Failed
                    </span>
                  </>
                )}
              </div>
              <span className="font-mono font-light">
                {new Date(createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            {/* Share and Delete buttons */}
            <div className="flex items-center gap-2">
              {/* Share button */}
              <button
                onClick={handleShare}
                className="p-2 hover:bg-primary/10 rounded-lg transition-all duration-300 hover:scale-110 group/share"
                aria-label="Share bookmark"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <Share2 className="w-4 h-4 text-muted-foreground group-hover/share:text-primary transition-colors" />
                )}
              </button>

              {/* Delete button */}
              {!readOnly && onDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (
                      confirm("Are you sure you want to delete this bookmark?")
                    ) {
                      onDelete(id);
                    }
                  }}
                  className="p-2 hover:bg-destructive/10 rounded-lg transition-all duration-300 hover:scale-110 group/delete"
                  aria-label="Delete bookmark"
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground group-hover/delete:text-destructive transition-colors" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
