"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Favicon } from "./favicon";
import {
  ExternalLink,
  AlertCircle,
  Clock,
  CheckCircle,
  Trash2,
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
  const displayTitle = title || url;
  const displayUrl = new URL(url).hostname.replace("www.", "");

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Favicon */}
        <div className="flex-shrink-0 mt-1">
          {faviconUrl ? (
            <Favicon src={faviconUrl} className="w-5 h-5" />
          ) : (
            <div className="w-5 h-5 bg-gray-200 rounded-sm" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <Link
            href={`/b/${id}`}
            className="font-semibold text-lg hover:text-blue-600 transition-colors line-clamp-2"
          >
            {displayTitle}
          </Link>

          {/* URL */}
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <span className="truncate">{displayUrl}</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 hover:text-blue-600"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Description or Summary */}
          {(description || summaryShort) && (
            <p className="mt-2 text-gray-700 line-clamp-2">
              {description || summaryShort}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Status and Date */}
          <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {status === "processed" && (
                  <>
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span className="text-green-600">Processed</span>
                  </>
                )}
                {status === "pending" && (
                  <>
                    <Clock className="w-3 h-3 text-yellow-600" />
                    <span className="text-yellow-600">Processing...</span>
                  </>
                )}
                {status === "failed" && (
                  <>
                    <AlertCircle className="w-3 h-3 text-red-600" />
                    <span className="text-red-600">Failed</span>
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
                className="p-1 hover:bg-red-50 rounded transition-colors group"
                aria-label="Delete bookmark"
              >
                <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
