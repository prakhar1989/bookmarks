"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Save, X } from "lucide-react";

interface EditSummaryProps {
  bookmarkId: string;
  initialSummary: string | null;
  type: "short" | "long";
  title: string;
}

export function EditSummary({
  bookmarkId,
  initialSummary,
  type,
  title,
}: EditSummaryProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [summary, setSummary] = useState(initialSummary || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const field = type === "short" ? "summaryShort" : "summaryLong";
      const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [field]: summary }),
      });

      if (!response.ok) {
        throw new Error("Failed to update summary");
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating summary:", error);
      alert("Failed to update summary. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSummary(initialSummary || "");
    setIsEditing(false);
  };

  if (!summary && !isEditing) {
    return null;
  }

  return (
    <div>
      {!isEditing ? (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8"
            >
              <Pencil className="w-3 h-3 mr-1" />
              Edit
            </Button>
          </div>
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {summary}
            </p>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold mb-3">{title}</h2>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={`Edit the ${type === "short" ? "summary" : "detailed summary"}...`}
            className={type === "long" ? "min-h-[200px] mb-3" : "min-h-[100px] mb-3"}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="gap-1"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isSaving}
              variant="outline"
              size="sm"
              className="gap-1"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
