"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";

interface Tag {
  id: string;
  name: string;
}

interface TagManagerProps {
  bookmarkId: string;
  initialTags: Tag[];
}

export function TagManager({ bookmarkId, initialTags }: TagManagerProps) {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [newTagName, setNewTagName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [removingTagId, setRemovingTagId] = useState<string | null>(null);

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTagName = newTagName.trim();
    if (!trimmedTagName) return;

    setIsAdding(true);

    try {
      const response = await fetch(`/api/bookmarks/${bookmarkId}/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tagName: trimmedTagName }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409) {
          alert("This tag is already on the bookmark");
        } else {
          throw new Error(error.error || "Failed to add tag");
        }
        setIsAdding(false);
        return;
      }

      const data = await response.json();
      setTags([...tags, data.tag]);
      setNewTagName("");
      router.refresh();
    } catch (error) {
      console.error("Error adding tag:", error);
      alert("Failed to add tag. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    setRemovingTagId(tagId);

    try {
      const response = await fetch(
        `/api/bookmarks/${bookmarkId}/tags/${tagId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to remove tag");
      }

      setTags(tags.filter((tag) => tag.id !== tagId));
      router.refresh();
    } catch (error) {
      console.error("Error removing tag:", error);
      alert("Failed to remove tag. Please try again.");
    } finally {
      setRemovingTagId(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Display existing tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md"
            >
              {tag.name}
              <button
                onClick={() => handleRemoveTag(tag.id)}
                disabled={removingTagId === tag.id}
                className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors disabled:opacity-50"
                aria-label={`Remove ${tag.name} tag`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add new tag form */}
      <form onSubmit={handleAddTag} className="flex gap-2">
        <Input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="Add a tag..."
          className="flex-1"
          disabled={isAdding}
        />
        <Button
          type="submit"
          size="sm"
          disabled={isAdding || !newTagName.trim()}
        >
          <Plus className="w-4 h-4 mr-1" />
          {isAdding ? "Adding..." : "Add"}
        </Button>
      </form>
    </div>
  );
}
