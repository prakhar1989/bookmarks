"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface AddBookmarkFormProps {
  onSuccess?: () => void;
}

export function AddBookmarkForm({ onSuccess }: AddBookmarkFormProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url.trim(),
          description: description.trim() || undefined,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create bookmark");
      }

      // Reset form
      setUrl("");
      setDescription("");
      setTags("");

      // Refresh the page to show the new bookmark
      router.refresh();

      // Close modal if onSuccess callback is provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-8 glass shadow-xl shadow-primary/10 animate-fade-in-up stagger-2">
      <h2 className="text-2xl font-bold mb-6 tracking-tight">
        Add New Bookmark
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="url"
            className="block text-sm font-mono font-semibold text-foreground mb-2 uppercase tracking-wider"
          >
            URL *
          </label>
          <Input
            id="url"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            required
            className="transition-all duration-300 focus:scale-[1.02] focus:shadow-lg"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-mono font-semibold text-foreground mb-2 uppercase tracking-wider"
          >
            Note (optional)
          </label>
          <textarea
            id="description"
            placeholder="Add a personal note..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all duration-300 focus:scale-[1.02] focus:shadow-lg"
            rows={3}
          />
        </div>

        <div>
          <label
            htmlFor="tags"
            className="block text-sm font-mono font-semibold text-foreground mb-2 uppercase tracking-wider"
          >
            Tags (optional, comma-separated)
          </label>
          <Input
            id="tags"
            type="text"
            placeholder="javascript, tutorial, react"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            disabled={loading}
            className="font-mono transition-all duration-300 focus:scale-[1.02] focus:shadow-lg"
          />
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg animate-scale-in">
            <p className="text-sm text-destructive font-medium">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full transition-all duration-300 hover:scale-105 hover:shadow-xl font-semibold text-base py-6"
        >
          {loading ? "Analyzing..." : "Add Bookmark"}
        </Button>

        {loading && (
          <p className="text-sm text-muted-foreground text-center font-mono animate-pulse">
            Fetching content and analyzing with AI...
          </p>
        )}
      </form>
    </Card>
  );
}
