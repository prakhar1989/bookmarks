"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface ReprocessButtonProps {
  bookmarkId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function ReprocessButton({
  bookmarkId,
  variant = "outline",
  size = "sm",
  className,
}: ReprocessButtonProps) {
  const router = useRouter();
  const [isReprocessing, setIsReprocessing] = useState(false);

  const handleReprocess = async () => {
    if (
      !confirm(
        "This will regenerate the AI summary and metadata. Continue?",
      )
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
    }
  };

  return (
    <Button
      onClick={handleReprocess}
      disabled={isReprocessing}
      variant={variant}
      size={size}
      className={className}
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${isReprocessing ? "animate-spin" : ""}`} />
      {isReprocessing ? "Reprocessing..." : "Reprocess with AI"}
    </Button>
  );
}
