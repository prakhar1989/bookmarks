"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Save, X } from "lucide-react";

interface EditNoteProps {
  bookmarkId: string;
  initialNote: string | null;
}

export function EditNote({ bookmarkId, initialNote }: EditNoteProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState(initialNote || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/bookmarks/${bookmarkId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description: note }),
      });

      if (!response.ok) {
        throw new Error("Failed to update note");
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating note:", error);
      alert("Failed to update note. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNote(initialNote || "");
    setIsEditing(false);
  };

  if (!isEditing && !note) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md border-2 border-dashed border-gray-300 dark:border-gray-600">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <Pencil className="w-4 h-4 mr-2" />
          Add a personal note
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
      {!isEditing ? (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Your Note:
            </p>
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
          <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
            {note}
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your Note:
          </p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a personal note about this bookmark..."
            className="min-h-[100px] mb-3"
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
