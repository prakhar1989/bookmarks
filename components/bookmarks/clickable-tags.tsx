"use client";

import { useRouter } from "next/navigation";
import { Tag } from "./tag";

interface TagData {
  id: string;
  name: string;
}

interface ClickableTagsProps {
  tags: TagData[];
}

export function ClickableTags({ tags }: ClickableTagsProps) {
  const router = useRouter();

  const handleTagClick = (tagName: string) => {
    router.push(`/?tag=${encodeURIComponent(tagName)}`);
  };

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2.5 mb-4">
      {tags.map((tag) => (
        <Tag
          key={tag.id}
          name={tag.name}
          onClick={() => handleTagClick(tag.name)}
        />
      ))}
    </div>
  );
}
