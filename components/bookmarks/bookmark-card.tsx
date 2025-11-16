"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Favicon } from "./favicon";
import {
  ExternalLink,
  AlertCircle,
  Clock,
  CheckCircle,
  Trash2,
  Share2,
  Check,
} from "lucide-react";

interface Tag {
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
  tags: Tag[];
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
}: BookmarkCardProps) {
  const [copied, setCopied] = useState(false);
  const displayTitle = title || url;
  const displayUrl = new URL(url).hostname.replace("www.", "");

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
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Favicon */}
        <div className="flex-shrink-0 mt-1">
          {faviconUrl ? (
            <Favicon src={faviconUrl} className="w-5 h-5" />
          ) : (
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-sm" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <Link
            href={`/b/${id}`}
            className="font-semibold text-lg hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2"
          >
            {displayTitle}
          </Link>

          {/* URL */}
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
            <span className="truncate">{displayUrl}</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 hover:text-blue-600 dark:hover:text-blue-400"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Description or Summary */}
          {(description || summaryShort) && (
            <p className="mt-2 text-gray-700 dark:text-gray-300 line-clamp-2">
              {description || summaryShort}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 rounded-md"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Status and Date */}
          <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {status === "processed" && (
                  <>
                    <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                    <span className="text-green-600 dark:text-green-400">
                      Processed
                    </span>
                  </>
                )}
                {status === "pending" && (
                  <>
                    <Clock className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-yellow-600 dark:text-yellow-400">
                      Processing...
                    </span>
                  </>
                )}
                {status === "failed" && (
                  <>
                    <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                    <span className="text-red-600 dark:text-red-400">
                      Failed
                    </span>
                  </>
                )}
              </div>
              <span>
                {new Date(createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            {/* Share and Delete buttons */}
            <div className="flex items-center gap-1">
              {/* Share button */}
              <button
                onClick={handleShare}
                className="p-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors group"
                aria-label="Share bookmark"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <Share2 className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-orange-600 dark:group-hover:text-orange-400" />
                )}
              </button>

              {/* Delete button */}
              {onDelete && (
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
                  className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors group"
                  aria-label="Delete bookmark"
                >
                  <Trash2 className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-red-600 dark:group-hover:text-red-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
