"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Link,
  RefreshCw,
  Trash2,
  Copy,
  Check,
} from "lucide-react";

interface BookmarkActionsMenuProps {
  bookmarkId: string;
  bookmarkUrl: string;
}

export function BookmarkActionsMenu({
  bookmarkId,
  bookmarkUrl,
}: BookmarkActionsMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Handle copying link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/b/${bookmarkId}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  // Handle reprocessing
  const handleReprocess = async () => {
    if (
      !confirm("This will regenerate the AI summary and metadata. Continue?")
    ) {
      return;
    }

    setIsReprocessing(true);

    try {
      const response = await fetch(`/api/bookmarks/${bookmarkId}/reprocess`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to reprocess bookmark");
      }

      router.refresh();
    } catch (error) {
      console.error("Error reprocessing bookmark:", error);
      alert("Failed to reprocess bookmark. Please try again.");
    } finally {
      setIsReprocessing(false);
      setIsOpen(false);
    }
  };

  // Handle deletion
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this bookmark?")) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete bookmark");
      }

      // Redirect to home page after successful deletion
      router.push("/");
    } catch (error) {
      console.error("Error deleting bookmark:", error);
      alert("Failed to delete bookmark. Please try again.");
      setIsDeleting(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDeleting || isReprocessing}
        className="gap-2"
      >
        <MoreVertical className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={handleCopyLink}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Link className="w-4 h-4" />
              )}
              <span>{copied ? "Copied!" : "Copy share link"}</span>
            </button>

            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

            <button
              onClick={handleReprocess}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
              disabled={isReprocessing}
            >
              <RefreshCw
                className={`w-4 h-4 ${isReprocessing ? "animate-spin" : ""}`}
              />
              <span>
                {isReprocessing ? "Reprocessing..." : "Summarize with AI"}
              </span>
            </button>

            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 hover:text-red-700 flex items-center gap-3"
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? "Deleting..." : "Delete"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
